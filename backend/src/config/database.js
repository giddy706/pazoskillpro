const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const { readdirSync } = require('fs');

let db = null;

async function getDB() {
    if (db) return db;
    db = await open({
        filename: path.join(__dirname, '../../database.sqlite'),
        driver: sqlite3.Database,
    });
    return db;
}

async function runMigrations() {
    const db = await getDB();
    await db.run('PRAGMA foreign_keys = ON;');

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const fs = require('fs');
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await db.exec(sql);
    }
}

async function runSeed() {
    const db = await getDB();
    const hasUsers = await db.get("SELECT COUNT(*) as count FROM users");
    if (hasUsers.count > 0) return;

    const seedDir = path.join(__dirname, '..', '..', 'seeders');
    const seedFiles = readdirSync(seedDir)
        .filter((f) => f.endsWith('.js'))
        .sort();
    for (const file of seedFiles) {
        const run = require(path.join(seedDir, file));
        if (typeof run === 'function') {
            await run(db);
        } else if (run && typeof run.seed === 'function') {
            await run.seed(db);
        }
    }
}

async function initDB() {
    await runMigrations();
    await runSeed();
}

module.exports = { getDB, initDB };
