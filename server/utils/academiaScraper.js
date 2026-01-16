const puppeteer = require('puppeteer');
const fs = require('fs');

async function verifyCredentials(username, password) {
    const log = (msg) => console.log(`[Verifier] ${msg} `);
    let browser;
    try {
        log(`Verifying ${username}...`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Fast Timeout
        page.setDefaultTimeout(8000);

        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'domcontentloaded' });

        // Simple Login Flow
        const iframeElement = await page.waitForSelector('#signinFrame');
        const frame = await iframeElement.contentFrame();

        await frame.type('#login_id', username);
        await frame.click('#nextbtn');

        try {
            await frame.waitForSelector('#password', { visible: true, timeout: 3000 });
        } catch (e) {
            throw new Error('Invalid Username');
        }

        await frame.type('#password', password);
        await frame.click('#nextbtn');

        // Check for success or error
        // If success, we navigate away or see a specific element.
        // If error, we see .error-message

        try {
            // Wait for either navigation (success) or error message
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                frame.waitForSelector('.error-message', { timeout: 5000 })
            ]);

            const errorMsg = await frame.$('.error-message');
            if (errorMsg) throw new Error('Invalid Password');

            if (page.url().includes('academia.srmist.edu.in')) {
                log("Verification Success");
                return true;
            }
        } catch (e) {
            // If timeout waiting for navigation, check if we are still on login page
            if (page.url().includes('accounts.srmist.edu.in')) {
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

async function scrapeTimetable(username, password) {
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('scraper_debug.log', `[${new Date().toISOString()}] ${msg} \n`);
    };

    let browser;
    try {
        log(`[Scraper] Starting Advanced Scrape for: ${username} `);
        const execPath = puppeteer.executablePath();
        log(`[Scraper] Puppeteer Executable Path: ${execPath}`);

        try {
            if (fs.existsSync(execPath)) {
                log('[Scraper] Chrome binary exists at path.');
            } else {
                log('[Scraper] Chrome binary NOT found at path. Listing .cache dir...');
                // Debug listing
                const cacheDir = require('path').join(__dirname, '..', '.cache', 'puppeteer');
                if (fs.existsSync(cacheDir)) {
                    log(`Contents of ${cacheDir}: ${fs.readdirSync(cacheDir)}`);
                } else {
                    log(`Cache dir ${cacheDir} does not exist.`);
                }
            }
        } catch (e) { log(`[Debug] Path check error: ${e.message}`); }

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: execPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(60000); // 60s timeout

        // 1. Login
        log('[Scraper] Navigating to Login...');
        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2' });

        const iframeElement = await page.waitForSelector('#signinFrame');
        const frame = await iframeElement.contentFrame();
        await frame.type('#login_id', username);
        await frame.click('#nextbtn');
        await frame.waitForSelector('#password', { visible: true });
        await frame.type('#password', password);
        await frame.click('#nextbtn');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        if (page.url().includes('login')) throw new Error('Login failed. Check credentials.');

        // 1.1 Scrape Profile
        const profile = await scrapeProfile(page);
        log(`[Scraper] Logged in as: ${profile.name} (${profile.regNo})`);

        // === PHASE 1: GET MASTER DETAILS from "Unified Time Table" (Background Knowledge) ===
        // We do this FIRST so we have a dictionary of Course Code -> Teacher/Room
        // We won't use the Grid from these pages for the final output, only the Metadata.

        const unifiedUrls = [
            'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_Batch_1',
            'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_batch_2'
        ];

        let masterCodeMap = {}; // Key: CourseCode (e.g. 18CSC303J) -> Details
        let masterSlotMap = {}; // Key: Slot (e.g. A) -> Details
        let batch1Grid = [];
        let batch2Grid = [];

        for (const url of unifiedUrls) {
            log(`[Scraper] Visiting Unified (Metadata): ${url}`);

            // Force navigation
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Wait for grid
            try {
                await page.waitForFunction(() => document.body.innerText.includes('Day 1'), { timeout: 5000 });
            } catch (e) { log(`[Scraper] Warning: Timeout waiting for grid on ${url}`); }

            const unifiedData = await scrapePageData(page);

            // Capture Full Grids for Global Table Update (if needed for Admin view)
            if (url.includes('Batch_1')) batch1Grid = unifiedData.grid;
            else if (url.includes('batch_2')) batch2Grid = unifiedData.grid;

            // Populate Maps
            Object.values(unifiedData.map).forEach(info => {
                if (info.code) masterCodeMap[info.code] = info;
                if (info.slot) masterSlotMap[info.slot] = info;
            });
            log(`[Scraper] Ingested ${Object.keys(unifiedData.map).length} slots from ${url.split(':').pop()}`);
        }

        // === PHASE 2: GET PERSONAL TIMETABLE from "My Time Table" (The Truth) ===
        // We go here LAST so the page context is correct for the final grid extraction.

        const myTimeTableUrl = 'https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24';
        log(`[Scraper] Visiting My Time Table (Target): ${myTimeTableUrl}`);

        await page.goto(myTimeTableUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000)); // Wait for render

        // Scrape the Personal Map and Grid
        const myData = await scrapePageData(page);
        log(`[Scraper] My Data: Found ${Object.keys(myData.map).length} slots.`);

        // === PHASE 3: MERGE & FINALIZE ===
        // Merge Personal Map with Master Map to fill in missing details (like Teacher Name if missing in My TT)

        const combinedMap = {};

        // Iterate over My Time Table slots
        Object.keys(myData.map).forEach(slot => {
            const myInfo = myData.map[slot];
            // Start with My Info
            let bestDetails = { ...myInfo };

            // Enrich with Master Info if Code matches
            if (myInfo.code && masterCodeMap[myInfo.code]) {
                const master = masterCodeMap[myInfo.code];
                // Overwrite missing fields
                if (!bestDetails.teacher) bestDetails.teacher = master.teacher;
                if (!bestDetails.room) bestDetails.room = master.room;
                if (!bestDetails.subject) bestDetails.subject = master.subject;
            }
            // Fallback enrichment by Slot (only if Code is missing)
            else if (!myInfo.code && masterSlotMap[slot]) {
                const master = masterSlotMap[slot];
                bestDetails = { ...bestDetails, ...master };
            }

            combinedMap[slot] = bestDetails;
        });

        // Now, Generate the Final Grid using the CURRENT page (My_Time_Table)
        // This ensures the Structure (Periods, Day Order, Free Slots) matches the Personal TT exactly.
        const finalizedGrid = await page.evaluate((courseMap) => {
            const rows = Array.from(document.querySelectorAll('table tr'));
            const data = [];
            let timeSlots = [];
            const cleanKey = (k) => k ? k.trim().replace(/\s+/g, ' ') : '';

            rows.forEach((row, rIndex) => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                const rowText = cells.map(c => c.innerText.trim());

                if (rIndex === 0) {
                    timeSlots = rowText;
                } else {
                    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    const day = rowText[0];
                    if (days.some(d => day.includes(d))) {
                        for (let i = 1; i < cells.length; i++) {
                            const rawSlotText = rowText[i];
                            // If empty slot in "My Time Table", it really is Free.
                            if (!rawSlotText || rawSlotText === '-') {
                                data.push({
                                    day: day, period: i, content: 'Free Slot', subject: 'Free Slot',
                                    code: '', type: 'Theory', teacher: '-', room: '-',
                                    time_range: timeSlots[i] || '', raw: ''
                                });
                                continue;
                            }

                            // If text exists, look it up
                            const parts = rawSlotText.split(/[\/\+]/);
                            let bestMatch = null;
                            let matchedSlot = null;

                            for (const part of parts) {
                                const s = cleanKey(part);
                                if (courseMap[s]) {
                                    bestMatch = courseMap[s];
                                    matchedSlot = s;
                                    break;
                                }
                            }

                            if (bestMatch) {
                                data.push({
                                    day: day, period: i,
                                    content: bestMatch.subject || bestMatch.code || matchedSlot,
                                    subject: bestMatch.subject || bestMatch.code || matchedSlot,
                                    code: bestMatch.code || '',
                                    type: (bestMatch.subject && (bestMatch.subject.match(/lab|practical/i))) ? 'Lab' : 'Theory',
                                    teacher: bestMatch.teacher || bestMatch.staff || '-',
                                    room: bestMatch.room || '-',
                                    time_range: timeSlots[i] || '',
                                    raw: rawSlotText
                                });
                            } else {
                                // Slot text exists (e.g. "Lunch") but not in map (or not a course)
                                data.push({
                                    day: day, period: i,
                                    content: rawSlotText,
                                    subject: rawSlotText, // e.g. "Lunch Break"
                                    code: '', type: 'Theory', teacher: '-', room: '-',
                                    time_range: timeSlots[i] || '',
                                    raw: rawSlotText
                                });
                            }
                        }
                    }
                }
            });
            return data;
        }, combinedMap);

        log(`[Scraper] Finalized Grid from My_Time_Table has ${finalizedGrid.filter(x => x.subject !== 'Free Slot').length} slots.`);

        const attendance = []; // handled by scrapeAttendance
        return { timetable: finalizedGrid, attendance: attendance, profile: profile, batch1Grid, batch2Grid };

    } catch (err) {
        log(`[Scraper Error] ${err.message}`);
        throw err;
    } finally {
        if (browser) await browser.close();
    }
}

