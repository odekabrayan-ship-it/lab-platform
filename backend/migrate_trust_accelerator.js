const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('qualicore.db');

db.serialize(() => {
    console.log("COMMENCING TRUST ACCELERATOR INFRASTRUCTURE DEPLOYMENT...");
    
    // Create verification_applications table
    db.run(`CREATE TABLE IF NOT EXISTS verification_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        tier TEXT NOT NULL CHECK(tier IN ('BRONZE', 'SILVER', 'GOLD')),
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
        target_brands TEXT, -- JSON array of brand IDs
        submitted_documents TEXT, -- JSON array of document URLs (ISO, etc.)
        admin_notes TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);

    console.log("TRUST ACCELERATOR LEDGERS: INITIALIZED.");
});
