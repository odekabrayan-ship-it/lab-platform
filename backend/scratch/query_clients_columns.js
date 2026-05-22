const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(clients)", [], (err, cols) => {
  if (err) {
    console.error("Error reading columns:", err);
  } else {
    console.log("=== CLIENTS COLUMNS ===");
    console.log(cols.map(c => `${c.name} (${c.type})`));
    
    db.all("SELECT * FROM clients LIMIT 5", [], (err, rows) => {
      if (err) {
        console.error("Error selecting from clients:", err);
      } else {
        console.log("\n=== RECENT CLIENTS ===");
        console.log(rows);
      }
      db.close();
    });
  }
});
