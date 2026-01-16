const db = require('./db');
const regNo = 'RA2311003010196';

console.log(`Fixing missing student: ${regNo}`);
const exists = db.prepare('SELECT * FROM students_list WHERE register_number = ?').get(regNo);

if (!exists) {
    db.prepare('INSERT INTO students_list (register_number, name, section) VALUES (?, ?, ?)').run(regNo, 'Student Name', 'N/A');
    console.log('Student record inserted.');
} else {
    console.log('Student already exists (weird).');
}
