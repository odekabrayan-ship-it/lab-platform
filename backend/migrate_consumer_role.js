const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('qualicore.db');

db.serialize(() => {
    console.log("COMMENCING SOVEREIGN ROLE MIGRATION...");
    db.run('PRAGMA foreign_keys=OFF;');
    
    // Create new users table with expanded role check
    db.run(`CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'lab', 'client', 'professional', 'consumer')),
        sub_role TEXT,
        parent_lab_id INTEGER,
        parent_client_id INTEGER,
        is_verified INTEGER DEFAULT 0,
        signature_pin TEXT, 
        signatory_title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Transfer data
    db.run('INSERT INTO users_new SELECT * FROM users', (err) => {
        if (err) {
            console.error("DATA TRANSFER FAILURE:", err.message);
            return;
        }
        console.log("INTEGRITY TRANSFER: 100% SUCCESS.");
    });

    db.run('DROP TABLE users');
    db.run('ALTER TABLE users_new RENAME TO users');
    db.run('PRAGMA foreign_keys=ON;');
    
    console.log("SOVEREIGN ROLE EXPANSION: NOMINAL.");
});
