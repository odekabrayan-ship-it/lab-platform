const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');
const bcrypt = require('bcryptjs');

async function onboardNewLab() {
    console.log("--- INITIATING LABORATORY ONBOARDING PROTOCOL ---");
    const email = 'new_lab_audit@demo.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 1. Create User
            db.run(`INSERT INTO users (email, password, role) VALUES (?, ?, 'lab')`, [email, hashedPassword], function(err) {
                if (err) return reject(err);
                const userId = this.lastID;
                console.log(`[SUCCESS] User Account Created: ID ${userId}`);

                // 2. Create Laboratory Profile
                db.run(`
                    INSERT INTO laboratories (
                        user_id, name, organization_type, country, city, 
                        accreditation_status, accreditation_number, verification_status,
                        specialization, scope_description
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)
                `, [
                    userId, 
                    'Aero-Metrix Precision Labs', 
                    'Private Sector', 
                    'United Kingdom', 
                    'Manchester',
                    'ISO/IEC 17025:2017',
                    'UKAS-88902-L',
                    'Aeronautical Chemical Testing',
                    'High-precision analytical chemistry for aerospace components.'
                ], function(err2) {
                    if (err2) return reject(err2);
                    console.log(`[SUCCESS] Lab Profile Created & Submitted for Review.`);
                    resolve();
                });
            });
        });
    });
}

onboardNewLab().then(() => {
    console.log("--- ONBOARDING COMPLETE: AWAITING SOVEREIGN AUDIT ---");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
