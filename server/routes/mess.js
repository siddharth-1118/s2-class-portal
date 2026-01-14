const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/mess - Get all menu items
router.get('/', (req, res) => {
    try {
        const menu = db.prepare('SELECT * FROM mess_menu').all();
        // Return array of menu items
        res.json(menu);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching menu' });
    }
});

// PUT /api/mess/:day - Update menu for a specific day
router.put('/:day', (req, res) => {
    const { day } = req.params;
    const { breakfast, lunch, snacks, dinner, specials } = req.body;

    // TODO: Add Admin validation middleware here if needed (e.g. check req.user.role)
    // For now assuming the frontend protects this route or we add middleware later

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
