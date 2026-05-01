const { dbRun, dbGet } = require('./database');
const bcrypt = require('bcryptjs');

async function onboardNewLab() {
    console.log("INITIATING NEW LABORATORY ONBOARDING PROTOCOL...");

    try {
        const email = 'sovereign_diagnostics@lab.com';
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
                'Sovereign Diagnostics Ltd', 
                'Commercial Testing Lab', 
                'Kenya', 
                'Nairobi', 
                'Science Park, Suite 402', 
                'Microbiology & Chemical Analysis', 
                '3-5 Days'
            ]
        );
        const labId = labResult.lastID;
        console.log(`LAB PROFILE CREATED: Sovereign Diagnostics (ID: ${labId})`);

        // 3. Simulate Daily Operations (Daily Workflow Simulation)
        console.log("SIMULATING DAILY OPERATIONS...");

        // A. Create an Engagement (Client hiring the lab)
        // We'll use client_id 1 (Pure Beverage Co.)
        await dbRun(
            "INSERT INTO engagements (client_id, lab_id, status, sla_tat) VALUES (?, ?, 'ACCEPTED', '3 Days')",
            [1, labId]
        );
        console.log("ENGAGEMENT ACCEPTED: Pure Beverage Co.");

        // B. Receive a Sample
        const sampleResult = await dbRun(
            `INSERT INTO samples (
                lab_id, client_id, sample_name, sample_type, batch_number, 
                sampling_date, status, storage_condition
            ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, 'RECEIVED', ?)`,
            [labId, 1, 'Maize Flour Batch-99', 'STAPLE_FOOD', 'MF-2026-001', 'Dry/Ambient']
        );
        const sampleId = sampleResult.lastID;
        console.log(`SAMPLE RECEIVED: Maize Flour Batch-99 (ID: ${sampleId})`);

        // C. Assign a Test
        const testResult = await dbRun(
            `INSERT INTO tests (
                sample_id, test_name, method, status, priority
            ) VALUES (?, ?, ?, 'IN_PROGRESS', 'HIGH')`,
            [sampleId, 'Aflatoxin Content', 'HPLC-FLD', 'HIGH']
        );
        const testId = testResult.lastID;
        console.log(`TEST ASSIGNED: Aflatoxin Content (ID: ${testId})`);

        // D. Record Results (Passing)
        await dbRun(
            `UPDATE tests SET 
                result_value = '1.2', 
                result_unit = 'ppb', 
                status = 'COMPLETED', 
                completed_at = CURRENT_TIMESTAMP,
                notes = 'Well within safety limits (< 10ppb).'
             WHERE id = ?`,
            [testId]
        );
        console.log("TEST COMPLETED: Results recorded.");

        // E. Update Sample Status
        await dbRun("UPDATE samples SET status = 'COMPLETED' WHERE id = ?", [sampleId]);
        console.log("DAILY OPERATIONS: Cycle Complete.");

    } catch (err) {
        console.error("ONBOARDING FAILURE:", err.message);
    }
}

onboardNewLab();
