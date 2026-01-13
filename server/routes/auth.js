const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { OAuth2Client } = require('google-auth-library');

const ADMIN_EMAILS = ['saisiddharthvooka@gmail.com', 'kothaig2@srmist.edu.in'];
const ALLOWED_DOMAINS = ['@srmist.edu.in', '@gmail.com']; // Add your new domains here

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

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

    try {
        const stmt = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)');
        const info = stmt.run(email, hashedPassword, name, role);
        res.status(201).json({ message: 'User created successfully', userId: info.lastInsertRowid });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
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
        const insert = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)');
        const randomPass = Math.random().toString(36).slice(-8);
        const hashed = await bcrypt.hash(randomPass, 10);
        insert.run(email, hashed, name, role);
        user = stmt.get(email);
    }

        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, role: user.role, name: user.name } });

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

module.exports = router;
