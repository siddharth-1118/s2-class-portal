const fs = require('fs');
const log = (msg) => fs.appendFileSync('import_log.txt', msg + '\n');

try {
    fs.writeFileSync('import_log.txt', 'Starting imports...\n');
    log("Loading db...");
    require('./db');
    log("Loading auth...");
    require('./routes/auth');
    log("Loading homework...");
    require('./routes/homework');
    log("Loading notifications...");
    require('./routes/notifications');
    log("Loading marks...");
    require('./routes/marks');
    log("Loading timetable...");
    require('./routes/timetable');
    log("Loading calendar...");
    require('./routes/calendar');
    log("Loading notices...");
    require('./routes/notices');
    log("Loading mess...");
    require('./routes/mess');
    log("Loading academia...");
    require('./routes/academia');
    log("All imports successful.");
} catch (e) {
    log("IMPORT ERROR: " + e.message);
    log(e.stack);
}
