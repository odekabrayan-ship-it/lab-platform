const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('qualicore.db');

db.serialize(() => {
    console.log("Fixing LIMS Schema...");
    
    // 1. Create counters table
    db.run(`CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
    )`);

    // 2. Fix samples table (Requires recreation in SQLite for check constraints)
    db.run(`PRAGMA foreign_keys=OFF;`);
    
    // Backup existing data if any (simplified)
    db.run(`ALTER TABLE samples RENAME TO samples_old;`);
    
    db.run(`CREATE TABLE samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_request_id INTEGER NOT NULL,
        sample_code TEXT NOT NULL UNIQUE,
        description TEXT,
        received_by INTEGER NOT NULL,
        condition_notes TEXT,
        status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(status IN ('REGISTERED', 'IN_CUSTODY', 'PREP', 'ANALYZING', 'REVIEW', 'CERTIFIED', 'DISPOSED')),
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        storage_location TEXT,
        hazard_flags TEXT,
        label_printed_at TIMESTAMP, source_company TEXT, source_contact TEXT, tests_requested TEXT, test_specs TEXT, client_notes TEXT, sampling_date DATETIME, sampling_location TEXT, custody_status TEXT DEFAULT 'IN_STORAGE', current_custodian_id INTEGER REFERENCES users(id), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_request_id) REFERENCES test_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (received_by) REFERENCES users(id)
    )`);

    // Try to migrate data back (ignoring status mismatch for now, or mapping it)
    db.run(`INSERT INTO samples (id, test_request_id, sample_code, description, received_by, condition_notes, storage_location, hazard_flags, source_company, source_contact, tests_requested, test_specs, client_notes, sampling_date, sampling_location)
            SELECT id, test_request_id, sample_code, description, received_by, condition_notes, storage_location, hazard_flags, source_company, source_contact, tests_requested, test_specs, client_notes, sampling_date, sampling_location FROM samples_old;`);
    
    db.run(`DROP TABLE samples_old;`);
    db.run(`PRAGMA foreign_keys=ON;`);

    console.log("Schema migration complete.");
});
db.close();
