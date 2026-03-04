const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'database.sqlite');
const db = new Database(dbPath); // verbose: console.log

// Initialize Schema
db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('site', 'post')),
        postId TEXT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        contact TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
        parentId TEXT,
        FOREIGN KEY (parentId) REFERENCES comments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(type);
    CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId);
    CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
`);

// Initialize default visit count if not exists
const insertVisit = db.prepare('INSERT OR IGNORE INTO visits (id, count) VALUES (1, 0)');
insertVisit.run();

module.exports = db;
