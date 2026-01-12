const http = require('http');

http.get('http://localhost:5000/api/calendar', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const events = JSON.parse(data);
            const jan12 = events.find(e => e.date === '2026-01-12');
            console.log('API Response for Jan 12:', jan12);
        } catch (e) {
            console.error('Parse Error:', e);
        }
    });
}).on('error', (e) => {
    console.error('Request Error:', e);
});