// Helper: Scrape Map and Grid from current page
async function scrapePageData(page) {
    const contentInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
            hasSlotCol: (text.includes('Slot') || text.includes('Regn. Slot')) &&
                (text.includes('Course') || text.includes('Subject') || text.includes('Code')),
            hasDayOne: text.includes('Day 1') || text.includes('08:00')
        };
    });

    let extractedMap = {};
    if (contentInfo.hasSlotCol) {
        extractedMap = await page.evaluate(() => {
            const map = {};
            const rows = Array.from(document.querySelectorAll('table tr'));
            const headerRow = rows.find(r => r.innerText.includes('Slot') || r.innerText.includes('Regn. Slot'));
            if (!headerRow) return {};

            const headerCells = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.innerText.trim());
            const slotIdx = headerCells.findIndex(c => c.includes('Slot'));
            const codeIdx = headerCells.findIndex(c => c.includes('Code'));
            const titleIdx = headerCells.findIndex(c => c.includes('Title') || c.includes('Name') || c.includes('Subject'));
            const staffIdx = headerCells.findIndex(c => c.includes('Faculty') || c.includes('Staff'));
            const roomIdx = headerCells.findIndex(c => c.includes('Room') || c.includes('Venue'));

            if (slotIdx !== -1) {
                rows.forEach((row) => {
                    if (row === headerRow) return;
                    const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());
                    const slot = cells[slotIdx];
                    if (slot && slot.length < 10) {
                        map[slot] = {
                            code: (codeIdx !== -1) ? cells[codeIdx] : '',
                            subject: (titleIdx !== -1) ? cells[titleIdx] : '',
                            teacher: (staffIdx !== -1) ? cells[staffIdx] : '',
                            room: (roomIdx !== -1) ? cells[roomIdx] : ''
                        };
                    }
                });
            }
            return map;
        });
    }

    let grid = [];
    if (contentInfo.hasDayOne) {
        // Basic Grid Scrape (Raw)
        grid = await page.evaluate((courseMap) => {
            // ... duplicate of the logic in main function, but we can return raw data here
            // For simplicity in this helper, let's just return key info
            const rows = Array.from(document.querySelectorAll('table tr'));
            const data = [];

            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length === 0) return;

                const firstCell = cells[0].innerText.trim();
                if (!firstCell.startsWith('Day')) return; // Skip headers / empty rows

                // Day 1, Day 2...
                const day = firstCell;

                // Assuming Period 1 is at index 1 -> Period 10 at index 10
                // We iterate 1 to 10 (or specialized loop)
                for (let i = 1; i <= 10; i++) {
                    if (i >= cells.length) break;

                    const slotText = cells[i].innerText.trim();
                    if (!slotText) continue;

                    // Unified Table Logic:
                    // Text is "A" or "P1" or "Maths"
                    // We check our Map first

                    // Slot might be "A / X" -> take "A"
                    // or "P1/X"
                    const cleanSlot = slotText.split('/')[0].trim();

                    let entry = {
                        day: day,
                        period: i.toString(),
                        content: cleanSlot, // Raw slot code
                        subject: cleanSlot, // Default to slot code
                        teacher: '',
                        type: 'Theory',
                        room: '',
                        code: ''
                    };

                    if (courseMap && courseMap[cleanSlot]) {
                        const info = courseMap[cleanSlot];
                        entry.subject = info.subject || cleanSlot;
                        entry.teacher = info.teacher || '';
                        entry.room = info.room || '';
                        entry.code = info.code || '';
                        // Guess type
                        if (entry.room.includes('Lab') || entry.subject.toLowerCase().includes('lab')) {
                            entry.type = 'Lab';
                        }
                    } else {
                        // Heuristic for Lab based on P slots
                        if (cleanSlot.startsWith('P') || cleanSlot.startsWith('L')) {
                            entry.type = 'Lab';
                        }
                    }

                    data.push(entry);
                }
            });
            return data;
        }, extractedMap);
    }

    return { map: extractedMap, grid: grid };
}

