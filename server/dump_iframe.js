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
        console.log('Navigating to Academia...');
        await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Waiting for iframe...');
        const iframeElement = await page.waitForSelector('#signinFrame', { timeout: 30000 });
        const frame = await iframeElement.contentFrame();

        if (frame) {
            console.log('Iframe found. Waiting for inputs...');
            await frame.waitForSelector('input', { timeout: 10000 }).catch(() => console.log('No inputs found immediately'));

            const html = await frame.content();
            fs.writeFileSync('iframe_dump.html', html);
            console.log('Iframe HTML saved to iframe_dump.html');
        } else {
            console.log('Iframe content frame not accessible');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
