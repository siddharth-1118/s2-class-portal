const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        console.log('Navigating...');
        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Page loaded. Capturing HTML...');
        const html = await page.content();
        fs.writeFileSync('login_page_dump.html', html);
        console.log('HTML saved to login_page_dump.html');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