// ... (scrapeTimetable logic above)
// Helper: Scrape Profile
async function scrapeProfile(page) {
    const log = (msg) => console.log(`[ProfileScraper] ${msg}`);
    try {
        log("Navigating to My Profile...");
        await page.goto('https://academia.srmist.edu.in/#Page:My_Profile', { waitUntil: 'networkidle2' });

        // Wait for unique element in profile
        try {
            await page.waitForSelector('table', { timeout: 10000 });
        } catch (e) {
            log("Profile table not found.");
        }

        const profileData = await page.evaluate(() => {
            const data = {
                name: '',
                regNo: '',
                mobile: '',
                section: '',
                email: ''
            };

            const allText = document.body.innerText;

            // Helper to find value next to label in a table
            // Usually Academia profiles are tables. "Label" : "Value"
            const tds = Array.from(document.querySelectorAll('td'));

            const findValue = (label) => {
                const labelTd = tds.find(td => td.innerText.toLowerCase().includes(label.toLowerCase()));
                if (labelTd) {
                    // Try next sibling
                    if (labelTd.nextElementSibling) return labelTd.nextElementSibling.innerText.trim();
                    // Or maybe it's the next TD in the list?
                }
                return '';
            };

            data.name = findValue('Name') || findValue('Student Name');
            data.regNo = findValue('Register Number') || findValue('Registration No');
            data.mobile = findValue('Mobile') || findValue('Cell');
            data.email = findValue('Email') || findValue('Official Email');

            // Section might be in "Program Details" or "Academic Details"
            // "Batch/Section" -> "2025 / A"
            const batchSection = findValue('Batch/Section') || findValue('Section');
            if (batchSection) {
                data.section = batchSection.split('/').pop().trim();
            }

            return data;
        });

        // Fallback for RegNo from Top Bar if not found in table
        if (!profileData.regNo) {
            const topBarInfo = await page.evaluate(() => {
                const el = document.querySelector('.topbar-right') || document.body;
                return el.innerText;
            });
            // Try regex for RA number
            const match = topBarInfo.match(/(RA\d{13,})/);
            if (match) profileData.regNo = match[1];
        }

        log(`Extracted: ${JSON.stringify(profileData)}`);
        return profileData;

    } catch (e) {
        console.error("Profile Scrape Error", e);
        // Return minimal info to not block
        return { name: 'Student', regNo: '', mobile: '', section: '' };
    }
}

