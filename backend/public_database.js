const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.PUBLIC_DB_PATH || path.join(__dirname, 'public_trust.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. TRUSTED COMPANIES (Curated by Admin)
    db.run(`CREATE TABLE IF NOT EXISTS public_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT,
        consumer_group TEXT, -- e.g. PHARMACY, DRINKING_WATER, STAPLE_FOOD, etc.
        country TEXT,
        trust_status TEXT DEFAULT 'PENDING', -- VERIFIED, PENDING, FLAGGED
        profile_summary TEXT,
        logo_url TEXT,
        compliance_claims TEXT, -- Curated descriptors
        quality_practices TEXT, -- Curated descriptors
        certifications_declared TEXT, -- Curated descriptors
        verification_level INTEGER DEFAULT 1,
        featured_status INTEGER DEFAULT 0,
        trust_expiry DATE,
        last_recertified_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. TRUSTED BRANDS
    db.run(`CREATE TABLE IF NOT EXISTS public_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        trust_badge TEXT DEFAULT 'STANDARD', -- STANDARD, FEATURED, PREMIUM
        visibility_status TEXT DEFAULT 'PUBLISHED',
        brand_description TEXT,
        vigilance_status TEXT DEFAULT 'STABLE',
        resolution_rate INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES public_companies(id)
    )`);

    // 3. TRUSTED PRODUCTS (Optional but recommended)
    db.run(`CREATE TABLE IF NOT EXISTS public_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        trust_label TEXT,
        public_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brand_id) REFERENCES public_brands(id)
    )`);

    // 4. SYSTEM STATS (Curated Scale)
    db.run(`CREATE TABLE IF NOT EXISTS system_stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. PUBLIC ADVERSE EVENTS
    db.run(`CREATE TABLE IF NOT EXISTS public_adverse_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_id INTEGER,
        symptom_type TEXT,
        severity TEXT,
        batch_number TEXT,
        description TEXT,
        reporter_email TEXT,
        status TEXT DEFAULT 'PENDING',
        brand_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(brand_id) REFERENCES public_brands(id)
    )`);

    console.log("TRUST REGISTRY DATABASE: Standalone module initialized.");

    // Dynamic Alter commands for backwards compatibility on existing local databases
    db.run(`ALTER TABLE public_companies ADD COLUMN trust_expiry DATE`, (err) => {});
    db.run(`ALTER TABLE public_companies ADD COLUMN last_recertified_at DATETIME`, (err) => {});
    db.run(`ALTER TABLE public_brands ADD COLUMN vigilance_status TEXT DEFAULT 'STABLE'`, (err) => {});
    db.run(`ALTER TABLE public_brands ADD COLUMN resolution_rate INTEGER DEFAULT 100`, (err) => {});
});

const dbGet = (query, params) => new Promise((res, rej) => db.get(query, params, (err, row) => err ? rej(err) : res(row)));
const dbAll = (query, params) => new Promise((res, rej) => db.all(query, params, (err, rows) => err ? rej(err) : res(rows)));
const dbRun = (query, params) => new Promise((res, rej) => db.run(query, params, function(err) { err ? rej(err) : res(this); }));

module.exports = { db, dbGet, dbAll, dbRun };
