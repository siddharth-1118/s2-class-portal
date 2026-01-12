const db = require('better-sqlite3')('database.sqlite');

console.log("--- TIMETABLE ENTRIES ---");
const count = db.prepare('SELECT count(*) as c FROM timetable_entries').get().c;
console.log(`Total Entries: ${count}`);

if (count > 0) {
    const samples = db.prepare('SELECT * FROM timetable_entries LIMIT 5').all();
    console.log("Samples:", JSON.stringify(samples, null, 2));

    const distinctBatches = db.prepare('SELECT DISTINCT batch FROM timetable_entries').all();
    console.log("Distinct Batches:", distinctBatches);

    const day3 = db.prepare("SELECT * FROM timetable_entries WHERE day = 'Day 3' AND batch = 'GROUP_2'").all();
    console.log("Day 3 Count:", day3.length);
    if (day3.length > 0) console.log("Sample Day 3:", day3[0]);
} else {
    console.log("TABLE IS EMPTY!");
}
