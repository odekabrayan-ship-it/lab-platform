const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('public_trust.db');

db.serialize(() => {
    console.log("Migrating brands for Vigilance Intelligence...");
    
    db.run(`ALTER TABLE public_brands ADD COLUMN vigilance_status TEXT DEFAULT 'STABLE'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err);
    });

    db.run(`ALTER TABLE public_brands ADD COLUMN resolution_rate INTEGER DEFAULT 100`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err);
    });

    console.log("Migration complete.");
});

db.close();