async function scrapeMarks(username, password) {
    const log = (msg) => console.log(`[MarksScraper] ${msg}`);
    let browser;
    try {
        log(`Scraping marks for ${username}...`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2' });

        // Login (Re-using basic login flow - ideally this should be shared helper but I'll duplicate for safety/speed now)
        const iframeElement = await page.waitForSelector('#signinFrame');
        const frame = await iframeElement.contentFrame();
        await frame.type('#login_id', username);
        await frame.click('#nextbtn');
        await frame.waitForSelector('#password', { visible: true });
        await frame.type('#password', password);
        await frame.click('#nextbtn');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Navigate to Marks (usually "My Grade" or "Assessment")
        // We look for a link containing "Marks" or "Grade"
        try {
            const marksLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                // Common names: "Me -> My Results" or "Academic Reports -> Internal Marks"
                // Let's assume there's a link for "Internal Marks" or "Assessment"
                return links.find(a => a.innerText.toLowerCase().includes('internal marks') || a.innerText.toLowerCase().includes('marks'))?.href;
            });

            if (marksLink) {
                await page.goto(marksLink, { waitUntil: 'networkidle2' });
            } else {
                // Try hash for "My Marks" if not found?
                // log("No explicit Marks link found.");
                // return [];
            }
        } catch (e) { }

        // Scrape the Table
        const marksData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr'));
            const data = [];
            // Heuristic: Headers usually have "Subject", "Max", "Scored"
            //Let's just look for rows with numeric scores
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());
                if (cells.length >= 4) {
                    // Try to map based on content
                    // Assuming layout: [Code, Subject, Type, Max, Scored, ...]
                    // Or [Subject, Score, Max ...]
                    // This is tricky without seeing the page.
                    // I will blindly grab what looks like a score.

                    // 2026 Strategy: Look for "Subject" and Numbers.
                    const subject = cells.find(c => c.length > 5 && !c.match(/^\d+$/));
                    const numbers = cells.filter(c => c.match(/^\d+(\.\d+)?$/) && parseFloat(c) <= 100);

                    if (subject && numbers.length >= 1) {
                        // Assume last number is Score, second last is Max (if exists)
                        const score = parseFloat(numbers[numbers.length - 1]);
                        const max = numbers.length > 1 ? parseFloat(numbers[numbers.length - 2]) : 100;

                        data.push({
                            subject: subject,
                            score: score,
                            max_marks: max,
                            exam_type: 'Internal', // Default
                            student_reg_no: '' // filled by caller
                        });
                    }
                }
            });
            return data;
        });

        return marksData;

    } catch (e) {
        log(`Error: ${e.message}`);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeAcademicPlanner(username, password) {
    const log = (msg) => console.log(`[PlannerScraper] ${msg}`);
    let browser;
    try {
        log(`Scraping Academic Planner for ${username}...`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Login
        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2' });
        const iframeElement = await page.waitForSelector('#signinFrame');
        const frame = await iframeElement.contentFrame();
        await frame.type('#login_id', username);
        await frame.click('#nextbtn');
        await frame.waitForSelector('#password', { visible: true });
        await frame.type('#password', password);
        await frame.click('#nextbtn');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Navigate to Planner
        const plannerUrl = 'https://academia.srmist.edu.in/#Page:Academic_Planner_2025_26_EVEN';
        log(`Navigating to ${plannerUrl}`);
        await page.goto(plannerUrl, { waitUntil: 'networkidle2' });

        // Wait for table
        try {
            await page.waitForSelector('table', { timeout: 10000 });
        } catch (e) {
            log("No table found.");
            return [];
        }

        const events = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr'));
            const data = [];
            // Header usually: Date, Day, Description, Day Order
            // Let's assume standard table structure
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());
                if (cells.length >= 3) {
                    // Try to parse Date
                    // Format often: "01-Jan-2026" or "01/01/2026"
                    const dateStr = cells[0];
                    const dayStr = cells[1];
                    const desc = cells[2];
                    const dayOrder = cells[3] || null;

                    if (dateStr && desc) {
                        data.push({
                            date: dateStr,
                            day: dayStr,
                            description: desc,
                            day_order: dayOrder ? parseInt(dayOrder) : null,
                            type: dayOrder ? 'working' : 'holiday' // heuristic
                        });
                    }
                }
            });
            return data;
        });

        log(`Extracted ${events.length} calendar events.`);
        return events;

    } catch (e) {
        log(`Error: ${e.message}`);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeAttendance(username, password) {
    const log = (msg) => console.log(`[AttendanceScraper] ${msg}`);
    let browser;
    try {
        log(`Scraping Attendance & Marks for ${username}...`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Login
        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2' });
        const iframeElement = await page.waitForSelector('#signinFrame');
        const frame = await iframeElement.contentFrame();
        await frame.type('#login_id', username);
        await frame.click('#nextbtn');
        await frame.waitForSelector('#password', { visible: true });
        await frame.type('#password', password);
        await frame.click('#nextbtn');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const attUrl = 'https://academia.srmist.edu.in/#Page:My_Attendance';
        log(`Navigating to ${attUrl}`);
        await page.goto(attUrl, { waitUntil: 'networkidle2' });

        try {
            await page.waitForSelector('table', { timeout: 10000 });
        } catch (e) {
            log("No tables found.");
            return { attendance: [], marks: [] };
        }

        // Wait a bit for potential secondary tables (Marks) to load if they are dynamic
        await new Promise(r => setTimeout(r, 2000));

        const scrapedData = await page.evaluate(() => {
            const result = { attendance: [], marks: [] };
            const tables = Array.from(document.querySelectorAll('table'));

            if (tables.length === 0) return result;

            // --- 1. Attendance Scraping (Usually Table 1) ---
            // Heuristic: Look for "Conducted" or "Absent" in header
            let attTable = tables.find(t => t.innerText.toLowerCase().includes('conducted') && t.innerText.toLowerCase().includes('absent'));
            // Fallback to first table if matches
            if (!attTable && tables.length > 0) attTable = tables[0];

            if (attTable) {
                const rows = Array.from(attTable.querySelectorAll('tr'));
                let headerIdx = -1;
                rows.some((row, i) => {
                    if (row.innerText.toLowerCase().includes('conducted')) {
                        headerIdx = i;
                        return true;
                    }
                    return false;
                });

                if (headerIdx !== -1) {
                    const headerCells = Array.from(rows[headerIdx].querySelectorAll('td, th')).map(c => c.innerText.trim().toLowerCase());
                    const getIdx = (key) => headerCells.findIndex(c => c.includes(key));

                    const codeIdx = getIdx('code');
                    const titleIdx = getIdx('title');
                    const catIdx = getIdx('category');
                    const facIdx = getIdx('faculty');
                    const slotIdx = getIdx('slot');
                    const condIdx = getIdx('conducted');
                    const absIdx = getIdx('absent');
                    const perIdx = getIdx('%');

                    rows.forEach((row, i) => {
                        if (i <= headerIdx) return;
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length < 5) return;
                        const getText = (idx) => (idx !== -1 && cells[idx]) ? cells[idx].innerText.trim() : '';

                        // Skip rows that look like totals or invalid
                        if (!getText(codeIdx) && !getText(titleIdx)) return;

                        result.attendance.push({
                            course_code: getText(codeIdx),
                            course_title: getText(titleIdx),
                            category: getText(catIdx),
                            faculty_name: getText(facIdx),
                            slot: getText(slotIdx),
                            hours_conducted: parseFloat(getText(condIdx)) || 0,
                            hours_absent: parseFloat(getText(absIdx)) || 0,
                            attendance_percentage: parseFloat(getText(perIdx)) || 0
                        });
                    });
                }
            }

            // --- 2. Marks Scraping (Usually "Internal Marks" Table below) ---
            // Heuristic: Look for "Internal" or "Marks" or "Scored"
            let marksTable = tables.find(t => {
                const txt = t.innerText.toLowerCase();
                return txt.includes('internal') || (txt.includes('scored') && txt.includes('max') && t !== attTable);
            });

            if (marksTable) {
                const rows = Array.from(marksTable.querySelectorAll('tr'));
                let headerIdx = -1;
                // Find header likely containing Max / Scored
                rows.some((row, i) => {
                    const txt = row.innerText.toLowerCase();
                    if (txt.includes('max') && txt.includes('scored')) {
                        headerIdx = i;
                        return true;
                    }
                    return false;
                });

                if (headerIdx === -1) {
                    // Try looking for just headers
                    headerIdx = 0;
                }

                // Generic numeric scaper for Marks
                rows.forEach((row, i) => {
                    if (i <= headerIdx) return;
                    const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());
                    // Expecting at least Subject Name and some numbers
                    if (cells.length < 3) return;

                    // Common Format: [Seq, Code, Subject, Max, Scored, ...] or [Subject, Max, Scored...]
                    // We look for the cell with the longest text (Subject) and numbers.

                    // Simple heuristic: 
                    // Subject = non-numeric string > 3 chars
                    // Score = number <= 100 at the end (usually)

                    const subject = cells.find(c => c.length > 5 && isNaN(parseFloat(c)));
                    const numbers = cells.filter(c => !isNaN(parseFloat(c)) && parseFloat(c) <= 100);

                    if (subject && numbers.length >= 1) {
                        const score = parseFloat(numbers[numbers.length - 1]);
                        const max = numbers.length > 1 ? parseFloat(numbers[numbers.length - 2]) : 100;

                        // Avoid duplicates if row is just a total? 
                        if (subject.toLowerCase().includes('total')) return;

                        result.marks.push({
                            subject: subject,
                            score: score,
                            max_marks: max,
                            exam_type: 'Internal', // Assumed as per User request "Internal Marks"
                            student_reg_no: '' // filled by caller if needed
                        });
                    }
                });
            }

            return result;
        });

        log(`Scraped ${scrapedData.attendance.length} attendance and ${scrapedData.marks.length} marks entries.`);
        return scrapedData;

    } catch (e) {
        log(`Error: ${e.message}`);
        return { attendance: [], marks: [] };
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrapeTimetable, verifyCredentials, scrapeMarks, scrapeAcademicPlanner, scrapeAttendance };
