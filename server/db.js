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
    section TEXT,
    linked_reg_no TEXT
  );
`);

// Migration for linked_reg_no
try { db.prepare('ALTER TABLE users ADD COLUMN linked_reg_no TEXT').run(); } catch (e) { }

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_reg_no) REFERENCES students_list(register_number)
  );
`);

console.log('Database initialized successfully');

module.exports = db;
