/**
 * PLATFORM SUPER ADMIN SEEDING SCRIPT
 * 
 * Creates the two YIMBiK/QualiCore platform-level Super Admin accounts:
 *   - director@yimbik.org (Platform Owner)
 *   - 28.digital.tech@yimbik.org (Technical Platform Admin)
 * 
 * These users are PLATFORM-LEVEL: role='admin', sub_role='SUPER_ADMIN'
 * They do NOT belong to any laboratory or client organization.
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../qualicore.db'));

const PLATFORM_ADMINS = [
  {
    email: 'director@yimbik.org',
    password: 'QualiCore@Director2026!',
    role: 'admin',
    sub_role: 'SUPER_ADMIN',
    display_name: 'Brayan Ouma Odeka — Platform Director'
  },
  {
    email: '28.digital.tech@yimbik.org',
    password: 'QualiCore@TechAdmin2026!',
    role: 'admin',
    sub_role: 'PLATFORM_ADMIN',
    display_name: 'Technical Platform Administrator'
  }
];

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function seedAdmins() {
  console.log('=== QUALICORE PLATFORM SUPER ADMIN SEEDING ===\n');

  for (const admin of PLATFORM_ADMINS) {
    const hashed = await hashPassword(admin.password);

    await new Promise((resolve, reject) => {
      // Check if user already exists
      db.get('SELECT id, email, role, sub_role FROM users WHERE email = ?', [admin.email], (err, existing) => {
        if (err) return reject(err);

        if (existing) {
          // Update sub_role if it's missing
          db.run(
            'UPDATE users SET sub_role = ?, password = ?, is_verified = 1 WHERE email = ?',
            [admin.sub_role, hashed, admin.email],
            function(err2) {
              if (err2) return reject(err2);
              console.log(`✅ UPDATED: ${admin.email}`);
              console.log(`   Role: ${existing.role} | Sub-Role: ${admin.sub_role}`);
              console.log(`   Display: ${admin.display_name}`);
              console.log(`   Password reset to: ${admin.password}\n`);
              resolve();
            }
          );
        } else {
          // Create new platform admin
          db.run(
            `INSERT INTO users (email, password, role, sub_role, is_verified, created_at)
             VALUES (?, ?, ?, ?, 1, datetime('now'))`,
            [admin.email, hashed, admin.role, admin.sub_role],
            function(err2) {
              if (err2) return reject(err2);
              console.log(`✅ CREATED: ${admin.email} (ID: ${this.lastID})`);
              console.log(`   Role: ${admin.role} | Sub-Role: ${admin.sub_role}`);
              console.log(`   Display: ${admin.display_name}`);
              console.log(`   Password: ${admin.password}\n`);
              resolve();
            }
          );
        }
      });
    });
  }

  // Verify final state
  await new Promise((resolve) => {
    db.all("SELECT id, email, role, sub_role, is_verified FROM users WHERE role = 'admin' ORDER BY id", (err, rows) => {
      console.log('=== PLATFORM ADMIN ACCOUNTS (FINAL STATE) ===');
      (rows || []).forEach(r => {
        console.log(`  ID=${r.id} | ${r.email}`);
        console.log(`         Role: ${r.role} | Sub-Role: ${r.sub_role || '(none)'} | Verified: ${r.is_verified}`);
      });
      resolve();
    });
  });

  console.log('\n=== SEEDING COMPLETE ===');
  console.log('These accounts have PLATFORM-LEVEL access only.');
  console.log('They are NOT linked to any laboratory or client organization.');
  db.close();
}

seedAdmins().catch(err => {
  console.error('Seeding failed:', err);
  db.close();
  process.exit(1);
});
