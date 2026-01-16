const db = require('./db');

console.log("Checking User Linkages...");
const users = db.prepare('SELECT email, linked_reg_no FROM users').all();

users.forEach(u => {
    if (u.linked_reg_no) {
        const student = db.prepare('SELECT * FROM students_list WHERE register_number = ?').get(u.linked_reg_no);
        if (!student) {
            console.log(`[PROBLEM] User ${u.email} is linked to ${u.linked_reg_no} which is MISSING in students_list.`);
        } else {
            console.log(`[OK] User ${u.email} is linked to ${u.linked_reg_no} (${student.name}).`);
        }
    } else {
        console.log(`[INFO] User ${u.email} is NOT linked.`);
    }
});
