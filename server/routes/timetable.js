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
        let batchToFetch = 'BATCH_2'; // Default
        let metaBatchName = "Batch 2 (General)";
        const userEmail = req.user.email;

        // Check if Admin wants to view a specific batch
        if (req.user.role === 'admin' && req.query.batch) {
            batchToFetch = req.query.batch;
            metaBatchName = batchToFetch === 'BATCH_1' ? "Batch 1" : "Batch 2";
        } else {
            // Determine Student Batch
            const user = db.prepare('SELECT linked_reg_no, role FROM users WHERE email = ?').get(userEmail);
            const regNo = user?.linked_reg_no;

            if (regNo) {
                const lastThree = parseInt(regNo.slice(-3), 10);
                if (!isNaN(lastThree) && lastThree >= 869 && lastThree <= 906) {
                    batchToFetch = 'BATCH_1';
                    metaBatchName = "Batch 1 (869-906)";
                }
            }
        }

        const stmt = db.prepare('SELECT * FROM timetable_entries WHERE batch = ? ORDER BY day, period');
        const rows = stmt.all(batchToFetch);

        res.json({
            meta: { batch: metaBatchName, isBatch1: batchToFetch === 'BATCH_1' },
            schedule: rows
        });

    } catch (error) {
        console.error("Timetable Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE Timetable Entry (Admin Only)
router.put('/', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { id, subject, staff, type } = req.body;
    try {
        const stmt = db.prepare('UPDATE timetable_entries SET subject = ?, staff = ?, type = ? WHERE id = ?');
        const info = stmt.run(subject, staff, type, id);

        if (info.changes > 0) {
            // Notify clients via Socket (optional, logic in server.js but we can emit if we had access to io)
            res.json({ message: 'Updated successfully' });
        } else {
            res.status(404).json({ message: 'Entry not found' });
        }
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: 'Update failed' });
    }
});

module.exports = router;
