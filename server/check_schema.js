const db = require('./db');
try {
    const info = db.pragma('table_info(mess_menu)');
    console.log('Mess Menu Columns:', info);
} catch (e) {
    console.error(e);
}
