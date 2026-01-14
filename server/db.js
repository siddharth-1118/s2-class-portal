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
`);

// Migration for exam_type
try { db.prepare('ALTER TABLE marks ADD COLUMN exam_type TEXT').run(); } catch (e) { }

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

try { seedTimetable(); } catch (e) { console.error("Seeding Error (Timetable):", e); }
try { seedCalendar(); } catch (e) { console.error("Seeding Error (Calendar):", e); }

console.log('Database initialized successfully');

module.exports = db;
