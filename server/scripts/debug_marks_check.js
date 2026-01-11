const db = require('../db');
const fs = require('fs');

const output = [];
function log(msg) {
    output.push(msg);
    console.log(msg);
}

log('--- DEBUG START ---');

const users = db.prepare('SELECT id, email, role, linked_reg_no FROM users').all();
log('USERS: ' + JSON.stringify(users, null, 2));

const students = db.prepare('SELECT register_number, name FROM students_list').all();
log('STUDENTS: ' + JSON.stringify(students, null, 2));

const marks = db.prepare('SELECT id, student_reg_no, subject, score FROM marks').all();
log('MARKS: ' + JSON.stringify(marks, null, 2));

log('\n--- CROSS CHECK ---');
users.forEach(user => {
    if (user.role === 'student') {
        log(`User: ${user.email} (Linked: ${user.linked_reg_no || 'NULL'})`);
        if (user.linked_reg_no) {
            const student = students.find(s => s.register_number === user.linked_reg_no);
            if (student) {
                log(`  -> Found Student: ${student.name}`);
                const studentMarks = marks.filter(m => m.student_reg_no === user.linked_reg_no);
                log(`  -> Marks Count: ${studentMarks.length}`);
                studentMarks.forEach(m => log(`     - ${m.subject}: ${m.score}`));
            } else {
                log(`  -> ERROR: Student record NOT FOUND for reg no: ${user.linked_reg_no}`);
            }
        } else {
            log('  -> Not linked to any student profile.');
        }
    }
});
log('--- DEBUG END ---');

fs.writeFileSync('debug_result.txt', output.join('\n'));
