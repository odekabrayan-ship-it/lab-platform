const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('public_trust.db');

db.serialize(() => {
    console.log("Starting Trust Expiry migration...");
    
    // Add columns if they don't exist
    db.run(`ALTER TABLE public_companies ADD COLUMN trust_expiry DATE`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding trust_expiry:", err.message);
        }
    });

    db.run(`ALTER TABLE public_companies ADD COLUMN last_recertified_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding last_recertified_at:", err.message);
        }
    });

    // Initialize existing companies with 1 year from now
    db.run(`
        UPDATE public_companies 
        SET trust_expiry = date('now', '+1 year'), 
            last_recertified_at = CURRENT_TIMESTAMP
        WHERE trust_expiry IS NULL
    `, (err) => {
        if (err) console.error("Error initializing dates:", err.message);
        else console.log("Migration successful: All companies initialized with 1-year trust window.");
    });
});

db.close();
