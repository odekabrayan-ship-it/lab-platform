const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('public_trust.db');

db.serialize(() => {
    console.log("Fixing missing columns...");
    
    db.run(`ALTER TABLE public_companies ADD COLUMN trust_status TEXT DEFAULT 'VERIFIED'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err);
    });

    db.run(`ALTER TABLE public_brands ADD COLUMN visibility_status TEXT DEFAULT 'PUBLISHED'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err);
    });

    console.log("Schema sync complete.");
});

db.close();
