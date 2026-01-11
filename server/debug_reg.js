const db = require('./db');
const target = 'RA2511026010906';
const rows = db.prepare('SELECT register_number FROM students_list').all();

console.log(`Searching for: ${target}`);
console.log(`Target length: ${target.length}`);

let found = false;
rows.forEach(r => {
    if (r.register_number.includes('906')) {
        console.log(`\nPotential Match Found: '${r.register_number}'`);
        console.log(`Length: ${r.register_number.length}`);
        console.log(`Bytes: ${Buffer.from(r.register_number).toString('hex')}`);
        if (r.register_number === target) {
            console.log("EXACT STRING MATCH CONFIRMED");
            found = true;
        } else {
            console.log("STRING MATCH FAILED");
        }
    }
});

if (!found) console.log("\nNo exact match found in DB.");
