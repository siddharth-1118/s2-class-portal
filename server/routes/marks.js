const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    next();
};

// GET students list (for Admin dropdown/sheet)
router.get('/students', authenticateToken, requireAdmin, (req, res) => {
    const stmt = db.prepare('SELECT * FROM students_list ORDER BY register_number ASC');
    const students = stmt.all();
    res.json(students);
});

// GET Student List (Public/Student Access for Parsing/Claiming)
router.get('/student-list', authenticateToken, (req, res) => {
    const stmt = db.prepare('SELECT register_number, name FROM students_list ORDER BY name ASC');
    res.json(stmt.all());
});

// GET marks (Admin sees all, Student sees their own matched by LINKED REG NO)
router.get('/', authenticateToken, (req, res) => {
    if (req.user.role === 'admin') {
        const stmt = db.prepare(`
            SELECT marks.*, students_list.name as student_name 
            FROM marks 
            JOIN students_list ON marks.student_reg_no = students_list.register_number 
            ORDER BY created_at DESC
        `);
        res.json(stmt.all());
    } else {
        console.log('Fetching marks for:', req.user.email);
        // Fetch User to get linked_reg_no
        const user = db.prepare('SELECT linked_reg_no FROM users WHERE email = ?').get(req.user.email);
        console.log('User found:', user);

        if (user && user.linked_reg_no) {
            console.log('Linked Reg No:', user.linked_reg_no);
            const stmt = db.prepare(`
                SELECT marks.*, students_list.name as student_name
                FROM marks
                JOIN students_list ON marks.student_reg_no = students_list.register_number
                WHERE marks.student_reg_no = ?
                ORDER BY created_at DESC
            `);
            const marks = stmt.all(user.linked_reg_no);
            console.log('Marks found:', marks);
            res.json(marks);
        } else {
            console.log('No linked reg no found');
            res.json([]);
        }
    }
});

// POST mark (Admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    let { student_reg_no, subject, score, max_marks, exam_type } = req.body;
    student_reg_no = student_reg_no.trim().toUpperCase();
    const stmt = db.prepare('INSERT INTO marks (student_reg_no, subject, score, max_marks, exam_type) VALUES (?, ?, ?, ?, ?)');
    stmt.run(student_reg_no, subject, score, max_marks, exam_type);

    // Notify Student
    try {
        console.log(`Attempting to notify student with Reg No: ${student_reg_no}`);
        const user = db.prepare('SELECT email FROM users WHERE linked_reg_no = ?').get(student_reg_no);
        console.log('Found linked user:', user);

        if (user) {
            const { sendNotificationToUser } = require('./notifications');
            sendNotificationToUser(user.email, {
                title: 'New Grade Posted',
                description: `You scored ${score}/${max_marks} in ${subject} (${exam_type || 'Exam'}).`
            });

            // Real-time update (Socket)
            if (req.io) {
                console.log(`Emitting 'new_mark' to room: ${user.email}`);
                req.io.to(user.email).emit('new_mark', {
                    student_reg_no, subject, score, max_marks, exam_type,
                    created_at: new Date().toISOString()
                });
            } else {
                console.log('Socket.io instance (req.io) not found!');
            }
        } else {
            console.log('No user found linked to this register number. Notification/Socket skipped.');
        }
    } catch (e) {
        console.error("Notification Error:", e);
    }

    res.status(201).json({ message: 'Mark added' });
});

// BULK POST marks
router.post('/bulk', authenticateToken, requireAdmin, (req, res) => {
    const { marks } = req.body; // Array of { student_reg_no, subject, score, max_marks, exam_type }

    if (!marks || !Array.isArray(marks)) return res.status(400).json({ message: 'Invalid data' });

    let count = 0;
    const stmt = db.prepare('INSERT INTO marks (student_reg_no, subject, score, max_marks, exam_type) VALUES (?, ?, ?, ?, ?)');

    const insertMany = db.transaction((items) => {
        for (const m of items) {
            const regNo = m.student_reg_no.trim().toUpperCase();
            stmt.run(regNo, m.subject, m.score, m.max_marks, m.exam_type);

            // Notify (Socket only for speed, skip push for bulk to avoid spamming 60 notifications per second)
            if (req.io) {
                // Find user email (inefficient to query 60 times, but safe for now)
                const user = db.prepare('SELECT email FROM users WHERE linked_reg_no = ?').get(regNo);
                if (user) {
                    req.io.to(user.email).emit('new_mark', {
                        student_reg_no: regNo,
                        subject: m.subject,
                        score: m.score,
                        max_marks: m.max_marks,
                        exam_type: m.exam_type,
                        created_at: new Date().toISOString()
                    });
                }
            }
            count++;
        }
    });

    try {
        insertMany(marks);
        res.json({ message: `Successfully added ${count} marks` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Bulk import failed' });
    }
});

// DELETE mark (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM marks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Mark deleted' });
});

