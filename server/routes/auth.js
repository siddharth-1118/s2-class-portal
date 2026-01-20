const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { OAuth2Client } = require('google-auth-library');
const { encrypt, decrypt } = require('../utils/crypto');

const ADMIN_EMAILS = ['saisiddharthvooka@gmail.com', 'kothaig2@srmist.edu.in'];
const ALLOWED_DOMAINS = ['@srmist.edu.in', '@gmail.com']; // Add your new domains here

// Helper: Trigger Background Sync
const triggerBackgroundSync = (userId, email, academiaEmail, academiaPassword) => {
    if (!academiaEmail || !academiaPassword) return;

    console.log(`[Auth] Triggering Background Sync for ${email}...`);
    const { scrapeTimetable } = require('../utils/academiaScraper');

    // Run in background
    (async () => {
        try {
            const { timetable, attendance, profile } = await scrapeTimetable(academiaEmail, academiaPassword);

            // Update Profile (Name/RegNo)
            if (profile && profile.regNo) {
                db.prepare('UPDATE users SET linked_reg_no = ?, name = COALESCE(?, name) WHERE id = ?')
                    .run(profile.regNo, profile.name || null, userId);
            }

            // Save Timetable
            if (timetable && timetable.length > 0) {
                db.prepare('DELETE FROM personal_timetables WHERE user_email = ?').run(email);
                const insert = db.prepare('INSERT INTO personal_timetables (user_email, day, period, subject, staff, type, time_range) VALUES (?, ?, ?, ?, ?, ?, ?)');
                const update = db.transaction(() => {
                    timetable.forEach(entry => insert.run(email, entry.day, entry.period, entry.content, '', 'Theory', ''));
                });
                update();
            }

            // Save Attendance
            if (attendance && attendance.length > 0) {
                db.prepare('DELETE FROM attendance WHERE user_email = ?').run(email);
                const insertAtt = db.prepare('INSERT INTO attendance (user_email, course_code, course_title, category, faculty_name, slot, hours_conducted, hours_absent, attendance_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                const updateAtt = db.transaction(() => {
                    attendance.forEach(att => insertAtt.run(email, att.course_code, att.course_title, att.category, att.faculty_name, att.slot, att.hours_conducted, att.hours_absent, att.attendance_percentage));
                });
                updateAtt();
            }
            console.log(`[Auth] Background Sync Success for ${email}`);

        } catch (err) {
            console.error(`[Auth] Background Sync Failed for ${email}:`, err.message);
        }
    })();
};

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    // Fallback: Use main creds as Academia creds
    const academiaEmail = req.body.academiaEmail || email;
    const academiaPassword = req.body.academiaPassword || password;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    let role = 'student';
    if (ADMIN_EMAILS.includes(email)) {
        role = 'admin';
    } else {
        const isAllowed = ALLOWED_DOMAINS.some(domain => email.endsWith(domain));
        if (!isAllowed) {
            return res.status(403).json({ message: `Only emails from the following domains are allowed: ${ALLOWED_DOMAINS.join(', ')}` });
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Encrypt Academia Password
    let encPass = null;
    let iv = null;
    const isSrmEmail = email.endsWith('@srmist.edu.in');

    if (isSrmEmail && academiaPassword) {
        const { encrypt } = require('../utils/crypto');
        const encrypted = encrypt(academiaPassword);
        encPass = encrypted.content;
        iv = encrypted.iv;
    }

    try {
        const stmt = db.prepare('INSERT INTO users (email, password, name, role, is_approved, linked_reg_no, academia_enc_pass, academia_iv) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const isApproved = 1; // Auto-approve everyone

        // Use academiaEmail as initial linked_reg_no (NetID) if provided
        const linkedId = isSrmEmail ? academiaEmail : null;

        const info = stmt.run(email, hashedPassword, name, role, isApproved, linkedId, encPass, iv);
        const userId = info.lastInsertRowid;

        res.status(201).json({ message: 'User created successfully', userId });

        // TRIGGER BACKGROUND SYNC
        if (isSrmEmail) {
            triggerBackgroundSync(userId, email, academiaEmail, academiaPassword);
        }

    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // Fallback
    const academiaEmail = req.body.academiaEmail || email;
    const academiaPassword = req.body.academiaPassword || password;

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    let user = stmt.get(email);

    // CASE 1: User does NOT exist in DB yet.
    if (!user) {
        // Only allow auto-creation for SRM emails
        if (!email.endsWith('@srmist.edu.in')) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        try {
            console.log(`[Auth] User ${email} not found locally. Attempting Auto-Register via Academia Verification...`);

            // Verify with Academia directly
            const { verifyCredentials } = require('../utils/academiaScraper');
            await verifyCredentials(academiaEmail, academiaPassword);

            console.log(`[Auth] Academia verified. Creating new user for: ${email}`);

            // If we are here, credentials are valid on Academia.
            // Create the user locally.
            const hashedPassword = await bcrypt.hash(password, 10);

            // Determine Role
            let role = 'student';
            if (ADMIN_EMAILS.includes(email)) role = 'admin';

            // Encrypt Academia Creds
            const { encrypt } = require('../utils/crypto');
            const encrypted = encrypt(academiaPassword);

            // Insert New User
            const insert = db.prepare('INSERT INTO users (email, password, name, role, is_approved, linked_reg_no, academia_enc_pass, academia_iv) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            // Name defaults to Email prefix for now, will be updated by sync
            let name = email.split('@')[0];
            const isApproved = 1;

            const info = insert.run(email, hashedPassword, name, role, isApproved, academiaEmail, encrypted.content, encrypted.iv);
            const userId = info.lastInsertRowid;

            // Fetch the newly created user
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

            // Trigger Background Sync immediately to get real Name, Timetable etc.
            triggerBackgroundSync(user.id, user.email, academiaEmail, academiaPassword);

        } catch (e) {
            console.error(`[Auth] Auto-Register Failed: ${e.message}`);
            // If verifyCredentials throws, it means invalid academia login
            return res.status(400).json({ message: 'Invalid Academia Login. Please check your NetID/Password.' });
        }
    }

    // CASE 2: User EXISTS. Verify Password.
    else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Smart Rescue: Check against Academia (Password might have changed there)
            if (email.endsWith('@srmist.edu.in')) {
                try {
                    console.log(`[Auth] Password mismatch for ${email}. Verifying with Academia...`);

                    const { verifyCredentials } = require('../utils/academiaScraper');
                    await verifyCredentials(academiaEmail, academiaPassword);

                    console.log(`[Auth] Academia verification success for ${email}. Updating local credentials.`);

                    // Update Local DB with new Password (hashed) and Academia Creds (Encrypted)
                    const newHashed = await bcrypt.hash(password, 10);
                    const { encrypt } = require('../utils/crypto');
                    const encrypted = encrypt(academiaPassword);

                    db.prepare('UPDATE users SET password = ?, academia_enc_pass = ?, academia_iv = ?, linked_reg_no = ? WHERE id = ?')
                        .run(newHashed, encrypted.content, encrypted.iv, academiaEmail, user.id);

                    // Trigger Full Sync in Background
                    triggerBackgroundSync(user.id, user.email, academiaEmail, academiaPassword);

                } catch (e) {
                    console.error(`[Auth] Academia verification failed: ${e.message}`);
                    return res.status(400).json({ message: 'Invalid credentials (and Academia login failed)' });
                }
            } else {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
        }

        // AUTO-UPDATE ACADEMIA CREDS ON LOGIN (If check passed naturally)
        if (isMatch && email.endsWith('@srmist.edu.in')) {
            try {
                const { encrypt } = require('../utils/crypto');
                const encrypted = encrypt(academiaPassword);
                db.prepare('UPDATE users SET academia_enc_pass = ?, academia_iv = ?, linked_reg_no = COALESCE(linked_reg_no, ?) WHERE id = ?')
                    .run(encrypted.content, encrypted.iv, academiaEmail, user.id);
                triggerBackgroundSync(user.id, user.email, academiaEmail, academiaPassword);
            } catch (e) { console.error("Login Sync Update Failed:", e); }
        }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, is_approved: user.is_approved }, process.env.JWT_SECRET, { expiresIn: '24h' });

    console.log(`[Auth] Login Successful for ${email}. Role: ${user.role}, Name: ${user.name}`);

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, is_approved: user.is_approved } });
});

