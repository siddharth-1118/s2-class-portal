const db = require('../db');

const marks = [
    { reg: 'RA2511026010906', subject: 'Mathematics', score: 95, max: 100 },
    { reg: 'RA2511026010906', subject: 'Physics', score: 88, max: 100 },
    { reg: 'RA2511026010906', subject: 'Computer Science', score: 98, max: 100 },
    { reg: 'RA2511026010869', subject: 'Mathematics', score: 92, max: 100 },
];

const stmt = db.prepare('INSERT INTO marks (student_reg_no, subject, score, max_marks) VALUES (?, ?, ?, ?)');

console.log('Seeding marks...');
db.transaction(() => {
    for (const m of marks) {
        stmt.run(m.reg, m.subject, m.score, m.max);
        console.log(`Added ${m.subject} for ${m.reg}`);
    }
})();
console.log('Seeding complete.');
