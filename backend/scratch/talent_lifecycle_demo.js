const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');
const bcrypt = require('bcryptjs');

async function runTalentLifecycle() {
    console.log("=== COMMENCING TALENT ACQUISITION & ACCREDITATION DEMONSTRATION ===");

    try {
        // 1. PROFESSIONAL ONBOARDING
        console.log("\n[PHASE 1] Professional Onboarding & Profile Submission...");
        const email = 'pro_specialist_v5@demo.com';
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const proUserId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO users (email, password, role) VALUES (?, ?, 'professional')`, [email, hashedPassword], function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });

        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO professionals (user_id, full_name, specialty, certification_status) VALUES (?, ?, ?, ?)`, 
                [proUserId, 'Dr. Aris Thorne', 'Microbiology & Pathology', 'pending_review'], (err) => {
                if (err) reject(err);
                console.log(`>> Professional Node 'Dr. Aris Thorne' created. Status: PENDING_REVIEW`);
                resolve();
            });
        });

        // 2. LABORATORY HR BROADCAST
        console.log("\n[PHASE 2] Institutional HR Broadcast (Job Opening)...");
        const jobId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO broadcast_messages (sender_id, subject, content, type, expires_at) VALUES (21, 'Senior Microbiologist (Urgent)', 'Expert required for ISO-17025 method validation.', 'URGENT', date('now', '+30 days'))`, function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Lab 'Global BioScience' broadcasted job opening: ID ${jobId}`);

        // 3. SOVEREIGN ACCREDITATION
        console.log("\n[PHASE 3] Sovereign Accreditation Audit...");
        await new Promise((resolve, reject) => {
            db.run(`UPDATE professionals SET certification_status = 'approved', specialty_badge = 'Certified Senior Expert' WHERE user_id = ?`, [proUserId], (err) => {
                if (err) reject(err);
                console.log(">> Authority Audit Complete: Expert badged as 'Certified Senior Expert'.");
                resolve();
            });
        });

        // 4. MARKETPLACE APPLICATION
        console.log("\n[PHASE 4] Marketplace Interaction & Application...");
        const proId = await new Promise((resolve, reject) => {
            db.get(`SELECT id FROM professionals WHERE user_id = ?`, [proUserId], (err, row) => {
                if (err) reject(err);
                resolve(row.id);
            });
        });

        const appId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO broadcast_applications (broadcast_id, professional_id, status) VALUES (?, ?, 'PENDING')`, [jobId, proId], function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Specialist applied for Job ${jobId}. Ledger synchronized.`);

        // 5. HIRING
        console.log("\n[PHASE 5] Institutional Hiring...");
        await new Promise((resolve, reject) => {
            db.run(`UPDATE broadcast_applications SET status = 'HIRED' WHERE id = ?`, [appId], (err) => {
                if (err) reject(err);
                console.log(">> Specialist officially HIRED by Global BioScience.");
                resolve();
            });
        });

        console.log("\n=== TALENT LIFECYCLE: 100% SUCCESSFUL ===");
        console.log("ALL HUMAN CAPITAL TRANSITIONS LOGGED IN SOVEREIGN LEDGER.");

    } catch (err) {
        console.error("\n[CRITICAL FAILURE] Talent Demo Error:", err);
    } finally {
        db.close();
    }
}

runTalentLifecycle();
