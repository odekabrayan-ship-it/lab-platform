const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'qualicore.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    if (row) {
        console.log("SCHEMA_START");
        console.log(row.sql);
        console.log("SCHEMA_END");
    }
    db.close();
});
