const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFiles = [
  path.resolve(__dirname, '../database.sqlite'),
  path.resolve(__dirname, '../qualicore.db'),
  path.resolve(__dirname, '../../qualicore.db')
];

function queryDb(dbPath) {
  return new Promise((resolve) => {
    console.log(`\n=== QUERYING: ${dbPath} ===`);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.log(`Could not open database: ${err.message}`);
        resolve();
        return;
      }
      
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
          console.log(`Error listing tables: ${err.message}`);
          db.close();
          resolve();
          return;
        }
        console.log("Tables:", tables.map(t => t.name));
        
        db.all("SELECT id, email, role, verification_status FROM users", [], (err, users) => {
          if (err) {
            console.log(`Error querying users: ${err.message}`);
          } else {
            console.log("Users:", users);
          }
          
          db.all("SELECT id, name, verification_status FROM laboratories", [], (err, labs) => {
            if (err) {
              console.log(`Error querying laboratories: ${err.message}`);
            } else {
              console.log("Laboratories:", labs);
            }
            db.close();
            resolve();
          });
        });
      });
    });
  });
}

async function run() {
  for (const file of dbFiles) {
    await queryDb(file);
  }
}

run();
