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

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    next();
};

// GET Timetable (Public/Auth)
router.get('/', authenticateToken, (req, res) => {
    const stmt = db.prepare('SELECT * FROM timetable ORDER BY day, period');
    const schedule = stmt.all();
    res.json(schedule);
});

// POST Timetable Entry (Admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    const { day, period, time_range, subject, teacher } = req.body;

    // Check if entry exists for this day/period, if so update it, else insert
    // Actually simplicity: just insert. UI will handle display.
    // Better: UPSERT logic or DELETE then INSERT to avoid duplicates for same slot?
    // Let's do simple Delete old for that slot then Insert new.

    try {
        db.prepare('DELETE FROM timetable WHERE day = ? AND period = ?').run(day, period);
        const stmt = db.prepare('INSERT INTO timetable (day, period, time_range, subject, teacher) VALUES (?, ?, ?, ?, ?)');
        stmt.run(day, period, time_range, subject, teacher);

        // Real-time update
        if (req.io) {
            req.io.emit('new_timetable', { day, period, time_range, subject, teacher });
        }

        res.json({ message: 'Timetable updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating timetable' });
    }
});

// DELETE Entry
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;
