const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../qualicore.db'));

const NEW_ADMINS = [
  { email: 'odekabrayan@gmail.com', password: 'QualiCore@Director2026!', sub_role: 'SUPER_ADMIN' },
  { email: 'booodeka13@gmail.com',  password: 'QualiCore@Director2026!', sub_role: 'SUPER_ADMIN' },
];

async function run() {
  console.log('=== ADDING NEW SUPER ADMINS ===\n');

  for (const admin of NEW_ADMINS) {
    const hashed = await bcrypt.hash(admin.password, 12);

    await new Promise((resolve, reject) => {
      db.get('SELECT id, email, role, sub_role FROM users WHERE email = ?', [admin.email], (err, existing) => {
        if (err) return reject(err);

        if (existing) {
          // Already exists — ensure role and sub_role are correct
          db.run(
            'UPDATE users SET role = ?, sub_role = ?, password = ?, is_verified = 1 WHERE email = ?',
            ['admin', admin.sub_role, hashed, admin.email],
            function(err2) {
              if (err2) return reject(err2);
              console.log(`✅ UPDATED (was already present): ${admin.email}`);
              console.log(`   ID=${existing.id} | role=admin | sub_role=${admin.sub_role} | password reset\n`);
              resolve();
            }
          );
        } else {
          // Create fresh
          db.run(
            `INSERT INTO users (email, password, role, sub_role, is_verified, created_at)
             VALUES (?, ?, 'admin', ?, 1, datetime('now'))`,
            [admin.email, hashed, admin.sub_role],
            function(err2) {
              if (err2) return reject(err2);
              console.log(`✅ CREATED: ${admin.email} (ID: ${this.lastID})`);
              console.log(`   role=admin | sub_role=${admin.sub_role}\n`);
              resolve();
            }
          );
        }
      });
    });
  }

  // Final confirmation — list all SUPER_ADMINs
  await new Promise((resolve) => {
    db.all(
      "SELECT id, email, role, sub_role, is_verified FROM users WHERE role = 'admin' ORDER BY id",
      [],
      (err, rows) => {
        console.log('=== ALL PLATFORM ADMIN ACCOUNTS ===');
        (rows || []).forEach(r => {
          const badge = r.sub_role === 'SUPER_ADMIN' ? '👑 SUPER_ADMIN' : `⚙️  ${r.sub_role || 'NO SUB-ROLE'}`;
          console.log(`  ID=${r.id} | ${badge} | active=${r.is_verified} | ${r.email}`);
        });
        resolve();
      }
    );
  });

  db.close();
  console.log('\nDone.');
}

run().catch(err => { console.error(err); db.close(); process.exit(1); });
