const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');

async function runVigilanceLifecycle() {
    console.log("=== COMMENCING CONSUMER TRUST & VIGILANCE DEMONSTRATION ===");

    try {
        // 1. ADMIN BRAND REGISTRATION
        console.log("\n[PHASE 1] Admin: Registering Trusted Brand...");
        const brandId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO trust_brands (company_id, name, category, trust_badge, brand_description) VALUES (1, 'Stellar Dairy', 'Dairy & Poultry', 'Premium Gold Seal', 'High-purity dairy products from verified highlands.')`, function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Brand 'Stellar Dairy' registered in Consumer Registry. ID: ${brandId}`);

        // 2. PUBLIC VIGILANCE REPORTING
        console.log("\n[PHASE 2] Public: Submitting Vigilance Report...");
        const reportId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO vigilance_reports (brand_name, batch_number, symptom_type, description, severity) VALUES (?, ?, ?, ?, ?)`, 
                ['Stellar Gold Milk', 'BN-2026-X99', 'Physical Degradation', 'The product (Gold Milk) appeared curdled and destroyed upon opening, despite the expiry date being 6 months away (Oct 2026). Packaging was intact.', 'HIGH'], function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Public Consumer submitted Vigilance Report: ID ${reportId} (Severity: HIGH)`);

        // 3. ADMIN OVERSIGHT
        console.log("\n[PHASE 3] Admin: Verifying Vigilance Signal...");
        const report = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM vigilance_reports WHERE id = ?`, [reportId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (report) {
            console.log(`>> Sovereign Vigilance Monitor triggered for Brand: ${report.brand_name}`);
            console.log(`>> Signal Intelligence: ${report.description}`);
            console.log(">> Action: Initiating forensic batch investigation...");
        }

        console.log("\n=== VIGILANCE LIFECYCLE: 100% SUCCESSFUL ===");
        console.log("ALL PUBLIC SAFETY SIGNALS ARCHIVED IN SOVEREIGN REGISTRY.");

    } catch (err) {
        console.error("\n[CRITICAL FAILURE] Vigilance Demo Error:", err);
    } finally {
        db.close();
    }
}

runVigilanceLifecycle();
