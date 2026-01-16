require('dotenv').config();
const db = require('./db');
const { scrapeTimetable } = require('./utils/academiaScraper');
const { decrypt } = require('./utils/crypto');

async function verify() {
    try {
        console.log("Fetching credentials...");
        const user = db.prepare("SELECT email, linked_reg_no, academia_enc_pass, academia_iv FROM users WHERE email LIKE '%sv3824%'").get();

        if (!user || !user.academia_enc_pass) {
            console.error("User or credentials not found!");
            return;
        }

        const password = decrypt({ content: user.academia_enc_pass, iv: user.academia_iv });
        console.log(`Running Scraper for ${user.email} (Reg: ${user.linked_reg_no})...`);

        const { batch1Grid, batch2Grid } = await scrapeTimetable(user.linked_reg_no, password);

        console.log("--- Batch 1 Sample ---");
        // Log Day 1 Period 1
        const b1d1p1 = batch1Grid.find(x => x.day === 'Day 1' && x.period === '1');
        console.log(b1d1p1 || 'Not Found');

        console.log("--- Batch 2 Sample ---");
        const b2d1p1 = batch2Grid.find(x => x.day === 'Day 1' && x.period === '1');
        console.log(b2d1p1 || 'Not Found');

        if (b1d1p1 && b2d1p1 && b1d1p1.content !== b2d1p1.content) {
            console.log("SUCCESS: Batches are different!");
        } else {
            console.log("FAILURE: Batches are identical or empty.");
        }

    } catch (e) {
        console.error(e);
    }
}

verify();
