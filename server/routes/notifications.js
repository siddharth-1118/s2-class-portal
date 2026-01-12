const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../db');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    console.log("VAPID Keys found. WebPush authorized.");
    webpush.setVapidDetails(
        'mailto:saisiddharthvooka@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("WARNING: VAPID Keys missing! Notifications will not work.");
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
        stmt.run(user_email, endpoint, JSON.stringify(keys));
        res.status(201).json({ message: 'Subscribed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error subscribing' });
    }
});

// Helper to send to a specific subscription
const sendToSubscription = (sub, payload) => {
    try {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: JSON.parse(sub.keys)
        };
        console.log(`Sending to ${sub.user_email}...`);

        webpush.sendNotification(pushSubscription, JSON.stringify(payload), { TTL: 86400 })
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
};

// Function to send notifications to ALL subscribers
const sendNotificationToAll = async (payload) => {
    console.log("Sending Notifications to ALL...", payload);
    const stmt = db.prepare('SELECT * FROM subscriptions');
    const subscriptions = stmt.all();
    console.log(`Found ${subscriptions.length} subscriptions`);

    subscriptions.forEach(sub => sendToSubscription(sub, payload));
};

// Function to send notification to a SPECIFIC user by Email
const sendNotificationToUser = async (email, payload) => {
    console.log(`Sending Notification to ${email}...`, payload);
    const stmt = db.prepare('SELECT * FROM subscriptions WHERE user_email = ?');
    const subscriptions = stmt.all(email);

    if (subscriptions.length === 0) {
        console.log(`No subscription found for user ${email}`);
        return;
    }

    subscriptions.forEach(sub => sendToSubscription(sub, payload));
};

module.exports = { router, sendNotificationToAll, sendNotificationToUser };
