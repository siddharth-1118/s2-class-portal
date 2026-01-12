const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to check if user is Admin
const isAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
        req.user = user;
        next();
    });
};

// GET All Events (Public/Student)
router.get('/', (req, res) => {
    try {
        const events = db.prepare('SELECT * FROM academic_calendar ORDER BY date ASC').all();
        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST Add Event (Admin Only)
router.post('/', isAdmin, (req, res) => {
    const { date, day, description, type } = req.body;
    if (!date || !description) {
        return res.status(400).json({ message: 'Date and Description are required' });
    }

    try {
        const stmt = db.prepare('INSERT INTO academic_calendar (date, day, description, type) VALUES (?, ?, ?, ?)');
        const info = stmt.run(date, day || '', description, type || 'regular');
        res.status(201).json({ id: info.lastInsertRowid, message: 'Event added' });
    } catch (error) {
        console.error('Error adding event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE Event (Admin Only)
router.delete('/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM academic_calendar WHERE id = ?').run(id);
        res.json({ message: 'Event deleted' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT Edit Event (Admin Only)
router.put('/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { date, day, description, type } = req.body;

    try {
        db.prepare('UPDATE academic_calendar SET date = ?, day = ?, description = ?, type = ? WHERE id = ?')
            .run(date, day, description, type, id);
        res.json({ message: 'Event updated' });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
