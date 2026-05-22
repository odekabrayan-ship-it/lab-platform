const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(engagements)", [], (err, cols) => {
  if (err) {
    console.error("Error reading engagements columns:", err);
  } else {
    console.log("=== ENGAGEMENTS COLUMNS ===");
    console.log(cols.map(c => `${c.name} (${c.type})`));
    
    db.all("SELECT * FROM engagements LIMIT 5", [], (err, rows) => {
      if (err) {
        console.error("Error selecting from engagements:", err);
      } else {
        console.log("\n=== RECENT ENGAGEMENTS ===");
        console.log(rows);
      }
      db.close();
    });
  }
});
