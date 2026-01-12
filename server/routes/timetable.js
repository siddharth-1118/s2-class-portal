const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

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

// GET Dynamic Timetable
router.get('/', authenticateToken, (req, res) => {
    try {
        let assignedGroup = 'COMMON'; // Fallback
        let metaBatchName = "Class Schedule";
        const userEmail = req.user.email;

        // Determine Student Group based on Register Number
        if (req.query.batch) {
            // Manual Override (from frontend switcher)
            const requested = req.query.batch;
            if (requested === 'GROUP_1') {
                assignedGroup = 'GROUP_1';
                metaBatchName = "Group 1 (869-906)";
            } else if (requested === 'GROUP_2') {
                assignedGroup = 'GROUP_2';
                metaBatchName = "Group 2 (907-940 & 603)";
            }
        }
        else if (req.user.role === 'student') {
            const user = db.prepare('SELECT linked_reg_no FROM users WHERE email = ?').get(userEmail);
            const regNo = user?.linked_reg_no;

            if (regNo) {
                // Extract last 3 digits
                // Logic: 
                // Group 1: 869 - 906
                // Group 2: 907 - 940 OR 603

                // Handle 603 explicitly or extract digits safely
                const lastThree = parseInt(regNo.slice(-3), 10);

                if (!isNaN(lastThree)) {
                    if (lastThree >= 869 && lastThree <= 906) {
                        assignedGroup = 'GROUP_1';
                        metaBatchName = "Group 1 (869-906)";
                    } else if ((lastThree >= 907 && lastThree <= 940) || lastThree === 603) {
                        assignedGroup = 'GROUP_2';
                        metaBatchName = "Group 2 (907-940 & 603)";
                    }
                }
            }
        } else if (req.user.role === 'admin') {
            // Admin sees the Common/Master view by default, or could query ?group=...
            metaBatchName = "Master View (Admin)";
        }

        // For now, mapping detected groups to the seed keys
        const batchToQuery = assignedGroup === 'GROUP_1' ? 'GROUP_1' : 'GROUP_2';

        const schedule = db.prepare(`
            SELECT * FROM timetable_entries 
            WHERE batch = ? 
            ORDER BY day, period
        `).all(batchToQuery);

        res.json({
            meta: {
                batch: metaBatchName,
                isGroup1: assignedGroup === 'GROUP_1',
                // Legacy support for frontend switchers if needed
                activeBatch: batchToQuery
            },
            schedule: schedule,
            detectedGroup: assignedGroup
        });

    } catch (error) {
        console.error("Timetable Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPSERT Timetable Entry (Admin Only)
router.put('/', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { id, subject, staff, type, batch, day, period } = req.body;

    try {
        if (id) {
            // Update existing
            const stmt = db.prepare('UPDATE timetable_entries SET subject = ?, staff = ?, type = ? WHERE id = ?');
            stmt.run(subject, staff, type, id);
        } else {
            // Insert new (Upsert logic if needed, but simple Insert for now)
            if (!batch || !day || !period) return res.status(400).json({ message: "Missing fields for new entry" });

            // Check if exists first to avoid duplicates (optional but good)
            const existing = db.prepare('SELECT id FROM timetable_entries WHERE batch = ? AND day = ? AND period = ?').get(batch, day, period);

            if (existing) {
                const stmt = db.prepare('UPDATE timetable_entries SET subject = ?, staff = ?, type = ? WHERE id = ?');
                stmt.run(subject, staff, type, existing.id);
            } else {
                const stmt = db.prepare('INSERT INTO timetable_entries (batch, day, period, subject, staff, type) VALUES (?, ?, ?, ?, ?, ?)');
                stmt.run(batch, day, period, subject, staff, type);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Timetable Update Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE Timetable Entry (Admin Only)
router.delete('/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const stmt = db.prepare('DELETE FROM timetable_entries WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
