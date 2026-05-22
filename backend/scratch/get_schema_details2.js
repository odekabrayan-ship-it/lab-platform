const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

const tables = ['lab_equipment', 'lab_methods', 'samples', 'test_requests'];

db.serialize(() => {
  tables.forEach(table => {
    db.all(`PRAGMA table_info(${table})`, [], (err, cols) => {
      if (err) {
        console.error(`Error reading ${table} columns:`, err);
      } else {
        console.log(`\n=== ${table.toUpperCase()} COLUMNS ===`);
        console.log(cols.map(c => `${c.name} (${c.type})`));
      }
    });
  });
});
