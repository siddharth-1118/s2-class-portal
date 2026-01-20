const express = require('express');
const router = express.Router();
const db = require('../db');

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

// GET /api/mess - Get all menu items (Public/Protected? Keeping public for now or auth if needed)
router.get('/', (req, res) => {
    try {
        const menu = db.prepare('SELECT * FROM mess_menu').all();
        res.json(menu);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching menu' });
    }
});

// PUT /api/mess/:day - Update menu for a specific day (Admin Only)
router.put('/:day', authenticateToken, (req, res) => {
    const { day } = req.params;
    const { breakfast, lunch, snacks, dinner, specials } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admins only' });
    }

    try {
        const stmt = db.prepare(`
            UPDATE mess_menu 
            SET breakfast = ?, lunch = ?, snacks = ?, dinner = ?, specials = ?
            WHERE day = ?
        `);
        const info = stmt.run(breakfast, lunch, snacks, dinner, specials, day);

        if (info.changes === 0) {
            return res.status(404).json({ message: 'Day not found' });
        }

        res.json({ message: 'Menu updated successfully', day });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating menu' });
    }
});

module.exports = router;