// UPDATE mark (Admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
    const { score, max_marks, exam_type, subject } = req.body;
    db.prepare('UPDATE marks SET score = ?, max_marks = ?, exam_type = ?, subject = ? WHERE id = ?')
        .run(score, max_marks, exam_type, subject, req.params.id);
    res.json({ message: 'Mark updated' });
});

// STUDENT PROFILE MANAGEMENT

// GET Profile (Student)
router.get('/profile', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.user.email);
    if (!user.linked_reg_no) {
        return res.json({ name: user.name, register_number: null, is_locked: false });
    }
    const student = db.prepare('SELECT * FROM students_list WHERE register_number = ?').get(user.linked_reg_no);
    if (!student) return res.status(404).json({ message: 'Linked record missing' });
    res.json({ ...student, is_locked: true });
});

// UPDATE Profile (Student - One Time Link)
router.post('/profile', authenticateToken, (req, res) => {
    let { mobile, section, register_number } = req.body;
    register_number = register_number ? register_number.trim().toUpperCase() : '';

    const user = db.prepare('SELECT linked_reg_no FROM users WHERE email = ?').get(req.user.email);
    if (user.linked_reg_no) return res.status(403).json({ message: 'Locked' });

    // Validate Reg No
    const student = db.prepare('SELECT * FROM students_list WHERE register_number = ?').get(register_number);
    if (!student) return res.status(400).json({ message: 'Invalid Register Number' });

    db.prepare('UPDATE users SET linked_reg_no = ? WHERE email = ?').run(register_number, req.user.email);
    db.prepare('UPDATE students_list SET mobile = ?, section = ? WHERE register_number = ?').run(mobile, section, register_number);

    res.json({ message: 'Linked', register_number });
});

// ADMIN: Get specific student details
router.get('/student/:regNo', authenticateToken, requireAdmin, (req, res) => {
    const student = db.prepare('SELECT * FROM students_list WHERE register_number = ?').get(req.params.regNo);
    if (student) res.json(student);
    else res.status(404).json({ message: 'Not found' });
});

// ADMIN: Unlink/Reset Student Profile
router.post('/student/:regNo/unlink', authenticateToken, requireAdmin, (req, res) => {
    // 1. Find user linked to this regNo
    const info = db.prepare('UPDATE users SET linked_reg_no = NULL WHERE linked_reg_no = ?').run(req.params.regNo);

    // 2. Optional: Clear mobile/section in students_list? 
    // Let's do it to ensure fresh start
    db.prepare('UPDATE students_list SET mobile = NULL, section = NULL WHERE register_number = ?').run(req.params.regNo);

    if (info.changes > 0) {
        res.json({ message: 'Student profile unlinked/reset successfully.' });
    } else {
        res.json({ message: 'Reset student data (User was not linked).' });
    }
});

// ADMIN: Update specific student (and rename ID if needed)
router.put('/student/:regNo', authenticateToken, requireAdmin, (req, res) => {
    const { name, mobile, section, new_register_number } = req.body;
    const oldRegNo = req.params.regNo;
    const newRegNo = new_register_number ? new_register_number.trim().toUpperCase() : oldRegNo;

    try {
        db.transaction(() => {
            // 1. Create New Record if ID changing
            if (newRegNo !== oldRegNo) {
                // Check conflict
                const exists = db.prepare('SELECT 1 FROM students_list WHERE register_number = ?').get(newRegNo);
                if (exists) throw new Error(`Register Number ${newRegNo} already exists! Cannot rename.`);

                // Insert New
                db.prepare('INSERT INTO students_list (register_number, name, mobile, section) VALUES (?, ?, ?, ?)')
                    .run(newRegNo, name, mobile, section);

                // Move Marks
                db.prepare('UPDATE marks SET student_reg_no = ? WHERE student_reg_no = ?').run(newRegNo, oldRegNo);

                // Move User Link
                db.prepare('UPDATE users SET linked_reg_no = ? WHERE linked_reg_no = ?').run(newRegNo, oldRegNo);

                // Delete Old
                db.prepare('DELETE FROM students_list WHERE register_number = ?').run(oldRegNo);
            } else {
                // Just update details
                db.prepare('UPDATE students_list SET name = ?, mobile = ?, section = ? WHERE register_number = ?')
                    .run(name, mobile, section, oldRegNo);
            }
        })();
        res.json({ message: 'Updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(400).json({ message: e.message });
    }
});

module.exports = router;
