const db = require('./db');
try {
    const adminEmail = 'saisiddharthvooka@gmail.com'; // Adjust if needed
    const result = db.prepare("DELETE FROM users WHERE role = 'admin'").run();
    console.log(`Deleted ${result.changes} admin user(s).`);
} catch (e) {
    console.error(e);
}
