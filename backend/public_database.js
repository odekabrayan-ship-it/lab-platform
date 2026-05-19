const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const isPg = !!process.env.DATABASE_URL;

let pgPool;
let sqliteDb;

if (isPg) {
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log("TRUST REGISTRY DATABASE: PostgreSQL connection established.");
} else {
    const dbPath = process.env.PUBLIC_DB_PATH || path.join(__dirname, 'public_trust.db');
    sqliteDb = new sqlite3.Database(dbPath);
    console.log(`TRUST REGISTRY DATABASE: Local SQLite fallback active at ${dbPath}`);
}

// -------------------------------------------------------------
// Dialect Translation Engine
// -------------------------------------------------------------
function translateQuery(sql) {
    if (!sql) return sql;
    let converted = sql;

    // 1. Placeholder Translation: Convert ? to positional $1, $2, $3...
    let placeholderIndex = 1;
    converted = converted.replace(/\?/g, () => `$${placeholderIndex++}`);

    // 2. SQLite Date Functions Mapping to PostgreSQL
    converted = converted.replace(/date\('now'\)/gi, "CURRENT_DATE");
    converted = converted.replace(/DATE\('now'\)/gi, "CURRENT_DATE");

    // date('now', '+X days') / date('now', '-X days')
    converted = converted.replace(/date\('now',\s*'([+-])(\d+)\s*days?'\)/gi, (match, sign, amount) => {
        return `(CURRENT_DATE ${sign} INTERVAL '${amount} days')`;
    });

    // date('now', '+X months') / date('now', '-X months')
    converted = converted.replace(/date\('now',\s*'([+-])(\d+)\s*months?'\)/gi, (match, sign, amount) => {
        return `(CURRENT_DATE ${sign} INTERVAL '${amount} months')`;
    });

    // date('now', '+X years') / date('now', '-X years')
    converted = converted.replace(/date\('now',\s*'([+-])(\d+)\s*years?'\)/gi, (match, sign, amount) => {
        return `(CURRENT_DATE ${sign} INTERVAL '${amount} years')`;
    });

    // date('now', $X) -> (CURRENT_DATE + CAST($X AS interval))
    converted = converted.replace(/date\('now',\s*(\$\d+)\)/gi, "(CURRENT_DATE + CAST($1 AS interval))");

    // Type casts for date extracts
    converted = converted.replace(/date\(trust_expiry\)/gi, "trust_expiry::date");
    converted = converted.replace(/date\(created_at\)/gi, "created_at::date");

    // 3. PostgreSQL Type Definitions & Constraints
    converted = converted.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
    converted = converted.replace(/\bAUTOINCREMENT\b/gi, "");

    // Convert BOOLEAN DEFAULT 0/1 to smallint or compatible expressions
    converted = converted.replace(/BOOLEAN DEFAULT 0/gi, "INTEGER DEFAULT 0");
    converted = converted.replace(/BOOLEAN DEFAULT 1/gi, "INTEGER DEFAULT 1");

    // 4. Case-Insensitive Pattern Match
    converted = converted.replace(/\bLIKE\b/g, "ILIKE");

    // 5. Conflict Resolution: SQLite INSERT OR IGNORE -> PostgreSQL ON CONFLICT DO NOTHING
    if (converted.trim().toUpperCase().includes('INSERT OR IGNORE INTO')) {
        converted = converted.replace(/INSERT OR IGNORE INTO/gi, "INSERT INTO");
        if (!converted.toUpperCase().includes('ON CONFLICT')) {
            converted = converted.trim() + " ON CONFLICT DO NOTHING";
        }
    }

    return converted;
}

// -------------------------------------------------------------
// Core Promise-based Query Methods
// -------------------------------------------------------------
const dbGet = async (query, params = []) => {
    if (isPg) {
        const translated = translateQuery(query);
        const res = await pgPool.query(translated, params);
        return res.rows[0] || null;
    } else {
        return new Promise((res, rej) => sqliteDb.get(query, params, (err, row) => err ? rej(err) : res(row)));
    }
};

const dbAll = async (query, params = []) => {
    if (isPg) {
        const translated = translateQuery(query);
        const res = await pgPool.query(translated, params);
        return res.rows;
    } else {
        return new Promise((res, rej) => sqliteDb.all(query, params, (err, rows) => err ? rej(err) : res(rows)));
    }
};

const dbRun = async (query, params = []) => {
    if (isPg) {
        let translated = translateQuery(query);
        
        // Append RETURNING id to INSERT statements to track lastID
        if (translated.trim().toUpperCase().startsWith('INSERT ')) {
            if (!translated.toUpperCase().includes(' RETURNING ')) {
                translated = translated.trim() + ' RETURNING id';
            }
        }
        
        const res = await pgPool.query(translated, params);
        return {
            lastID: res.rows.length > 0 ? Object.values(res.rows[0])[0] : null,
            changes: res.rowCount
        };
    } else {
        return new Promise((res, rej) => sqliteDb.run(query, params, function(err) {
            if (err) rej(err);
            else res({ lastID: this.lastID, changes: this.changes });
        }));
    }
};

