const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, name, contact_person, company_category FROM clients", [], (err, clients) => {
  if (err) {
    console.error("Error reading clients:", err);
  } else {
    console.log("=== EXISTING CLIENTS ===");
    console.log(clients);
  }
  
  db.all("SELECT id, name FROM laboratories", [], (err, labs) => {
    if (err) {
      console.error("Error reading labs:", err);
    } else {
      console.log("\n=== EXISTING LABORATORIES ===");
      console.log(labs);
    }
    db.close();
  });
});