// GOOGLE AUTH
router.post('/google', async (req, res) => {
    const { token } = req.body;
    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({ message: 'Invalid Google Token' });
        }

        const email = payload.email;
        const name = payload.name || email.split('@')[0];

        let role = 'student';
        if (ADMIN_EMAILS.includes(email)) {
            role = 'admin';
        } else {
            const isAllowed = ALLOWED_DOMAINS.some(domain => email.endsWith(domain));
            if (!isAllowed) {
                return res.status(403).json({ message: `Only emails from the following domains are allowed: ${ALLOWED_DOMAINS.join(', ')}` });
            }
        }

        let stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        let user = stmt.get(email);

        if (!user) {
            const insert = db.prepare('INSERT INTO users (email, password, name, role, is_approved) VALUES (?, ?, ?, ?, ?)');
            const randomPass = Math.random().toString(36).slice(-8);
            const hashed = await bcrypt.hash(randomPass, 10);
            const isApproved = role === 'admin' ? 1 : 0;
            insert.run(email, hashed, name, role, isApproved);
            user = stmt.get(email);
        }

        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, is_approved: user.is_approved }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token: jwtToken, user: { id: user.id, email: user.email, role: user.role, name: user.name, is_approved: user.is_approved } });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Google Auth Error' });
    }
});

