const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT CHECK(role IN ('admin', 'student')) NOT NULL,
    mobile TEXT,
    section TEXT,
    linked_reg_no TEXT,
    is_approved INTEGER DEFAULT 0 -- 0: Pending, 1: Approved, 2: Rejected
  );
`);

// Migration for linked_reg_no
try { db.prepare('ALTER TABLE users ADD COLUMN linked_reg_no TEXT').run(); } catch (e) { }
// Migration for is_approved
try { db.prepare('ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0').run(); } catch (e) { }
// Auto-approve existing users (optional, but good for migration)
try { db.prepare('UPDATE users SET is_approved = 1 WHERE is_approved IS NULL').run(); } catch (e) { }

db.exec(`
  CREATE TABLE IF NOT EXISTS homework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    keys TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students_list (
    register_number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT,
    section TEXT
  );

  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    period TEXT NOT NULL,
    time_range TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher TEXT
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for existing table
try { db.prepare('ALTER TABLE students_list ADD COLUMN mobile TEXT').run(); } catch (e) { }
try { db.prepare('ALTER TABLE students_list ADD COLUMN section TEXT').run(); } catch (e) { }

db.exec(`
  CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_reg_no TEXT,
    subject TEXT,
    score REAL,
    max_marks REAL,
    exam_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_reg_no) REFERENCES students_list(register_number)
  );

  CREATE TABLE IF NOT EXISTS academic_calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    day TEXT,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'regular',
    day_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS timetable_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch TEXT NOT NULL, -- 'BATCH_1' or 'BATCH_2'
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject TEXT,
    staff TEXT,
    type TEXT, -- 'Theory', 'Lab', 'Online'
    time_range TEXT
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'general', 'urgent', 'homework'
    target TEXT, -- 'all', 'student_email', 'batch'
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mess_menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT UNIQUE NOT NULL, -- Monday, Tuesday...
    breakfast TEXT,
    lunch TEXT,
    snacks TEXT,
    dinner TEXT,
    specials TEXT
  );
`);

// Migration for exam_type
try { db.prepare('ALTER TABLE marks ADD COLUMN exam_type TEXT').run(); } catch (e) { }
// Migration for specials in mess_menu
try { db.prepare('ALTER TABLE mess_menu ADD COLUMN specials TEXT').run(); } catch (e) { }

// --- SEED TIMETABLE DATA IF EMPTY ---
const { SUBJECT_MAP, GROUP_1_SCHEDULE, GROUP_2_SCHEDULE, TIME_SLOTS } = require('./utils/timetableData');
const { CALENDAR_EVENTS } = require('./utils/calendarData');

const seedTimetable = () => {
  const count = db.prepare('SELECT count(*) as c FROM timetable_entries').get().c;
  if (count === 0) {
    console.log("Seeding Timetable Data (Groups 1 & 2)...");
    const insert = db.prepare('INSERT INTO timetable_entries (batch, day, period, subject, staff, type, time_range) VALUES (?, ?, ?, ?, ?, ?, ?)');

    const seedBatch = (batchName, schedule) => {
      Object.keys(schedule).forEach(dayNum => {
        const dayStr = `Day ${dayNum}`;
        const periods = schedule[dayNum];
        periods.forEach((slotCode, idx) => {
          if (slotCode === 'LUNCH') return;
          const info = SUBJECT_MAP[slotCode] || { name: slotCode, type: 'Theory', staff: '' };
          insert.run(batchName, dayStr, idx + 1, info.name, info.staff, info.type, TIME_SLOTS[idx]);
        });
      });
    };

    seedBatch('GROUP_1', GROUP_1_SCHEDULE);
    seedBatch('GROUP_2', GROUP_2_SCHEDULE);
    console.log("Group Timetables Seeded.");
  }
};

