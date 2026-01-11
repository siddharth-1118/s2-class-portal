const db = require('./db');

console.log("--- USERS ---");
const users = db.prepare('SELECT email, role, linked_reg_no FROM users').all();
console.table(users);

console.log("\n--- STUDENTS ---");
const students = db.prepare('SELECT register_number, name, mobile, section FROM students_list LIMIT 5').all();
console.table(students);
