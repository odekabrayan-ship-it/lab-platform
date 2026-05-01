const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('public_trust.db');

db.serialize(() => {
    console.log("Creating Adverse Events table...");
    db.run(`
        CREATE TABLE IF NOT EXISTS public_adverse_events (
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
        )
    `, (err) => {
        if (err) console.error("Error:", err.message);
        else console.log("Adverse Events table READY.");
    });
});

db.close();
