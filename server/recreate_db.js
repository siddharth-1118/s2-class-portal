const db = require('better-sqlite3')('database.sqlite');
const { SUBJECT_MAP, GROUP_1_SCHEDULE, GROUP_2_SCHEDULE, TIME_SLOTS } = require('./utils/timetableData');

console.log("Recreating timetable_entries with 'code' column...");

db.prepare('DROP TABLE IF EXISTS timetable_entries').run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS timetable_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch TEXT,
        day TEXT,
        period INTEGER,
        subject TEXT,
        code TEXT,
        staff TEXT,
        type TEXT,
        time_range TEXT
    )
`).run();

const insert = db.prepare('INSERT INTO timetable_entries (batch, day, period, subject, code, staff, type, time_range) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

const seedBatch = (batchName, schedule) => {
    Object.keys(schedule).forEach(dayNum => {
        const dayStr = `Day ${dayNum}`;
        const periods = schedule[dayNum];
        periods.forEach((slotCode, idx) => {
            if (slotCode === 'LUNCH') return;
            const info = SUBJECT_MAP[slotCode] || { name: slotCode, code: 'TBD', type: 'Theory', staff: '' };
            // Ensure Free Slots don't look weird, or just leave them
            insert.run(batchName, dayStr, idx + 1, info.name, info.code || '-', info.staff, info.type, TIME_SLOTS[idx]);
        });
    });
};

seedBatch('GROUP_1', GROUP_1_SCHEDULE);
seedBatch('GROUP_2', GROUP_2_SCHEDULE);

console.log("Database Recreated and Seeded with Codes.");
