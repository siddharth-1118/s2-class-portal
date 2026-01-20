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

        // 1.1 Scrape Profile
        const profile = await scrapeProfile(page);
        log(`[Scraper] Logged in as: ${profile.name} (${profile.regNo})`);

        // Phase 1: Unified Timetables (Metadata)
        // Skip for now to save memory/time if not critical
        // const batch1Map = await scrapeUnifiedTimetable(page, 'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_Batch_1', log); 
        // const batch2Map = await scrapeUnifiedTimetable(page, 'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_batch_2', log); 

        // Phase 2: Personal My_Time_Table (Structure)
        const myTimetable = await scrapeMyTimeTable(page, log);
        log(`[Scraper] My Data: Found ${myTimetable.length} slots.`);

        return { timetable: myTimetable, attendance: [], profile: profile, batch1Grid: [], batch2Grid: [] };

    } catch (e) {
        log(`Scrape Failed: ${e.message}`);
        return { timetable: [], attendance: [], profile: {} };
    } finally {
        if (browser) await browser.close();
    }
}

// Scrape Profile
async function scrapeProfile(page) {
    const log = (msg) => console.log(`[ProfileScraper] ${msg}`);
    try {
        log("Navigating to My Profile...");
        await page.goto('https://academia.srmist.edu.in/#Page:My_Profile', { waitUntil: 'networkidle2' });

        // Robust Wait
        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('Register Number') || document.body.innerText.includes('Student Name'),
                { timeout: 30000 }
            );
        } catch (e) {
            log("Profile text not found.");
        }

        const profileData = await page.evaluate(() => {
            const data = { name: '', regNo: '', mobile: '', section: '', email: '' };
            const tds = Array.from(document.querySelectorAll('td'));
            const findValue = (label) => {
                const labelTd = tds.find(td => td.innerText.includes(label));
                if (labelTd && labelTd.nextElementSibling) {
                    return labelTd.nextElementSibling.innerText.trim();
                }
                return '';
            };
            data.regNo = findValue('Register Number');
            data.name = findValue('Student Name');
            data.mobile = findValue('Mobile Number');
            data.email = findValue('Email ID');
            return data;
        });

        if (!profileData.regNo) log("Profile table not found.");
        else log(`Extracted: ${JSON.stringify(profileData)}`);

        return profileData;
    } catch (e) {
        log(`Profile Error: ${e.message}`);
        return { name: '', regNo: '' };
    }
}

