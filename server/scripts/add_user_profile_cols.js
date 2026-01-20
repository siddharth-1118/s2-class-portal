const db = require('../db');

try {
    console.log("Checking and adding columns to 'users' table...");

    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('mobile')) {
        console.log("Adding 'mobile' column...");
        db.prepare("ALTER TABLE users ADD COLUMN mobile TEXT").run();
    } else {
        console.log("'mobile' column already exists.");
    }

    if (!columns.includes('section')) {
        console.log("Adding 'section' column...");
        db.prepare("ALTER TABLE users ADD COLUMN section TEXT").run();
    } else {
        console.log("'section' column already exists.");
    }

    console.log("Migration complete.");
} catch (error) {
    console.error("Migration failed:", error);
}
