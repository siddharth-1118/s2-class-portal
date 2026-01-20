const db = require('../db');

console.log("Swapping Day 1 and Day 2 in database...");

const update = db.transaction(() => {
    // 1. Day 1 -> TEMP
    db.prepare("UPDATE timetable_entries SET day = 'TEMP' WHERE day = 'Day 1'").run();

    // 2. Day 2 -> Day 1
    db.prepare("UPDATE timetable_entries SET day = 'Day 1' WHERE day = 'Day 2'").run();

    // 3. TEMP -> Day 2
    db.prepare("UPDATE timetable_entries SET day = 'Day 2' WHERE day = 'TEMP'").run();
});

try {
    update();
    console.log("Swap successful!");
} catch (error) {
    console.error("Swap failed:", error);
}
