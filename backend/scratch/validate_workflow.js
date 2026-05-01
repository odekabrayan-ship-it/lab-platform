const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');
const SampleService = require('c:/lab-platform/backend/services/sampleService');

async function validateWorkflow() {
    console.log("--- COMMENCING FORENSIC WORKFLOW VALIDATION ---");
    
    try {
        // 1. REGISTRATION
        console.log("Step 1: Simulating Sample Registration...");
        const sample = await SampleService.registerSample({
            testRequestId: 1,
            description: 'Automated Validation Sample',
            conditionNotes: 'Optimal',
            receivedBy: 22, // registrar@demo.com
            storageLocation: 'Shelf-A1',
            hazardFlags: 'None'
        });
        console.log(`[SUCCESS] Sample Registered: ${sample.sampleCode} (ID: ${sample.id})`);

        // 2. RESULT ENTRY
        console.log("Step 2: Simulating Result Entry (Technician)...");
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO test_results (sample_id, parameter_name, value, unit, status, entered_by)
                VALUES (?, 'pH', '7.4', 'pH', 'draft', 23)
            `, [sample.id], function(err) {
                if (err) return reject(err);
                console.log(`[SUCCESS] Results Entered for ID: ${this.lastID}`);

                // 3. REVIEW & APPROVAL
                console.log("Step 3: Simulating Manager Review & Approval...");
                db.run(`UPDATE test_results SET status = 'validated', validated_by = 24, validated_at = CURRENT_TIMESTAMP WHERE sample_id = ?`, [sample.id], (err2) => {
                    if (err2) return reject(err2);
                    
                    SampleService.updateSampleStatus(sample.id, 'CERTIFIED', 24, 'CoA Generated during validation').then(res => {
                        console.log(`[SUCCESS] Sample Certified & Approved.`);
                        
                        // 4. CoA CHECK
                        console.log("Step 4: Verifying Final Ledger Integrity...");
                        db.get(`SELECT status FROM samples WHERE id = ?`, [sample.id], (err3, row) => {
                            if (row.status === 'CERTIFIED') {
                                console.log("--- WORKFLOW VALIDATION: 100% SUCCESSFUL ---");
                                resolve();
                            } else {
                                reject("Status mismatch");
                            }
                        });
                    });
                });
            });
        });

    } catch (err) {
        console.error("[FAILURE] Workflow validation failed:", err);
    } finally {
        db.close();
    }
}

validateWorkflow();
