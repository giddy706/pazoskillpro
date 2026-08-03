const { Pool } = require('pg');
const path = require('path');
const { readdirSync, readFileSync } = require('fs');

let pool = null;

function translateQuery(sql) {
    let pgSql = sql;
    
    // Replace ? with $1, $2, etc. (naive but effective for these models)
    let count = 1;
    let inString = false;
    let result = '';
    for (let i = 0; i < pgSql.length; i++) {
        const char = pgSql[i];
        if (char === "'") inString = !inString;
        
        if (char === '?' && !inString) {
            result += `$${count++}`;
        } else {
            result += char;
        }
    }
    pgSql = result;
    
    // Replace SQLite specific functions/keywords
    pgSql = pgSql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
    pgSql = pgSql.replace(/(?:date|datetime)\('now',\s*'-'\s*\|\|\s*\$(\d+)\s*\|\|\s*' days'\)/gi, "(CURRENT_DATE - ($$$1 || ' days')::INTERVAL)");
    pgSql = pgSql.replace(/(?:date|datetime)\('now',\s*'-(\d+)\s*days'\)/gi, "(CURRENT_DATE - INTERVAL '$1 days')");
    pgSql = pgSql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO'); 
    pgSql = pgSql.replace(/COUNT\(\*\) as count/gi, 'COUNT(*)::int as count'); // Postgres count is bigint, ensure int
    
    return pgSql;
}

const dbWrapper = {
    get: async (sql, params = []) => {
        const query = translateQuery(sql);
        const result = await pool.query(query, params);
        return result.rows[0] || undefined;
    },
    all: async (sql, params = []) => {
        const query = translateQuery(sql);
        const result = await pool.query(query, params);
        return result.rows;
    },
    run: async (sql, params = []) => {
        let query = translateQuery(sql);
        const isInsert = query.trim().toUpperCase().startsWith('INSERT');
        
        if (isInsert && !query.toUpperCase().includes('RETURNING')) {
            query += ' RETURNING id';
        }
        
        if (sql.toUpperCase().includes('INSERT OR IGNORE')) {
            query += ' ON CONFLICT DO NOTHING';
        }

        const result = await pool.query(query, params);
        return {
            lastID: isInsert && result.rows.length > 0 ? result.rows[0].id : undefined,
            changes: result.rowCount
        };
    },
    exec: async (sql) => {
        await pool.query(sql);
    }
};

async function getDB() {
    if (pool) return dbWrapper;
    
    if (!process.env.DATABASE_URL) {
        console.error("FATAL: DATABASE_URL environment variable is not set!");
        throw new Error("DATABASE_URL is not set. Please configure it in your Render environment variables.");
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl.startsWith('postgres')) {
        console.error("FATAL: DATABASE_URL does not look like a PostgreSQL URL:", dbUrl.substring(0, 30) + '...');
        throw new Error("DATABASE_URL must be a PostgreSQL connection string (starts with postgresql:// or postgres://)");
    }

    console.log('[DB] Connecting to PostgreSQL...');
    pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });
    
    // Test the connection immediately
    try {
        const client = await pool.connect();
        console.log('[DB] PostgreSQL connected successfully!');
        client.release();
    } catch (err) {
        console.error('[DB] Failed to connect to PostgreSQL:', err.message);
        throw err;
    }
    
    return dbWrapper;
}

async function runMigrations() {
    const db = await getDB();
    
    // Postgres creates a table to track migrations
    await db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const row = await db.get(`SELECT id FROM migrations WHERE name = $1`, [file]);
        if (!row) {
            console.log(`Executing migration: ${file}`);
            let sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
            
            // Translate SQLite schema to Postgres schema
            sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
            sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');
            sql = sql.replace(/PRAGMA foreign_keys = ON;/gi, '');
            sql = sql.replace(/INSERT OR IGNORE/gi, 'INSERT'); 
            
            try {
                await db.exec(sql);
                await pool.query(`INSERT INTO migrations (name) VALUES ($1)`, [file]);
            } catch (err) {
                console.error(`Migration failed: ${file}`, err.message);
                throw err;
            }
        }
    }
}

async function runSeed() {
    const db = await getDB();
    try {
        const hasUsers = await db.get("SELECT COUNT(*)::int as count FROM users");
        if (hasUsers && hasUsers.count > 0) return;
    } catch (e) {
        return; // table might not exist if migrations failed
    }

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
