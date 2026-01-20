const puppeteer = require('puppeteer');
const fs = require('fs');

// Shared Browser Launcher
async function launchBrowser() {
    // const execPath = puppeteer.executablePath(); // Let Puppeteer resolve the default path automatically
    return await puppeteer.launch({
        headless: 'new',
        // executablePath: execPath, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Critical for Render/Docker memory limits
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Saves memory
            '--window-size=1280,800'
        ]
    });
}

// Shared Login Helper
async function loginToAcademia(page, username, password, log) {
    log('Navigating to Login Page...');

    // Optimizations: Block resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'domcontentloaded' }); // faster than networkidle2

    // Check if already logged in (redirected to dashboard)
    if (page.url().includes('#Page:Home') || page.url().includes('My_Attendance')) {
        log('Already logged in!');
        return;
    }

    try {
        const iframeElement = await page.waitForSelector('#signinFrame', { timeout: 15000 });
        const frame = await iframeElement.contentFrame();

        await frame.waitForSelector('#login_id', { visible: true });
        await frame.type('#login_id', username);
        await frame.click('#nextbtn');

        await frame.waitForSelector('#password', { visible: true, timeout: 10000 });
        await frame.type('#password', password);
        await frame.click('#nextbtn');

        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        log(`Login Flow Error: ${e.message}`);
        // Check if we are actually logged in despite error
        if (!page.url().includes('accounts.srmist.edu.in')) return;
        throw e;
    }
}

async function verifyCredentials(username, password) {
    const log = (msg) => console.log(`[Verifier] ${msg} `);
    let browser;
    try {
        log(`Verifying ${username}...`);
        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.setDefaultTimeout(30000);

        // Optimizations: Block resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'domcontentloaded' });

        // Simple Login Flow
        const iframeElement = await page.waitForSelector('#signinFrame');
        const frame = await iframeElement.contentFrame();

        await frame.waitForSelector('#login_id', { visible: true });
        await frame.type('#login_id', username);
        await frame.click('#nextbtn');

        try {
            await frame.waitForSelector('#password', { visible: true, timeout: 15000 });
        } catch (e) {
            throw new Error('Invalid Username (or Page Timeout)');
        }

        await frame.type('#password', password);
        await frame.click('#nextbtn');

        // Check for success or error
        try {
            // Wait for either navigation (success) or error message
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                frame.waitForSelector('.error-message', { timeout: 10000 })
            ]);

            const errorMsg = await frame.$('.error-message');
            if (errorMsg) throw new Error('Invalid Password');

            if (page.url().includes('academia.srmist.edu.in')) {
                log("Verification Success");
                return true;
            }
        } catch (e) {
            if (e.message.includes('Invalid Password')) throw e;

            // If timeout waiting for navigation, check if we are still on login page
            if (page.url().includes('accounts.srmist.edu.in')) {
                const errorMsg = await frame.$('.error-message');
                if (errorMsg) throw new Error('Invalid Password');
                throw new Error('Login Timeout or Failed');
            }
        }
        return true;

    } catch (e) {
        log(`Verification Failed: ${e.message} `);
        throw e;
    } finally {
        if (browser) await browser.close();
    }
}

