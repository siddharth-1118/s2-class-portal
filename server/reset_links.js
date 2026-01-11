const db = require('./db');

try {
    const info = db.prepare('UPDATE users SET linked_reg_no = NULL').run();
    console.log(`Reset linked_reg_no for ${info.changes} users.`);
} catch (e) {
    console.error('Error resetting users:', e);
}
