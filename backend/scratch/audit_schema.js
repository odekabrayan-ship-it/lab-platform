const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, '../qualicore.db'));

console.log("=== PLATFORM ARCHITECTURE AUDIT ===\n");

db.serialize(() => {
  db.get("SELECT sql FROM sqlite_master WHERE name='users'", (err, row) => {
    console.log("1. USERS TABLE SCHEMA:");
    console.log(row ? row.sql : 'Not found');
    console.log();
  });

  db.all("SELECT id, email, role, sub_role, parent_lab_id, parent_client_id, is_verified FROM users ORDER BY id", (err, rows) => {
    if (err) { console.error("Users error:", err.message); return; }
    console.log("2. CURRENT USERS:");
    (rows||[]).forEach(r => console.log(`  ID=${r.id} | role=${r.role} | sub_role=${r.sub_role||'(none)'} | lab=${r.parent_lab_id||'-'} | client=${r.parent_client_id||'-'} | verified=${r.is_verified} | email=${r.email}`));
    console.log();
  });

  db.all("SELECT id, name, verification_status, subscription_status, is_internal FROM laboratories ORDER BY id", (err, rows) => {
    if (err) { console.error("Labs error:", err.message); return; }
    console.log("3. LABORATORIES:");
    (rows||[]).forEach(r => console.log(`  ID=${r.id} | name=${r.name} | status=${r.verification_status} | sub=${r.subscription_status} | internal=${r.is_internal}`));
    console.log();
  });

  db.all("SELECT id, company_name, verification_status FROM clients ORDER BY id", (err, rows) => {
    if (err) { console.error("Clients error:", err.message); return; }
    console.log("4. CLIENTS:");
    (rows||[]).forEach(r => console.log(`  ID=${r.id} | company=${r.company_name} | status=${r.verification_status}`));
    console.log();
    db.close();
  });
});