// Scrape Timetable (Unified + Personal)
async function scrapeTimetable(username, password) {
    const log = (msg) => {
        console.log(msg);
        // fs.appendFileSync('scraper_debug.log', `[${new Date().toISOString()}] ${msg} \n`);
    };

    let browser;
    try {
        log(`[Scraper] Starting Advanced Scrape for: ${username} `);

        browser = await launchBrowser();

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.setDefaultTimeout(60000);

        // 1. Login
        await loginToAcademia(page, username, password, log);
        if (page.url().includes('login')) throw new Error('Login failed. Check credentials.');

        // 2. Scrape My_Time_Table_2023_24 (Target)
        log(`Visiting My Time Table (Target): https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24`);
        await page.goto('https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24', { waitUntil: 'networkidle2' });

        try {
            await page.waitForSelector('table', { timeout: 20000 });
        } catch (e) {
            log("My Data: Found 0 slots (Timeout).");
        }

        // 3. Extract Profile Data from Timetable Page (Fallback)
        const profile = await page.evaluate(() => {
            const data = { name: '', regNo: '', mobile: '', section: '', email: '' }; // Defaults
            const bodyText = document.body.innerText;

            // Regex Extraction for Robustness
            const regMatch = bodyText.match(/Register\s*No\.?\s*[:\-]?\s*([A-Z0-9]+)/i);
            const nameMatch = bodyText.match(/Name\s*[:\-]?\s*([A-Z\s\.]+)/i);

            if (regMatch) data.regNo = regMatch[1].trim();
            if (nameMatch) data.name = nameMatch[1].trim();

            // Fallback: Try finding tables with specific headers if regex fails
            if (!data.regNo) {
                const tds = Array.from(document.querySelectorAll('td'));
                const find = (label) => {
                    const el = tds.find(td => td.innerText.includes(label));
                    return el && el.nextElementSibling ? el.nextElementSibling.innerText.trim() : '';
                };
                data.regNo = find('Register No');
                data.name = find('Name');
            }

            return data;
        });

        log(`[Scraper] Extracted Profile: ${JSON.stringify(profile)}`);

        // 4. Scrape Timetable Data (Robust Parsing)
        const myTimetable = await page.evaluate(() => {
            const slots = [];
            const tables = Array.from(document.querySelectorAll('table'));

            // Find the main timetable grid (biggest table usually)
            // Or look for specific headers like 'Day' or '1', '2', '3'

            for (const table of tables) {
                const rows = Array.from(table.querySelectorAll('tr'));
                let dayCounter = 1;

                rows.forEach((row) => {
                    const cells = Array.from(row.querySelectorAll('td'));

                    // Filter for valid timetable rows (usually many columns)
                    if (cells.length > 5) {
                        cells.forEach((cell, colIndex) => {
                            const text = cell.innerText.trim();

                            // "AI" Logic: Identify Course Codes
                            // Matches: 2 digits, 2+ letters, etc. (e.g., 21PYB102J, 18CSC207J)
                            // Or standard patterns like 'P_PHY'
                            const codeMatch = text.match(/(\d{2}[A-Z]{3}\d{3}[A-Z]?)|([A-Z]+_\w+)/);

                            if (codeMatch || (text.length > 5 && text.includes('-'))) {
                                const code = codeMatch ? codeMatch[0] : (text.split(' ')[0] || text);
                                const subjectName = text.replace(code, '').trim() || text;

                                slots.push({
                                    day: dayCounter, // We might need to map row index to Day Name if present
                                    period: colIndex,
                                    content: text,
                                    code: code,
                                    subject: subjectName,
                                    type: text.toLowerCase().includes('lab') ? 'Lab' : 'Theory',
                                    staff: '',
                                    room: ''
                                });
                            }
                        });
                        // Only increment day if we actually found something or it looks like a day row
                        if (cells.some(c => c.innerText.match(/\d{2}[A-Z]{3}/))) {
                            dayCounter++;
                        }
                    }
                });
            }
            return slots;
        });

        log(`[Scraper] My Data: Found ${myTimetable.length} slots.`);

        return { timetable: myTimetable, attendance: [], profile: profile, batch1Grid: [], batch2Grid: [] };

    } catch (e) {
        log(`Scrape Failed: ${e.message}`);
        return { timetable: [], attendance: [], profile: {} };
    } finally {
        if (browser) await browser.close();
    }
}

// Scrape Marks
async function scrapeMarks(username, password) {
    const log = (msg) => console.log(`[MarksScraper] ${msg}`);
    let browser;
    try {
        log(`Scraping Marks for ${username}...`);
        const execPath = puppeteer.executablePath();
        browser = await launchBrowser(); // Use shared launcher logic
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.setDefaultTimeout(60000);

        await loginToAcademia(page, username, password, log);

        // 1. Try Standard Marks Page
        log("Navigating to My Marks...");
        await page.goto('https://academia.srmist.edu.in/#Page:My_Marks', { waitUntil: 'networkidle2' });

        try {
            await page.waitForSelector('table', { timeout: 15000 });
        } catch (e) {
            log("Standard failed. Trying Internal Marks...");
            await page.goto('https://academia.srmist.edu.in/#Page:Internal_Marks', { waitUntil: 'networkidle2' });
            await page.waitForSelector('table', { timeout: 15000 });
        }

        const marks = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            const data = [];
            rows.forEach(row => {
                const cols = Array.from(row.querySelectorAll('td'));
                if (cols.length > 3) {
                    const textContent = cols.map(c => c.innerText.trim());
                    // Heuristic: Subject + Scores
                    // Look for Subject Name (text) and Scores (numbers)

                    // Simple parser: 
                    // [Code, Name, ..., Score, Max, ...]
                    const subject = textContent[1] || textContent[0];
                    const possibleNums = textContent.filter(t => !isNaN(parseFloat(t)) && t.length < 4);

                    if (subject && possibleNums.length >= 2) {
                        data.push({
                            subject: subject,
                            score: parseFloat(possibleNums[possibleNums.length - 2]),
                            max_marks: parseFloat(possibleNums[possibleNums.length - 1]),
                            exam_type: 'Internal'
                        });
                    }
                }
            });
            return data;
        });

        log(`Found ${marks.length} marks entries.`);
        return marks;

    } catch (e) {
        log(`Error: ${e.message}`);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeAcademicPlanner(username, password) {
    return [];
}

module.exports = { scrapeTimetable, verifyCredentials, scrapeMarks, scrapeAcademicPlanner, scrapeAttendance };