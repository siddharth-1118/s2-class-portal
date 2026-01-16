try {
    console.log("Loading db.js...");
    const db = require('./db');
    console.log("DB Loaded successfully.");
    const users = db.prepare('SELECT count(*) as c FROM users').get();
    console.log("User count:", users.c);
} catch (e) {
    console.error("CRITICAL DB ERROR:", e);
}