// Helper: Scrape Unified (Metadata)
async function scrapeUnifiedTimetable(page, url, log) {
    try {
        log(`Visiting Unified (Metadata): ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        // Wait for grid?
        try {
            await page.waitForSelector('table', { timeout: 10000 });
        } catch (e) {
            log(`Warning: Timeout waiting for grid on ${url}`);
            return { map: {} };
        }

        // Simpler: Just return empty map if too complex to restore blindly. 
        // The user cares about Personal Timetable mainly.
        return { map: {} };
    } catch (e) {
        return { map: {} };
    }
}

// Helper: Scrape My Table
async function scrapeMyTimeTable(page, log) {
    log(`Visiting My Time Table (Target): https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24`);
    await page.goto('https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24', { waitUntil: 'networkidle2' });

    try {
        await page.waitForSelector('table', { timeout: 20000 });
    } catch (e) {
        log("My Data: Found 0 slots (Timeout).");
        return [];
    }

    // Evaluate
    return await page.evaluate(() => {
        const slots = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr'));

        // standard day mapping if rows don't have day names
        let dayCounter = 1;

        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('td'));
            // Heuristic: Timetable rows usually have many columns (e.g., > 8)
            if (cells.length > 5) {
                cells.forEach((cell, colIndex) => {
                    const text = cell.innerText.trim();
                    // Regex for Course Code (e.g., 21PYB102J or 18CS...)
                    // Matches 2 digits + 3 letters + ...
                    if (text.match(/\d{2}[A-Z]{3}/) || (text.length > 5 && text.includes('-'))) {
                        slots.push({
                            day: dayCounter,
                            period: colIndex, // Approximate period
                            content: text,
                            code: text.split(' ')[0] || text,
                            type: 'Theory', // Default
                            staff: '',
                            room: ''
                        });
                    }
                });
                dayCounter++;
            }
        });
        return slots;
    });
}

// Scrape Attendance
async function scrapeAttendance(username, password) {
    const log = (msg) => console.log(`[AttendanceScraper] ${msg}`);
    let browser;
    try {
        log(`Scraping Attendance & Marks for ${username}...`);
        const execPath = puppeteer.executablePath();
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: execPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await loginToAcademia(page, username, password, log);

        // Navigate
        // Navigate
        await page.goto('https://academia.srmist.edu.in/#Page:My_Attendance', { waitUntil: 'networkidle2' });

        // Wait for specific header to ensure data loaded
        try {
            await page.waitForFunction(
                () => Array.from(document.querySelectorAll('th, td')).some(el => el.innerText.includes('Course Code')),
                { timeout: 20000 }
            );
        } catch (e) {
            log("Attendance table not found.");
            return { attendance: [], marks: [] };
        }

        const data = await page.evaluate(() => {
            const tables = Array.from(document.querySelectorAll('table'));
            let targetTable = null;

            // Find the exact table containing 'Course Code'
            for (const table of tables) {
                if (table.innerText.includes('Course Code') && table.innerText.includes('Attendance')) {
                    targetTable = table;
                    break;
                }
            }

            if (!targetTable) return { attendance: [], marks: [] };

            const rows = Array.from(targetTable.querySelectorAll('tr'));
            const attendance = [];
            const marks = [];

            // Skip header (find index of header row)
            let headerFound = false;

            rows.forEach(row => {
                const cols = Array.from(row.querySelectorAll('td'));
                const textContent = row.innerText;

                if (textContent.includes('Course Code') && textContent.includes('Attn %')) {
                    headerFound = true;
                    return; // Skip the header row itself
                }

                if (headerFound && cols.length >= 8) {
                    // Filter out rows that are usually "Total" or garbage
                    const code = cols[0]?.innerText.trim();
                    if (code && code.match(/\d{2}[A-Z]{3}/)) {
                        attendance.push({
                            course_code: code,
                            course_title: cols[1]?.innerText.trim(),
                            category: cols[2]?.innerText.trim(),
                            faculty_name: cols[3]?.innerText.trim(),
                            slot: cols[4]?.innerText.trim(),
                            hours_conducted: cols[5]?.innerText.trim(),
                            hours_absent: cols[6]?.innerText.trim(),
                            attendance_percentage: cols[7]?.innerText.trim()
                        });
                    }
                }
            });
            return { attendance, marks };
        });

        return data;

    } catch (e) {
        log(`Error: ${e.message}`);
        return { attendance: [], marks: [] };
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeMarks(username, password) {
    const log = (msg) => console.log(`[MarksScraper] ${msg}`);
    let browser;
    try {
        log(`Scraping Marks for ${username}...`);
        const execPath = puppeteer.executablePath();
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: execPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
        });
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
            log("Standard detailed logic failed/timed out. Trying Internal Marks page...");
            await page.goto('https://academia.srmist.edu.in/#Page:Internal_Marks', { waitUntil: 'networkidle2' });
            await page.waitForSelector('table', { timeout: 15000 });
        }

        const marks = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            const data = [];
            // Header heuristics: look for "Subject", "Total", "Max"
            // Since structure varies, we'll exact robustly
            rows.forEach(row => {
                const cols = Array.from(row.querySelectorAll('td'));
                if (cols.length > 3) {
                    const textContent = cols.map(c => c.innerText.trim());
                    // Heuristic: A valid mark row usually has a subject code and a score
                    // Example: [18CSC207J, OS, ..., 48, 50, ...]

                    // Simple parsing for now - adjust based on real table structure
                    // Assuming columns: Code, Name, ... Score, Max ...
                    // We will grab the first string-like as subject, and numbers as score

                    // Better: Try to find specific columns? 
                    // Let's grab specific indices common in SRM portal
                    // Index 0: Code, Index 1: Name, Index 4/5: Marks?

                    const subject = textContent[1] || textContent[0];
                    const possibleNums = textContent.filter(t => !isNaN(parseFloat(t)) && t.length < 4);

                    if (subject && possibleNums.length >= 2) {
                        data.push({
                            subject: subject,
                            score: parseFloat(possibleNums[possibleNums.length - 2]), // Second to last number (often score)
                            max_marks: parseFloat(possibleNums[possibleNums.length - 1]), // Last number (often max)
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