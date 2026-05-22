require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../database');

async function inspect() {
  try {
    const users = await db.dbAll("SELECT * FROM users");
    console.log("=== ALL USERS IN DB ===");
    console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role, status: u.verification_status })));

    const laboratories = await db.dbAll("SELECT * FROM laboratories");
    console.log("\n=== ALL LABORATORIES IN DB ===");
    console.log(laboratories.map(l => ({ id: l.id, user_id: l.user_id, name: l.name, verification_status: l.verification_status, country: l.country })));
  } catch (err) {
    console.error("Database query failed:", err);
  }
}

inspect();
