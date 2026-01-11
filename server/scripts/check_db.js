const db = require('../db');

try {
    const row = db.prepare('SELECT COUNT(*) as count FROM students_list').get();
    console.log(`Current student count: ${row.count}`);

    // Print first 5
    const rows = db.prepare('SELECT * FROM students_list LIMIT 5').all();
    console.log('Sample data:', rows);
} catch (error) {
    console.error('Error querying database:', error);
}
