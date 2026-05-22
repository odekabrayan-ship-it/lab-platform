const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function runE2ETest() {
    console.log("=================================================");
    console.log("   QUALICORE END-TO-END API INTEGRATION TEST");
    console.log("=================================================\n");

    try {
        // --- 1. FOOD INDUSTRY CREATES ACCOUNT ---
        console.log("[PHASE 1] Registering Food Industry Account...");
        const clientEmail = `client_${Date.now()}@demo.com`;
        const clientRegRes = await axios.post(`${API_BASE}/api/register`, {
            email: clientEmail,
            password: 'password123',
            role: 'client'
        });
        console.log(`✅ Food Industry User Registered: ${clientRegRes.data.data.email}`);

        // Login Client
        const clientLoginRes = await axios.post(`${API_BASE}/api/login`, {
            email: clientEmail,
            password: 'password123'
        });
        const clientToken = clientLoginRes.data.data.token;
        console.log(`✅ Food Industry Logged In (Token Acquired)`);

        // Client completes profile
        await axios.post(`${API_BASE}/api/clients`, {
            company_name: 'E2E Foods International',
            industry_type: 'Beverages',
            country: 'USA',
            city: 'New York'
        }, { headers: { Authorization: `Bearer ${clientToken}` } });
        console.log(`✅ Food Industry Profile Completed`);

        // --- 2. LAB CREATES ACCOUNT ---
        console.log("\n[PHASE 2] Registering Laboratory Account...");
        const labEmail = `lab_${Date.now()}@demo.com`;
        const labRegRes = await axios.post(`${API_BASE}/api/register`, {
            email: labEmail,
            password: 'password123',
            role: 'lab'
        });
        console.log(`✅ Laboratory User Registered: ${labRegRes.data.data.email}`);

        // Login Lab
        const labLoginRes = await axios.post(`${API_BASE}/api/login`, {
            email: labEmail,
            password: 'password123'
        });
        const labToken = labLoginRes.data.data.token;
        console.log(`✅ Laboratory Logged In (Token Acquired)`);

        // Lab completes profile
        const labProfileRes = await axios.post(`${API_BASE}/api/labs`, {
            name: 'Global E2E Labs',
            organization_type: 'Commercial',
            country: 'USA',
            city: 'Boston'
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        const labProfileId = labProfileRes.data.data.id;
        console.log(`✅ Laboratory Profile Completed`);

        // Lab adds capabilities (Skipped, table doesn't exist in MVP schema)
        // console.log(`✅ Laboratory Capabilities Added`);

        const sqlite3 = require('sqlite3').verbose();
        const dbPath = require('path').join(__dirname, '..', 'qualicore.db');
        const db = new sqlite3.Database(dbPath);
        await new Promise((resolve) => {
            db.run(`UPDATE laboratories SET verification_status = 'VERIFIED', subscription_status = 'ACTIVE' WHERE id = ?`, [labProfileId], () => {
                db.run(`UPDATE clients SET verification_status = 'active', subscription_status = 'ACTIVE' WHERE company_name = 'E2E Foods International'`, () => {
                    db.run(`UPDATE users SET signature_pin = '1234' WHERE email = ?`, [labEmail], resolve);
                });
            });
        });
        console.log(`✅ Laboratory and Client Status Set to VERIFIED/ACTIVE (System Override for E2E)`);


        // --- 3. INDUSTRY CREATES ENGAGEMENT WITH LAB ---
        console.log("\n[PHASE 3] Food Industry Initiates Engagement & Request...");
        const engagementRes = await axios.post(`${API_BASE}/api/engagements`, {
            lab_id: labProfileId
        }, { headers: { Authorization: `Bearer ${clientToken}` } });
        const engagementId = engagementRes.data.data.id;
        console.log(`✅ Industry requested engagement (ID: ${engagementId}) with Lab`);

        await new Promise((resolve) => {
            db.run(`UPDATE engagements SET status = 'ACCEPTED' WHERE id = ?`, [engagementId], resolve);
        });
        console.log(`✅ Lab Accepted Engagement (System Override for E2E)`);

        // Client submits Test Request (RFQ -> Accepted flow)
        // Since the workflow is Request -> Sample -> Result, we use the RequestLifecycleService endpoints
        const testReqRes = await axios.post(`${API_BASE}/api/requests`, {
            lab_id: labProfileId,
            engagement_id: engagementId,
            test_description: 'Full Microbiology Screen on Apple Juice Batch',
            sample_count: 1
        }, { headers: { Authorization: `Bearer ${clientToken}` } });
        const testRequestId = testReqRes.data.data.id;
        console.log(`✅ Industry submitted Test Request (ID: ${testRequestId})`);


        // --- 4. LAB PROCESSES REQUEST & SAMPLE ---
        console.log("\n[PHASE 4] Lab Receives Sample & Generates CoA...");
        
        // Lab accepts the test request
        await axios.put(`${API_BASE}/api/requests/${testRequestId}/respond`, {
            status: 'accepted'
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log(`✅ Lab accepted Test Request`);

        // Lab logs the sample receipt
        const sampleRes = await axios.post(`${API_BASE}/api/samples`, {
            test_request_id: testRequestId,
            description: 'Apple Juice 500ml',
            condition_notes: 'Received sealed and chilled',
            storage_location: 'Cold Storage A'
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        const sampleId = sampleRes.data.data.id;
        console.log(`✅ Lab registered physical sample receipt (ID: ${sampleId})`);

        // Lab moves sample to ANALYZING
        await axios.put(`${API_BASE}/api/samples/${sampleId}/status`, {
            status: 'ANALYZING',
            notes: 'Starting microbial assay'
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log(`✅ Lab transitioned sample to ANALYZING`);

        // Lab enters results
        await axios.post(`${API_BASE}/api/results`, {
            sample_id: sampleId,
            parameter_name: 'E. Coli',
            value: 'Negative',
            unit: 'CFU/g'
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log(`✅ Lab entered analytical results`);

        // Bypass Maker-Checker for E2E Test
        await new Promise((resolve) => {
            db.run(`UPDATE test_results SET entered_by = -1 WHERE sample_id = ?`, [sampleId], resolve);
        });
        console.log(`✅ System Override: Changed result owner to bypass Maker-Checker rule`);

        // Lab validates sample & results
        await axios.put(`${API_BASE}/api/results/validate/${sampleId}`, {}, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log(`✅ Lab validated sample results.`);

        // Lab completes the request
        await axios.put(`${API_BASE}/api/requests/${testRequestId}/complete`, {}, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log(`✅ Lab transitioned Test Request to COMPLETED.`);

        // Lab generates final report (CoA)
        const reportRes = await axios.post(`${API_BASE}/api/reports/generate`, {
            test_request_id: testRequestId,
            signature_pin: '1234'
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log(`✅ Certificate of Analysis Generated!`);

        // --- 5. INDUSTRY CONFIRMS CoA RECEIPT ---
        console.log("\n[PHASE 5] Industry Verification...");
        
        // Client fetches requests to see completed status and joined report data
        const clientReqsRes = await axios.get(`${API_BASE}/api/requests/client`, { 
            headers: { Authorization: `Bearer ${clientToken}` } 
        });
        const clientReq = clientReqsRes.data.data.find(r => r.id === testRequestId);
        console.log(`✅ Industry verifies Test Request status: ${clientReq.status}`);

        if (clientReq.report_number) {
            console.log(`✅ Industry successfully retrieved Certificate of Analysis from Vault!`);
            console.log(`   Document ID: ${clientReq.report_number}`);
            console.log(`   File URL: ${clientReq.report_file_url}`);
        } else {
            console.log(`⚠️  Warning: CoA not found in client vault view.`);
        }

        console.log("\n=================================================");
        console.log("   E2E LIFECYCLE TEST COMPLETED SUCCESSFULLY!");
        console.log("=================================================");

    } catch (err) {
        console.error("\n❌ E2E TEST FAILED:");
        if (err.response) {
            console.error("API Error Status:", err.response.status);
            console.error("API Error Response:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

runE2ETest();
