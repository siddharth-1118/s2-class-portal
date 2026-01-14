const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendNotificationToAll, sendNotificationToUser } = require('./notifications');

// Middleware
const authenticateToken = (req, res, next) => {
    const jwt = require('jsonwebtoken');
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

// GET Notices
router.get('/', authenticateToken, (req, res) => {
    const userRole = req.user.role;
    // Admins see all. Students see 'all' and notices targeting their RegNo.

    if (userRole === 'admin') {
        const stmt = db.prepare('SELECT * FROM notices ORDER BY created_at DESC LIMIT 50');
        return res.json(stmt.all());
    }

    // For students
    const user = db.prepare('SELECT linked_reg_no FROM users WHERE id = ?').get(req.user.id);
    const regNo = user ? user.linked_reg_no : null;

    const stmt = db.prepare(`
        SELECT * FROM notices 
        WHERE target = 'all' 
           OR target = ? 
        ORDER BY created_at DESC LIMIT 50
    `);
    res.json(stmt.all(regNo));
});

// POST Notice (Admin Only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    // target can be 'all' or a register number
    const { message, category, target } = req.body;

    if (!message) return res.status(400).json({ message: 'Message content is required' });

    try {
        const stmt = db.prepare('INSERT INTO notices (message, category, target, created_by) VALUES (?, ?, ?, ?)');
        stmt.run(message, category || 'general', target || 'all', req.user.name);

        // TRIGGER NOTIFICATION
        const payload = {
            title: category === 'urgent' ? '🚨 Important Notice' : '📢 New Notice',
            description: message
        };

        if (target === 'all' || !target) {
            sendNotificationToAll(payload);
        } else {
            // Target is a Register Number. Find the user email linked to it.
            const userStmt = db.prepare('SELECT email FROM users WHERE linked_reg_no = ?');
            const targetUser = userStmt.get(target);

            if (targetUser && targetUser.email) {
                sendNotificationToUser(targetUser.email, payload);
            } else {
                console.log(`Notice pending for ${target}. User not yet registered/linked.`);
            }
        }

        res.json({ message: 'Notice sent.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to send notice' });
    }
});

// DELETE Notice
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
    res.json({ message: 'Notice deleted' });
});

module.exports = router;
