const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { SUBJECT_MAP, BATCH_1_SCHEDULE, BATCH_2_SCHEDULE, TIME_SLOTS } = require('../utils/timetableData');

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
        // 1. Get User Registration Number
        const user = db.prepare('SELECT linked_reg_no FROM users WHERE email = ?').get(req.user.email);
        const regNo = user?.linked_reg_no;

        let isBatch1 = false;
        let batchName = "Batch 2 (General)";

        // 2. Determine Batch Logic
        if (regNo) {
            const lastThree = parseInt(regNo.slice(-3), 10);
            if (!isNaN(lastThree)) {
                // "from 869 to 906 is batch-1"
                if (lastThree >= 869 && lastThree <= 906) {
                    isBatch1 = true;
                    batchName = "Batch 1 (869-906)";
                }
                // "till 940 and 603 is batch 2" -> Default/Else case
            }
        }

        const scheduleData = isBatch1 ? BATCH_1_SCHEDULE : BATCH_2_SCHEDULE;
        const fullTimetable = [];

        // 3. Construct Response
        Object.keys(scheduleData).forEach(day => {
            const periods = scheduleData[day];
            periods.forEach((slotCode, index) => {
                if (slotCode === 'LUNCH') return; // Skip lunch for clean JSON or handle on frontend

                const subjectInfo = SUBJECT_MAP[slotCode] || { name: slotCode, code: '', staff: '' };

                fullTimetable.push({
                    day: `Day ${day}`,
                    period: `${index + 1}`,
                    time_range: TIME_SLOTS[index] || '00:00 - 00:00',
                    subject: subjectInfo.name,
                    teacher: subjectInfo.staff,
                    type: subjectInfo.type || 'Theory'
                });
            });
        });

        // Add metadata for frontend to show which batch is active
        res.json({
            meta: { batch: batchName, regNo: regNo || 'Not Linked' },
            schedule: fullTimetable
        });

    } catch (error) {
        console.error("Timetable Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