const seedCalendar = () => {
  const count = db.prepare('SELECT count(*) as c FROM academic_calendar').get().c;
  if (count === 0) {
    console.log("Seeding Academic Calendar...");
    const insert = db.prepare('INSERT INTO academic_calendar (date, day, description, type, day_order) VALUES (?, ?, ?, ?, ?)');

    CALENDAR_EVENTS.forEach(event => {
      insert.run(event.date, event.day, event.description, event.type, event.day_order);
    });
    console.log("Calendar Seeded.");
  }
};

const seedMessMenu = () => {
  // 1. Ensure table has 'specials' column (handled by schema migration above)

  // 2. Check if we need to seed from scratch
  const count = db.prepare('SELECT count(*) as c FROM mess_menu').get().c;

  const menuData = [
    {
      day: 'Monday',
      breakfast: 'Sweet, Bread, Butter, Jam, Idly, Sambar, Spl Chutney, Poori, Aloo Dal Masala, Tea / Coffee / Milk, Boiled Egg, Banana',
      lunch: 'Chappathi, Channa Masala, Jeera Pulao, Steamed Rice, Masala Sambar, Bagara Dal, Mix Veg Poriyal, Lemon Rasam, Pickle, Butter Milk, Fryums',
      snacks: 'Pav Bajji, Tea / Coffee',
      dinner: 'Punjabi Paratha, Rajma Masala, Dosa, Idly Podi, Oil, Special Chutney, Steamed Rice, Vegetable Dal, Rasam, Pickle, Fryums, Veg Salad',
      specials: 'Mutton Gravy'
    },
    {
      day: 'Tuesday',
      breakfast: 'Bread, Butter, Jam, Ghee Pongal, Vadai, Veg Khichdi, Coconut Chutney, Poha, Mint Chutney, Tea / Coffee / Milk, Masala Omelette',
      lunch: 'Poori, Mattar Masala, Variety Rice, Steamed Rice, Sambar, Dal Tadka, Tomato Rasam, Gobi-65 / Bhindi Jaipuri, Fryums, Butter Milk, Pickle',
      snacks: 'Boiled Peanut / Black Channa Sundal, Tea / Coffee',
      dinner: 'Chappathi, Mix Veg Kurma, Fried Rice / Noodles, Manchurian Dry / Crispy Vegetable, Steamed Rice, Rasam, Dal Fry, Pickle, Fryums, Veg Salad, Milk',
      specials: 'Sweet, Chicken Gravy, Spl Fruits'
    },
    {
      day: 'Wednesday',
      breakfast: 'Bread, Butter, Jam, Dosa, Idly Podi, Oil, Arachivitta Sambar, Chutney, Chappathi, Aloo Rajma Masala, Tea / Coffee / Milk, Banana',
      lunch: 'Butter Roti, Aloo Palak, Peas Pulao, Dal Makhani, Kadai Vegetable, Steamed Rice, Drumstick Brinjal Sambar, Garlic Rasam, Pickle, Fryums, Butter Milk',
      snacks: 'Veg Puff / Sweet Bun, Juice (or) Tea / Coffee',
      dinner: 'Chappathi, Steamed Rice, Dal Tadka, Chicken Masala (Non-Veg) / Paneer Butter Masala, Rasam, Pickle, Fryums, Veg Salad, Milk',
      specials: 'Chicken Gravy'
    },
    {
      day: 'Thursday',
      breakfast: 'Bread, Butter, Jam, Chappathi, Aloo Meal Maker Korma, Vermicelli Kichadi, Coconut Chutney, Boiled Egg, Tea / Coffee / Milk',
      lunch: 'Luchi, Kashmiri Dum Aloo, Onion Pulao, Steamed Rice, Mysore Dal Fry, Kadi Pakoda, Pepper Rasam, Poriyal, Pickle, Fryums, Butter Milk',
      snacks: 'Pani Poori (or) Chunda Nasta / Tea / Coffee',
      dinner: 'Ghee Pulao / Kaju Pulao (Basmati Rice), Chappathi, Mutter Paneer, Steamed Rice, Dal Tadka, Rasam, Aloo Peanut Masala, Fryums, Pickle, Veg Salad, Milk, Ice Cream',
      specials: 'Mutton Gravy'
    },
    {
      day: 'Friday',
      breakfast: 'Bread, Butter, Jam, Podi Dosa, Idly Podi, Oil, Chilli Sambar, Chutney, Chappathi, Mattar Masala, Tea / Coffee / Milk, Boiled Egg, Banana',
      lunch: 'Veg Biryani, Mix Raitha, Bisibelabath, Curd Rice, Steamed Rice, Tomato Rasam, Aloo Gobi Adaraki, Moongdal Tadka, Pickle, Fryums',
      snacks: 'Bonda / Vada, Chutney, Tea / Coffee',
      dinner: 'Chole Bhatura, Steamed Rice, Tomato Dal, Sambar, Rava Upma, Coconut Chutney, Rasam, Cabbage Poriyal, Pickle, Fryums, Veg Salad, Milk',
      specials: 'Dry Jamun / Bread Halwa, Chicken Gravy'
    },
    {
      day: 'Saturday',
      breakfast: 'Bread, Butter, Jam, Chappathi, Veg Kurma, Idiyappam (Lemon or Masala), Coconut Chutney, Tea / Coffee / Milk, Boiled Egg',
      lunch: 'Poori, Dal Aloo Masala, Veg Pulao, Steamed Rice, Punjabi Dal Tadka, Bhindi Do Pyaza, Kara Kuzhambu, Kootu, Jeera Rasam, Pickle, Special Fryums, Butter Milk',
      snacks: 'Cake (or) Brownie, Tea / Coffee',
      dinner: 'Sweet, Malabar Paratha, Meal Maker Curry, Mix Vegetable Sabji, Steamed Rice, Dal Makhani, Idly, Idly Podi, Oil, Chutney, Tiffen Sambar, Rasam, Pickle, Fryums, Veg Salad, Milk, Special Fruit',
      specials: 'Fish Gravy'
    },
    {
      day: 'Sunday',
      breakfast: 'Bread, Butter, Jam, Chole Poori, Veg Upma, Coconut Chutney, Tea / Coffee / Milk',
      lunch: 'Chappathi, Chicken (Pepper / Kadai), Paneer Butter Masala (or) Kadai Paneer, Dal Fry, Mint Pulao, Steamed Rice, Garlic Rasam, Poriyal, Pickle, Fryums, Butter Milk',
      snacks: 'Corn / Bajji, Chutney, Tea / Coffee',
      dinner: 'Variety Stuffing Paratha, Curd, Steamed Rice, Hara Moong Dal Tadka, Kathamba Sambar, Poriyal, Rasam, Pickle, Fryums, Veg Salad, Milk, Ice Cream',
      specials: 'Chicken Gravy'
    }
  ];

  if (count === 0) {
    console.log("Seeding Mess Menu...");
    const insert = db.prepare('INSERT INTO mess_menu (day, breakfast, lunch, snacks, dinner, specials) VALUES (?, ?, ?, ?, ?, ?)');
    menuData.forEach(m => insert.run(m.day, m.breakfast, m.lunch, m.snacks, m.dinner, m.specials));
    console.log("Mess Menu Seeded.");
  } else {
    // Migration: Update existing rows if specials are NULL
    // This is useful since we just added the column and the table might default to NULL
    console.log("Checking for Mess Menu Updates (Specials)...");
    const update = db.prepare('UPDATE mess_menu SET specials = ? WHERE day = ? AND (specials IS NULL OR specials = "")');
    let updatedCount = 0;
    menuData.forEach(m => {
      const info = update.run(m.specials, m.day);
      updatedCount += info.changes;
    });
    if (updatedCount > 0) console.log(`Updated ${updatedCount} days with Specials data.`);
  }
};

try { seedTimetable(); } catch (e) { console.error("Seeding Error (Timetable):", e); }
try { seedCalendar(); } catch (e) { console.error("Seeding Error (Calendar):", e); }
try { seedMessMenu(); } catch (e) { console.error("Seeding Error (Mess Menu):", e); }

console.log('Database initialized successfully');

module.exports = db;
