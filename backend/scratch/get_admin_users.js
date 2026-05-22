require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../database');

async function listAdmins() {
  try {
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
    const users = await db.dbAll("SELECT * FROM users");
    console.log("=== ALL SYSTEM USERS ===");
    console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role, status: u.verification_status })));
  } catch (err) {
    console.error("Database query failed:", err);
  }
}

listAdmins();
