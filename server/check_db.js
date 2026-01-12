const db = require('better-sqlite3')('database.sqlite');
const count = db.prepare('SELECT count(*) as c FROM timetable_entries').get().c;
console.log(`Timetable Entries Count: ${count}`);
if (count > 0) {
    const sample = db.prepare('SELECT * FROM timetable_entries LIMIT 1').get();
    console.log('Sample:', sample);
}
