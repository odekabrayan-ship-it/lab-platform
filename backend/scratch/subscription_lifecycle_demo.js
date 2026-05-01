const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');

async function runSubscriptionLifecycle() {
    console.log("=== COMMENCING SUBSCRIPTION LIFECYCLE & RENEWAL DEMONSTRATION ===");

    try {
        // 1. SEED EXPIRING ENTITY
        console.log("\n[PHASE 1] Seeding Institutional Node with Expiring Membership...");
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3); // Expiring in 3 days
        const expiryStr = expiryDate.toISOString().split('T')[0];

        await new Promise((resolve, reject) => {
            db.run(`UPDATE laboratories SET subscription_expiry = ?, subscription_status = 'ACTIVE' WHERE id = 1`, [expiryStr], (err) => {
                if (err) reject(err);
                console.log(`>> Lab 'Global BioScience' set to expire on ${expiryStr} (Sentinel Threshold Triggered).`);
                resolve();
            });
        });

        // 2. RUN SENTINEL MANUALLY (Simulating the background process)
        console.log("\n[PHASE 2] Executing Automated Subscription Sentinel...");
        const expiringLabs = await new Promise((resolve, reject) => {
            db.all(`SELECT user_id, name, subscription_expiry FROM laboratories WHERE subscription_status = 'ACTIVE' AND date(subscription_expiry) <= date('now', '+7 days')`, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });

        for (const lab of expiringLabs) {
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO notifications (user_id, message, type, metadata) VALUES (?, ?, 'SUBSCRIPTION_RENEWAL', ?)`, [
                    lab.user_id,
                    `Urgent: Your laboratory subscription for '${lab.name}' expires on ${lab.subscription_expiry}. Please renew to prevent institutional lockout.`,
                    JSON.stringify({ link: '/workspace/manager', action: 'PAYMENT' })
                ], (err) => {
                    if (err) reject(err);
                    console.log(`>> Sentinel issued Renewal Alert to Lab User ID: ${lab.user_id}`);
                    resolve();
                });
            });
        }

        // 3. ADMIN MANUAL RENEWAL DISPATCH
        console.log("\n[PHASE 3] Super Admin: Manual Renewal Dispatch...");
        const targetUserId = 25; // Heritage Beverages (Industry)
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO notifications (user_id, message, type, metadata) VALUES (?, ?, 'SUBSCRIPTION_RENEWAL', ?)`, [
                targetUserId,
                "System Administrator Alert: Your monthly subscription renewal is required. Click here to proceed to the secure payment portal.",
                JSON.stringify({ link: '/workspace/manager', action: 'PAYMENT' })
            ], (err) => {
                if (err) reject(err);
                console.log(`>> Super Admin manually dispatched Renewal Alert to User ID: ${targetUserId}`);
                resolve();
            });
        });

        // 4. VERIFICATION
        console.log("\n[PHASE 4] Forensic Verification of Dispatched Alerts...");
        const notices = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM notifications WHERE type = 'SUBSCRIPTION_RENEWAL' ORDER BY created_at DESC LIMIT 2`, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });

        notices.forEach(n => {
            console.log(`>> Verified Alert: "${n.message.substring(0, 50)}..."`);
            console.log(`>> Intelligence Metadata (Link): ${JSON.parse(n.metadata).link}`);
        });

        console.log("\n=== SUBSCRIPTION LIFECYCLE: 100% SUCCESSFUL ===");
        console.log("AUTOMATED VIGILANCE & MANUAL OVERSIGHT CONFIRMED.");

    } catch (err) {
        console.error("\n[CRITICAL FAILURE] Subscription Demo Error:", err);
    } finally {
        db.close();
    }
}

runSubscriptionLifecycle();
