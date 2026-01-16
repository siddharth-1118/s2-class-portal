const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { scrapeTimetable, scrapeMarks, scrapeAcademicPlanner, scrapeAttendance } = require('../utils/academiaScraper');
// crypto imported above

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Log auth attempt
    try { fs.appendFileSync('api_debug.log', `[Auth] Token check: ${token ? 'Present' : 'Missing'}\n`); } catch (e) { }

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            try { fs.appendFileSync('api_debug.log', `[Auth] Verify failed: ${err.message}\n`); } catch (e) { }
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// Helper: Run Sync logic
async function performSync(userEmail, username, password) {
    console.log(`[Academia] Starting Sync for ${userEmail}`);
    // 1. Scrape Timetable (Attendance removed from here)
    const { timetable, profile, batch1Grid, batch2Grid } = await scrapeTimetable(username, password);

    // 2. Scrape Attendance & Marks (Unified Page)
    let attendance = [];
    let marksFromUnified = [];
    try {
        const unifiedData = await scrapeAttendance(username, password);
        attendance = unifiedData.attendance || [];
        marksFromUnified = unifiedData.marks || [];
        console.log(`[Academia] Scraped ${attendance.length} attendance and ${marksFromUnified.length} marks entries from Unified Page.`);
    } catch (e) {
        console.error(`[Academia] Attendance scrape failed: ${e.message}`);
    }

    // 3. Scrape Marks (Using existing logic, user might want this to use the same link? 
    // The user said "for marks and attendance connect with this link".
    // I will try to use the attendance page for marks if possible? 
    // Looking at `scrapeAttendance` I just wrote, it gets attendance columns. 
    // IF the user implies marks are ALSO on that page, I might need to check if there are columns for marks?
    // Usually "My Attendance" is just attendance. "My Grade" (which scrapeMarks looks for) is marks.
    // I'll stick to `scrapeMarks` looking for "Internal Marks" link for now unless it fails.
    // 3. Scrape Marks (Legacy/Fallback)
    // If we already got marks from the Unified Page (My_Attendance), use those.
    let marks = marksFromUnified;
    if (marks.length === 0) {
        try {
            console.log(`[Academia] No marks found on Attendance page. Trying Legacy Marks page...`);
            marks = await scrapeMarks(username, password);
            console.log(`[Academia] Scraped ${marks.length} marks entries from Legacy Page.`);
        } catch (e) {
            console.error(`[Academia] Marks scrape failed: ${e.message}`);
        }
    }

    // 3. Scrape Academic Planner
    let calendarEvents = [];
    try {
        calendarEvents = await scrapeAcademicPlanner(username, password);
        console.log(`[Academia] Scraped ${calendarEvents.length} calendar events.`);
    } catch (e) {
        console.error(`[Academia] Calendar scrape failed: ${e.message}`);
    }

    // Update Profile
    if (profile && profile.regNo) {
        db.prepare('UPDATE users SET linked_reg_no = ?, name = COALESCE(?, name) WHERE email = ?')
            .run(profile.regNo, profile.name || null, userEmail);
    }

    // Save Personal Timetable
    if (timetable && timetable.length > 0) {
        db.prepare('DELETE FROM personal_timetables WHERE user_email = ?').run(userEmail);
        const insert = db.prepare('INSERT INTO personal_timetables (user_email, day, period, subject, staff, type, time_range) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const update = db.transaction(() => {
            timetable.forEach(entry => insert.run(userEmail, entry.day, entry.period, entry.content, '', 'Theory', ''));
        });
        update();
    }

    // Save MASTER Timetables (Batch 1 & 2)
    // This allows the "Batch 1" / "Batch 2" tabs to be LIVE.
    const saveMasterBatch = (batchId, grid) => {
        if (!grid || grid.length === 0) return;
        console.log(`[Academia] Updating Master Schedule for ${batchId} (${grid.length} entries)`);

        db.prepare('DELETE FROM timetable_entries WHERE batch = ?').run(batchId);
        const insertMaster = db.prepare('INSERT INTO timetable_entries (batch, day, period, subject, staff, type, room, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

        const updateMaster = db.transaction(() => {
            grid.forEach(entry => {
                insertMaster.run(
                    batchId,
                    entry.day,
                    entry.period,
                    entry.subject || entry.content || 'Free Slot', // content provided by scraper
                    entry.teacher || '',
                    entry.type || 'Theory',
                    entry.room || '',
                    entry.code || ''
                );
            });
        });
        updateMaster();
    };

    if (batch1Grid && batch1Grid.length > 0) saveMasterBatch('GROUP_1', batch1Grid);
    if (batch2Grid && batch2Grid.length > 0) saveMasterBatch('GROUP_2', batch2Grid);

    // Save Attendance
    if (attendance && attendance.length > 0) {
        db.prepare('DELETE FROM attendance WHERE user_email = ?').run(userEmail);
        const insertAtt = db.prepare('INSERT INTO attendance (user_email, course_code, course_title, category, faculty_name, slot, hours_conducted, hours_absent, attendance_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const updateAtt = db.transaction(() => {
            attendance.forEach(att => insertAtt.run(userEmail, att.course_code, att.course_title, att.category, att.faculty_name, att.slot, att.hours_conducted, att.hours_absent, att.attendance_percentage));
        });
        updateAtt();
    }

    // Save Marks
    let regNo = profile?.regNo;
    if (!regNo) {
        const u = db.prepare('SELECT linked_reg_no FROM users WHERE email = ?').get(userEmail);
        regNo = u?.linked_reg_no;
    }

    if (marks && marks.length > 0 && regNo) {
        db.prepare('DELETE FROM marks WHERE student_reg_no = ?').run(regNo);
        const insertMark = db.prepare('INSERT INTO marks (student_reg_no, subject, score, max_marks, exam_type) VALUES (?, ?, ?, ?, ?)');
        const updateMarks = db.transaction(() => {
            marks.forEach(m => insertMark.run(regNo, m.subject, m.score, m.max_marks, m.exam_type));
        });
        updateMarks();
    }

    // Save Calendar
    if (calendarEvents && calendarEvents.length > 0) {
        if (calendarEvents.length > 5) {
            db.prepare('DELETE FROM academic_calendar').run();
            const insertCal = db.prepare('INSERT INTO academic_calendar (date, day, description, type, day_order) VALUES (?, ?, ?, ?, ?)');
            const updateCal = db.transaction(() => {
                calendarEvents.forEach(e => insertCal.run(e.date, e.day, e.description, e.type, e.day_order));
            });
            updateCal();
        }
    }

    return { timetable, attendance, marks, calendarEvents }; // Updated return
}

