const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(users)", [], (err, cols) => {
  if (err) {
    console.error("Error users columns:", err);
  } else {
    console.log("=== USERS COLUMNS ===");
    console.log(cols.map(c => `${c.name} (${c.type})`));
  }

  db.all("PRAGMA table_info(laboratories)", [], (err, cols2) => {
    if (err) {
      console.error("Error laboratories columns:", err);
    } else {
      console.log("\n=== LABORATORIES COLUMNS ===");
      console.log(cols2.map(c => `${c.name} (${c.type})`));
    }
    
    // Find our specific registered users
    db.all("SELECT id, email, role FROM users ORDER BY id DESC LIMIT 5", [], (err, users) => {
      if (err) {
        console.error("Error users select:", err);
      } else {
        console.log("\n=== RECENT USERS ===");
        console.log(users);
      }
      db.close();
    });
  });
});
