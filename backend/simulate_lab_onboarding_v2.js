const { dbRun, dbGet } = require('./database');
const bcrypt = require('bcryptjs');

async function onboardNewLab() {
    console.log("INITIATING NEW LABORATORY ONBOARDING PROTOCOL...");

    try {
        const email = 'sovereign_diagnostics_v2@lab.com';
        const password = await bcrypt.hash('lab123', 10);
        
        // 1. Create User
        const userResult = await dbRun(
            "INSERT INTO users (email, password, role, is_verified) VALUES (?, ?, 'lab', 1)",
            [email, password]
        );
        const userId = userResult.lastID;
        console.log(`USER CREATED: ${email} (ID: ${userId})`);

        // 2. Create Laboratory Profile
        const labResult = await dbRun(
            `INSERT INTO laboratories (
                user_id, name, organization_type, country, city, address, 
                verification_status, specialization, turnaround_time
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)`,
            [
                userId, 
                'Sovereign Diagnostics V2', 
                'Commercial Testing Lab', 
                'Kenya', 
                'Nairobi', 
                'Science Park, Suite 402', 
                'Microbiology & Chemical Analysis', 
                '3-5 Days'
            ]
        );
        const labId = labResult.lastID;
        console.log(`LAB PROFILE CREATED: Sovereign Diagnostics V2 (ID: ${labId})`);

        // 3. Simulate Daily Operations (Daily Workflow Simulation)
        console.log("SIMULATING DAILY OPERATIONS...");

        // A. Create an Engagement (Client hiring the lab)
        // We'll use client_id 1 (Pure Beverage Co.)
        const engagementResult = await dbRun(
            "INSERT INTO engagements (client_id, lab_id, status, sla_tat) VALUES (?, ?, 'ACCEPTED', '3 Days')",
            [1, labId]
        );
        const engagementId = engagementResult.lastID;
        console.log(`ENGAGEMENT ACCEPTED: Pure Beverage Co. (ID: ${engagementId})`);

        // B. Create a Test Request
        const trResult = await dbRun(
            `INSERT INTO test_requests (
                client_id, lab_id, engagement_id, test_description, batch_number, status
            ) VALUES (?, ?, ?, ?, ?, 'received')`,
            [1, labId, engagementId, 'Comprehensive Safety Audit for Nutritional Staples', 'MF-2026-001']
        );
        const trId = trResult.lastID;
        console.log(`TEST REQUEST CREATED: ID ${trId}`);

        // C. Receive a Sample
        const sampleResult = await dbRun(
            `INSERT INTO samples (
                test_request_id, sample_code, description, received_by, status
            ) VALUES (?, ?, ?, ?, 'IN_CUSTODY')`,
            [trId, `SD-SAMP-${Date.now()}`, 'Maize Flour Batch-99 (Composite Sample)', userId]
        );
        const sampleId = sampleResult.lastID;
        console.log(`SAMPLE RECEIVED: ID ${sampleId}`);

        // D. Record Test Results
        const resultResult = await dbRun(
            `INSERT INTO test_results (
                sample_id, parameter_name, value, unit, method_reference, pass_fail, entered_by, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'validated')`,
            [sampleId, 'Aflatoxin Content', '1.2', 'ppb', 'HPLC-FLD', 'PASS', userId]
        );
        const resultId = resultResult.lastID;
        console.log(`TEST RESULT RECORDED: ID ${resultId}`);

        // E. Update Sample Status
        await dbRun("UPDATE samples SET status = 'CERTIFIED' WHERE id = ?", [sampleId]);
        console.log("DAILY OPERATIONS: Cycle Complete. Report Ready for Certification.");

    } catch (err) {
        console.error("ONBOARDING FAILURE:", err.message);
    }
}

onboardNewLab();
