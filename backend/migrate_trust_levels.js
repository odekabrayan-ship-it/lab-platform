const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('qualicore.db');

db.serialize(() => {
    console.log("SYNCHRONIZING TRUST HIERARCHY LEDGER...");
    db.run('PRAGMA foreign_keys=OFF;');
    
    // Create new verification_applications table with LEVEL 1, 2, 3
    db.run(`CREATE TABLE va_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        tier TEXT NOT NULL CHECK(tier IN ('LEVEL 1', 'LEVEL 2', 'LEVEL 3')),
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
        target_brands TEXT, 
        submitted_documents TEXT, 
        admin_notes TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);

    db.run('DROP TABLE IF EXISTS verification_applications');
    db.run('ALTER TABLE va_new RENAME TO verification_applications');
    db.run('PRAGMA foreign_keys=ON;');
    
    console.log("TRUST HIERARCHY: LEVEL 1-3 DEPLOYED.");
});
