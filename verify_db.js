const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'qualicore.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) console.error(err);
    console.log(rows);
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (row) console.log(row.sql);
        db.close();
    });
});
