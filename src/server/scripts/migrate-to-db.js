const fs = require('fs');
const path = require('path');
const db = require('../db');

const PUBLIC_DIR = path.join(__dirname, '../../../public');
const DATA_DIR = path.join(__dirname, '../../../data');
const CONFIG_FILE = path.join(PUBLIC_DIR, 'config.json');
const COLUMNS_FILE = path.join(PUBLIC_DIR, 'columns.json');
const PORTFOLIO_FILE = path.join(PUBLIC_DIR, 'portfolio.json');
const VISIT_FILE = path.join(DATA_DIR, 'visits.json');

function migrate() {
    console.log('Starting migration...');

    // 1. Migrate Visits
    try {
        if (fs.existsSync(VISIT_FILE)) {
            const data = fs.readFileSync(VISIT_FILE, 'utf8');
            const json = JSON.parse(data);
            const count = json.count || 0;
            
            const stmt = db.prepare('UPDATE visits SET count = ? WHERE id = 1');
            stmt.run(count);
            console.log(`Migrated visits: ${count}`);
        } else {
            console.log('No visits.json found, skipping.');
        }
    } catch (e) {
        console.error('Failed to migrate visits:', e);
    }

    // 2. Migrate Config
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            // Validate JSON
            JSON.parse(data);
            
            const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
            stmt.run('site_config', data);
            console.log('Migrated config.json');
        } else {
            console.log('No config.json found, skipping.');
        }
    } catch (e) {
        console.error('Failed to migrate config:', e);
    }

    // 3. Migrate Columns
    try {
        if (fs.existsSync(COLUMNS_FILE)) {
            const data = fs.readFileSync(COLUMNS_FILE, 'utf8');
            // Validate JSON
            JSON.parse(data);
            
            const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
            stmt.run('columns', data);
            console.log('Migrated columns.json');
        } else {
            console.log('No columns.json found, skipping.');
        }
    } catch (e) {
        console.error('Failed to migrate columns:', e);
    }

    // 4. Migrate Portfolio
    try {
        if (fs.existsSync(PORTFOLIO_FILE)) {
            const data = fs.readFileSync(PORTFOLIO_FILE, 'utf8');
            // Validate JSON
            JSON.parse(data);
            
            const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
            stmt.run('portfolio', data);
            console.log('Migrated portfolio.json');
        } else {
            console.log('No portfolio.json found, skipping.');
        }
    } catch (e) {
        console.error('Failed to migrate portfolio:', e);
    }

    console.log('Migration completed.');
}

migrate();
