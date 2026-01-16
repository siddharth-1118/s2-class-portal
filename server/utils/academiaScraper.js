const puppeteer = require('puppeteer');
const fs = require('fs');

async function loginToAcademia(page, username, password, log) {
    log('Navigating to Login Page...');
    await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2' });

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

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
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
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.setDefaultTimeout(30000);

        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2' });

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
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
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
                // If no error message but no nav, assume success if URL correct? No.
                throw new Error('Login Timeout or Failed');
            }
        }
        return true;
        return true;

    } catch (e) {
        log(`Verification Failed: ${e.message} `);
        throw e;
    } finally {
        if (browser) await browser.close();
    }

module.exports = { scrapeTimetable, verifyCredentials, scrapeMarks, scrapeAcademicPlanner, scrapeAttendance };