// -------------------------------------------------------------
// High-Fidelity API Compatibility Shim (Callback-based db.db)
// -------------------------------------------------------------
const pgInitQueue = [];
let pgInitRunning = false;

function normalizeArgs(params, callback) {
    let normalizedParams = [];
    let normalizedCallback = null;

    if (typeof params === 'function') {
        normalizedCallback = params;
        normalizedParams = [];
    } else if (params !== undefined && params !== null) {
        normalizedParams = Array.isArray(params) ? params : [params];
        normalizedCallback = callback;
    } else {
        normalizedCallback = callback;
    }

    return { params: normalizedParams, callback: normalizedCallback };
}

async function runPgInitQueue() {
    if (pgInitRunning) return;
    pgInitRunning = true;
    for (const item of pgInitQueue) {
        try {
            await dbRun(item.query, item.params);
            if (item.callback) item.callback(null);
        } catch (err) {
            // Gracefully ignore duplicate column errors in schema migrations
            if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate column'))) {
                if (item.callback) item.callback(null);
            } else {
                console.error("SCHEMA ERROR DURING PUBLIC REGISTRY INITIALIZATION:", err.message);
                if (item.callback) item.callback(err);
            }
        }
    }
    pgInitRunning = false;
}

const dbMock = {
    get: (query, params, callback) => {
        const normalized = normalizeArgs(params, callback);
        dbGet(query, normalized.params)
            .then(row => { if (normalized.callback) normalized.callback(null, row); })
            .catch(err => { if (normalized.callback) normalized.callback(err); });
    },
    all: (query, params, callback) => {
        const normalized = normalizeArgs(params, callback);
        dbAll(query, normalized.params)
            .then(rows => { if (normalized.callback) normalized.callback(null, rows); })
            .catch(err => { if (normalized.callback) normalized.callback(err); });
    },
    run: (query, params, callback) => {
        const normalized = normalizeArgs(params, callback);
        const isSchema = query.trim().toUpperCase().startsWith('CREATE ') || query.trim().toUpperCase().startsWith('ALTER ');
        if (isSchema) {
            pgInitQueue.push({ query, params: normalized.params, callback: normalized.callback });
            if (!pgInitRunning) {
                setTimeout(runPgInitQueue, 20);
            }
        } else {
            dbRun(query, normalized.params)
                .then(result => {
                    if (normalized.callback) normalized.callback.call(result, null);
                })
                .catch(err => {
                    if (normalized.callback) normalized.callback(err);
                });
        }
    },
    serialize: (callback) => {
        callback();
    }
};

const dbExport = isPg ? dbMock : sqliteDb;
dbExport.db = dbExport;

// -------------------------------------------------------------
// Schema Initialization
// -------------------------------------------------------------
dbExport.serialize(() => {
    // 1. TRUSTED COMPANIES (Curated by Admin)
    dbExport.run(`CREATE TABLE IF NOT EXISTS public_companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        consumer_group TEXT, 
        country TEXT,
        trust_status TEXT DEFAULT 'PENDING', 
        profile_summary TEXT,
        logo_url TEXT,
        compliance_claims TEXT, 
        quality_practices TEXT, 
        certifications_declared TEXT, 
        verification_level INTEGER DEFAULT 1,
        featured_status INTEGER DEFAULT 0,
        trust_expiry DATE,
        last_recertified_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. TRUSTED BRANDS
    dbExport.run(`CREATE TABLE IF NOT EXISTS public_brands (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES public_companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT,
        trust_badge TEXT DEFAULT 'STANDARD', 
        visibility_status TEXT DEFAULT 'PUBLISHED',
        brand_description TEXT,
        vigilance_status TEXT DEFAULT 'STABLE',
        resolution_rate INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. TRUSTED PRODUCTS
    dbExport.run(`CREATE TABLE IF NOT EXISTS public_products (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL REFERENCES public_brands(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT,
        trust_label TEXT,
        public_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. SYSTEM STATS (Curated Scale)
    dbExport.run(`CREATE TABLE IF NOT EXISTS system_stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. PUBLIC ADVERSE EVENTS
    dbExport.run(`CREATE TABLE IF NOT EXISTS public_adverse_events (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER REFERENCES public_brands(id) ON DELETE CASCADE,
        symptom_type TEXT,
        severity TEXT,
        batch_number TEXT,
        description TEXT,
        reporter_email TEXT,
        status TEXT DEFAULT 'PENDING',
        brand_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log("TRUST REGISTRY DATABASE: Compatibility adapters and schemas initialized.");

    // Backward-compatibility schema syncs (run on sqliteDb or ignored gracefully in pg)
    dbExport.run(`ALTER TABLE public_companies ADD COLUMN trust_expiry DATE`, (err) => {});
    dbExport.run(`ALTER TABLE public_companies ADD COLUMN last_recertified_at DATETIME`, (err) => {});
    dbExport.run(`ALTER TABLE public_brands ADD COLUMN vigilance_status TEXT DEFAULT 'STABLE'`, (err) => {});
    dbExport.run(`ALTER TABLE public_brands ADD COLUMN resolution_rate INTEGER DEFAULT 100`, (err) => {});
});

module.exports = { db: dbExport, dbGet, dbAll, dbRun };
