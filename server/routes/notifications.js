const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../db');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:saisiddharthvooka@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// Subscribe Route
router.post('/subscribe', (req, res) => {
    const subscription = req.body;
    const { email } = req.query; // Or from auth token if authenticated

    const { user_email, endpoint, keys } = req.body;

    if (!user_email || !endpoint || !keys) {
        return res.status(400).json({ message: 'Invalid subscription object' });
    }

    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO subscriptions (user_email, endpoint, keys) VALUES (?, ?, ?)');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error subscribing' });
    }
});

// Function to send notifications to ALL subscribers (or filter by email)
const sendNotificationToAll = async (payload) => {
    console.log("Sending Nofitications...", payload);
    const stmt = db.prepare('SELECT * FROM subscriptions');
    const subscriptions = stmt.all();
    console.log(`Found ${subscriptions.length} subscriptions`);

    subscriptions.forEach(sub => {
        try {
            const subscriptionConfig = JSON.parse(sub.keys);
            console.log(`Sending to ${sub.user_email}...`);

            webpush.sendNotification(subscriptionConfig, JSON.stringify(payload))
                .then(res => console.log("Sent successfully to", sub.user_email))
                .catch(err => {
                    console.error("Error sending notification to", sub.user_email, err);
                    if (err.statusCode === 410) {
                        console.log("Subscription expired, deleting...");
                        db.prepare('DELETE FROM subscriptions WHERE id = ?').run(sub.id);
                    }
                });
        } catch (e) {
            console.error("Error parsing subscription keys for", sub.id, e);
        }
    });
};

module.exports = { router, sendNotificationToAll };
