const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');
const bcrypt = require('bcryptjs');

const users = [
    { email: 'registrar@demo.com', password: 'password123', role: 'lab', sub_role: 'REGISTRAR' },
    { email: 'technician@demo.com', password: 'password123', role: 'lab', sub_role: 'TECHNICIAN' },
    { email: 'manager@demo.com', password: 'password123', role: 'lab', sub_role: 'LAB_MANAGER' },
    { email: 'company@demo.com', password: 'password123', role: 'client', sub_role: null },
    { email: 'pro@demo.com', password: 'password123', role: 'professional', sub_role: null }
];

async function createUsers() {
    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        db.run(
            `INSERT OR REPLACE INTO users (email, password, role, sub_role) VALUES (?, ?, ?, ?)`,
            [user.email, hashedPassword, user.role, user.sub_role],
            (err) => {
                if (err) console.error(`Failed to create ${user.email}`, err);
                else console.log(`Created ${user.email} (${user.role}/${user.sub_role})`);
            }
        );
    }
}

createUsers();