// Profile Update (Student - One Time Lock)
router.post('/profile', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const { mobile, section } = req.body;

        // check if already set
        const currentUser = db.prepare('SELECT mobile, section FROM users WHERE email = ?').get(user.email);

        // If already has details, prevent update (unless admin logic, but this route is for students)
        if (currentUser.mobile && currentUser.section) {
            return res.status(403).json({ message: 'Profile is locked. Contact Admin to edit.' });
        }

        db.prepare('UPDATE users SET mobile = ?, section = ? WHERE email = ?').run(mobile, section, user.email);

        // Return updated user
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
        res.json(updatedUser);
    });
});

// Admin Update (Force)
router.put('/admin/user/:email', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, requester) => {
        if (err || requester.role !== 'admin') return res.sendStatus(403);

        const { name, mobile, section } = req.body;
        const targetEmail = req.params.email;

        db.prepare('UPDATE users SET name = ?, mobile = ?, section = ? WHERE email = ?').run(name, mobile, section, targetEmail);
        res.json({ message: 'User updated' });
    });
});

// Admin Get User by Name (Matches student list name)
router.get('/admin/search', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, requester) => {
        if (err || requester.role !== 'admin') return res.sendStatus(403);

        const { name } = req.query;
        // Case insensitive search
        const user = db.prepare('SELECT * FROM users WHERE UPPER(name) = UPPER(?)').get(name);

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found (Student has not logged in yet)' });
        }
    });
});

// Forgot Password - Generate Link
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate Token
    const token = require('crypto').randomBytes(32).toString('hex');

    // Save to DB (Cleanup old first)
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
    db.prepare('INSERT INTO password_resets (email, token) VALUES (?, ?)').run(email, token);

    // Log Link (Simulation for Dev)
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    console.log("==========================================");
    console.log("PASSWORD RESET LINK GENERATED:");
    console.log(link);
    console.log("==========================================");

    res.json({ message: 'Reset link sent (check server console)' });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Invalid data' });

    const record = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
    if (!record) return res.status(400).json({ message: 'Invalid or expired token' });

    // Check expiry (1 hour)
    const created = new Date(record.created_at);
    const now = new Date();
    const diffMs = now - created;
    if (diffMs > 3600000) { // 1 hr
        db.prepare('DELETE FROM password_resets WHERE email = ?').run(record.email);
        return res.status(400).json({ message: 'Token expired' });
    }

    // Update Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, record.email);

    // Delete Token
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(record.email);

    res.json({ message: 'Password updated successfully' });
});

// ADMIN: Get All Users
router.get('/users', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, requester) => {
        if (err || requester.role !== 'admin') return res.sendStatus(403);
        const users = db.prepare('SELECT id, email, name, role, is_approved, linked_reg_no FROM users ORDER BY id DESC').all();
        res.json(users);
    });
});

// ADMIN: Toggle Approval
router.post('/approve/:id', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, requester) => {
        if (err || requester.role !== 'admin') return res.sendStatus(403);

        const { is_approved } = req.body; // 1 or 0
        db.prepare('UPDATE users SET is_approved = ? WHERE id = ?').run(is_approved, req.params.id);
        res.json({ message: `User ${is_approved ? 'Approved' : 'Disapproved'}` });
    });
});

module.exports = router;