router.post('/sync', authenticateToken, async (req, res) => {
    const { username, password } = req.body;
    const userEmail = req.user.email;

    fs.appendFileSync('api_debug.log', `[${new Date().toISOString()}] Sync Request: ${userEmail} / ${username}\n`);

    if (!username || !password) return res.status(400).json({ message: "Credentials required" });

    try {
        fs.appendFileSync('api_debug.log', `[${new Date().toISOString()}] Calling performSync...\n`);
        // 1. Perform Sync
        const { timetable, attendance, marks } = await performSync(userEmail, username, password);
        fs.appendFileSync('api_debug.log', `[${new Date().toISOString()}] performSync success\n`);

        // 2. Encrypt & Store Credentials
        const encrypted = encrypt(password);
        // Store username (linked_reg_no handles this usually, but let's assume username is regNo)
        // Storing password securely
        db.prepare('UPDATE users SET academia_enc_pass = ?, academia_iv = ? WHERE email = ?')
            .run(encrypted.content, encrypted.iv, userEmail);

        res.json({
            success: true,
            message: "Sync successful",
            timetableCount: timetable?.length || 0,
            marksCount: marks?.length || 0
        });
    } catch (error) {
        console.error(error);
        fs.appendFileSync('api_debug.log', `[${new Date().toISOString()}] Sync Error: ${error.message}\n${error.stack}\n`);

        if (error.message.includes('Login failed') || error.message.includes('credentials')) {
            return res.status(401).json({ message: "Invalid Credentials or Captcha Required. Please check your NetID/Password." });
        }
        res.status(500).json({ message: "Sync failed. Server Error." });
    }
});

// Auto-Sync Route (Background)
router.post('/auto-sync', authenticateToken, async (req, res) => {
    const userEmail = req.user.email;

    try {
        const user = db.prepare('SELECT linked_reg_no, academia_enc_pass, academia_iv FROM users WHERE email = ?').get(userEmail);

        if (!user || !user.academia_enc_pass || !user.linked_reg_no) {
            return res.status(400).json({ message: "No saved credentials found. Please sync manually once." });
        }

        const password = decrypt({ content: user.academia_enc_pass, iv: user.academia_iv });
        await performSync(userEmail, user.linked_reg_no, password);

        res.json({ success: true, message: "Background sync complete" });
    } catch (error) {
        console.error("Auto-Sync Error:", error);
        res.status(500).json({ message: "Background sync failed" });
    }
});

router.get('/attendance', authenticateToken, (req, res) => {
    try {
        const data = db.prepare('SELECT * FROM attendance WHERE user_email = ?').all(req.user.email);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
