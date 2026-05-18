const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');
const SampleService = require('c:/lab-platform/backend/services/sampleService');

async function runEcosystemLifecycle() {
    console.log("=== COMMENCING GLOBAL ECOSYSTEM LIFECYCLE DEMONSTRATION ===");

    try {
        // 1. INDUSTRY ONBOARDING & APPROVAL
        console.log("\n[PHASE 1] Industry Onboarding & Sovereign Approval...");
        const industryUserId = 25; // company@demo.com from previous turns
        await new Promise((resolve, reject) => {
            db.run(`UPDATE clients SET verification_status = 'active' WHERE user_id = ?`, [industryUserId], (err) => {
                if (err) reject(err);
                console.log(">> Industry Node 'Heritage Beverages' activated in Sovereign Registry.");
                resolve();
            });
        });

        // 2. SEARCH & RFQ
        console.log("\n[PHASE 2] Market Search & RFQ Submission...");
        const rfqId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO rfqs (company_id, title, description, sample_type, status) VALUES (1, 'National Beverage Quality Audit', 'Seeking ISO-17025 lab for seasonal beverage safety testing.', 'Carbonated Drinks', 'open')`, function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> RFQ Submitted by Industry: ID ${rfqId}`);

        // 3. LABORATORY QUOTATION (BID)
        console.log("\n[PHASE 3] Institutional Quotation (Lab Bid)...");
        const bidId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO bids (rfq_id, lab_id, price, turnaround_time, status) VALUES (?, 1, 450.00, '3 Days', 'pending')`, [rfqId], function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Laboratory 'Global BioScience' submitted Quotation: ID ${bidId} ($450.00)`);

        // 4. ACCEPTANCE & ENGAGEMENT
        console.log("\n[PHASE 4] Quotation Acceptance & Partnership Activation...");
        await new Promise((resolve, reject) => {
            db.run(`UPDATE bids SET status = 'accepted' WHERE id = ?`, [bidId], (err) => {
                if (err) reject(err);
                db.run(`INSERT OR IGNORE INTO engagements (client_id, lab_id, status) VALUES (1, 1, 'ACCEPTED')`, (err2) => {
                    if (err2) reject(err2);
                    console.log(">> Partnership established. Ledger synchronized.");
                    resolve();
                });
            });
        });

        // 5. TEST REQUEST & SAMPLE LIFECYCLE
        console.log("\n[PHASE 5] Analytical Lifecycle Initiation...");
        const trId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO test_requests (client_id, lab_id, engagement_id, test_description, status) VALUES (1, 1, 1, 'Beverage Safety Scan', 'accepted')`, function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Test Request #${trId} submitted by Industry.`);

        // Sample Registration
        const sample = await SampleService.registerSample({
            testRequestId: trId,
            description: 'Heritage Soda - Batch A1',
            conditionNotes: 'Cold Chain Maintained',
            receivedBy: 22, // registrar@demo.com
            storageLocation: 'Vault-B',
            sourceCompany: 'Heritage Beverages'
        });
        console.log(`>> Sample ${sample.sampleCode} received and logged in custody ledger.`);

        // Result Entry & CoA
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO test_results (sample_id, parameter_name, value, unit, status, entered_by) VALUES (?, 'Sugar Content', '10.5', '%', 'validated', 23)`, [sample.id], (err) => {
                if (err) reject(err);
                db.run(`UPDATE samples SET status = 'CERTIFIED' WHERE id = ?`, [sample.id], (err2) => {
                    if (err2) reject(err2);
                    const reportNo = `COA-2026-${trId}-${Math.floor(Math.random() * 1000)}`;
                    db.run(`INSERT INTO reports (test_request_id, generated_by, file_url, report_number, status) VALUES (?, 24, '/reports/COA_992.pdf', ?, 'generated')`, [trId, reportNo], (err3) => {
                        if (err3) reject(err3);
                        console.log(`>> Analytical Results Validated. Certificate of Analysis (${reportNo}) Released.`);
                        resolve();
                    });
                });
            });
        });

        // 6. DISPUTE RESOLUTION (COMPLAINT)
        console.log("\n[PHASE 6] Post-Analytical Oversight (Complaint Flow)...");
        const complaintId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO disputes (test_request_id, report_id, raised_by, dispute_type, description, status) VALUES (?, 1, ?, 'RESULT_CHALLENGE', 'Significant variance in sugar content vs internal production logs.', 'OPEN')`, [trId, industryUserId], function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
        console.log(`>> Industry lodged professional complaint (Dispute): ID ${complaintId} regarding CoA accuracy.`);

        // Resolution
        await new Promise((resolve, reject) => {
            db.run(`UPDATE disputes SET status = 'RESOLVED', resolution_notes = 'Re-calibration of refractometer performed. Batch re-tested. Variance within tolerance (0.2%). No further action required.', resolved_at = CURRENT_TIMESTAMP WHERE id = ?`, [complaintId], (err) => {
                if (err) reject(err);
                console.log(">> Laboratory resolved complaint with forensic re-testing evidence.");
                resolve();
            });
        });

        console.log("\n=== ECOSYSTEM LIFECYCLE: 100% SUCCESSFUL ===");
        console.log("ALL ACTIONS LOGGED IN SOVEREIGN AUDIT LEDGER.");

    } catch (err) {
        console.error("\n[CRITICAL FAILURE] Lifecycle Demo Error:", err);
    } finally {
        db.close();
    }
}

runEcosystemLifecycle();
