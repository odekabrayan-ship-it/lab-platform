require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../database');

async function listLabs() {
  try {
    // Inspect database tables to see table names
    const tables = await db.dbAll("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("=== DATABASE TABLES ===");
    console.log(tables.map(t => t.name));

    // Try selecting from users with role = 'lab'
    const labUsers = await db.dbAll("SELECT * FROM users WHERE role = 'lab'");
    console.log("\n=== LAB USERS ===");
    console.log(labUsers.map(u => ({ id: u.id, email: u.email, role: u.role, status: u.verification_status })));

    // Try selecting from labs table if it exists
    if (tables.some(t => t.name === 'labs')) {
      const labs = await db.dbAll("SELECT * FROM labs");
      console.log("\n=== LAB PROFILES (labs table) ===");
      console.log(labs.map(l => ({ id: l.id, user_id: l.user_id, name: l.name, verification_status: l.verification_status, country: l.country })));
    }
  } catch (err) {
    console.error("Database query failed:", err);
  }
}

listLabs();
