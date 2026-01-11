const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to verify Token
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
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};

// GET all homework (Students & Admins)
router.get('/', authenticateToken, (req, res) => {
    const stmt = db.prepare('SELECT * FROM homework ORDER BY created_at DESC');
    const homeworks = stmt.all();
    res.json(homeworks);
});

// CREATE homework (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
    }

    const stmt = db.prepare('INSERT INTO homework (title, description, created_by) VALUES (?, ?, ?)');

    try {
        stmt.run(title, description, req.user.email);

        // Notify users
        try {
            const { sendNotificationToAll } = require('../routes/notifications');
            await sendNotificationToAll({
                title: 'New Homework: ' + title,
                description: description.substring(0, 50) + (description.length > 50 ? '...' : '')
            });
        } catch (notifErr) {
            console.error("Notification Error:", notifErr);
        }

        // Trigger socket event
        req.io.emit('new_homework', { title, description, created_by: req.user.email, created_at: new Date() });

        res.status(201).json({ message: 'Homework created' });
    } catch (err) {
        console.error("Homework Creation Error:", err);
        res.status(500).json({ message: 'Failed to create homework' });
    }
});

// DELETE homework (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM homework WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
        return res.status(404).json({ message: 'Homework not found' });
    }

    req.io.emit('delete_homework', id); // Notify clients to remove it locally
    res.json({ message: 'Homework deleted' });
});

module.exports = router;
