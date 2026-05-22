const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

async function verify() {
  console.log("=== EXECUTING SOVEREIGN ISO-17025 VERIFICATION AND COMPLIANCE BADGING ===");
  
  db.serialize(() => {
    // 1. Update laboratories table
    db.run(
      `UPDATE laboratories 
       SET verification_status = 'VERIFIED', availability_status = 'ACTIVE', admin_notes = 'ISO/IEC 17025 Accreditation Audit Approved by Super Admin'
       WHERE name IN ('Sovereign Lab Diagnostics', 'Sovereign Quality Testing Labs (SQTL)')`,
      [],
      function(err) {
        if (err) {
          console.error("Error updating laboratories status:", err);
        } else {
          console.log(`✅ Laboratories updated successfully. Affected rows: ${this.changes}`);
        }
      }
    );

    // 2. Update users table based on user_ids of those laboratories
    db.run(
      `UPDATE users 
       SET is_verified = 1 
       WHERE id IN (
         SELECT user_id FROM laboratories WHERE name IN ('Sovereign Lab Diagnostics', 'Sovereign Quality Testing Labs (SQTL)')
       )`,
      [],
      function(err) {
        if (err) {
          console.error("Error updating users status:", err);
        } else {
          console.log(`✅ Associated User accounts verified successfully. Affected rows: ${this.changes}`);
        }
      }
    );

    // 3. Verify current state to print proof of activation
    db.all(
      `SELECT l.id, l.name, l.verification_status, l.availability_status, u.email, u.is_verified 
       FROM laboratories l
       JOIN users u ON l.user_id = u.id
       WHERE l.name IN ('Sovereign Lab Diagnostics', 'Sovereign Quality Testing Labs (SQTL)')`,
      [],
      (err, rows) => {
        if (err) {
          console.error("Error reading verification results:", err);
        } else {
          console.log("\n=== ACTIVATED INSTITUTIONAL NODES ===");
          console.log(rows);
        }
        db.close();
      }
    );
  });
}

verify();
