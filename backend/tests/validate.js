const axios = require('axios');
const db = require('../database');
const assert = require('assert');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('--- QUALICORE FUNCTIONAL VALIDATION START ---');
    try {
        // Wait for server to be up
        await new Promise(r => setTimeout(r, 1000));

        // 0. Register and Login to get Token
        let token;
        try {
            const reg = await axios.post(`${API_URL}/register`, { email: 'admin_test@qualicore.com', password: 'test', role: 'admin' });
            const login = await axios.post(`${API_URL}/login`, { email: 'admin_test@qualicore.com', password: 'test' });
            token = login.data.data.token;
        } catch (e) {
            // Might already exist
            const login = await axios.post(`${API_URL}/login`, { email: 'admin_test@qualicore.com', password: 'test' });
            token = login.data.data.token;
        }

        const headers = { Authorization: `Bearer ${token}` };

        console.log('1. Testing Foreign Key Enforcement (DB Level)');
        // Try inserting an orphaned sample
        const orphanedSampleRes = await axios.post(`${API_URL}/samples`, { test_request_id: 99999, sample_code: 'ORPHAN-001' }, { headers, validateStatus: () => true });
        assert.strictEqual(orphanedSampleRes.data.success, false);
        assert.ok(orphanedSampleRes.data.message.includes('FOREIGN KEY constraint failed') || orphanedSampleRes.data.message.includes('Test request not found'));
        console.log('✔ Foreign Key / Orphan rejection verified.');

        console.log('2. Testing API State Blocking (Lifecycle Rules)');
        
        // Create Lab & Client
        const labRes = await axios.post(`${API_URL}/labs`, { name: 'Test Lab', email: `testlab_${Date.now()}@test.com` }, { headers });
        const clientRes = await axios.post(`${API_URL}/clients`, { company_name: 'Test Client', email: `testclient_${Date.now()}@test.com` }, { headers });
        
        // Create Request (Pending)
        const reqRes = await axios.post(`${API_URL}/requests`, { client_id: clientRes.data.data.id, lab_id: labRes.data.data.id }, { headers });
        const reqId = reqRes.data.data.id;
        
        // Attempt Report Generation on Pending (Should block)
        const earlyReport = await axios.post(`${API_URL}/reports/generate`, { test_request_id: reqId }, { headers, validateStatus: () => true });
        assert.strictEqual(earlyReport.data.success, false);
        assert.strictEqual(earlyReport.data.message, 'Report can only be generated for completed requests');
        console.log('✔ Blocked early report generation verified.');

        console.log('3. Testing State Transitions & DB Parity');
        // Add Sample
        const sampleRes = await axios.post(`${API_URL}/samples`, { test_request_id: reqId, sample_code: `SMP-${Date.now()}` }, { headers });
        const sampleId = sampleRes.data.data.id;

        // Add Result (Should auto-transition request to 'in_progress')
        await axios.post(`${API_URL}/results`, { sample_id: sampleId, parameter: 'pH', value: '7.2', unit: '', status: 'valid' }, { headers });
        
        // Check DB state directly to ensure parity
        db.get('SELECT status FROM test_requests WHERE id = ?', [reqId], (err, row) => {
            assert.strictEqual(row.status, 'in_progress');
            console.log('✔ Auto state transition to in_progress verified via direct DB read.');
            
            console.log('--- ALL FUNCTIONAL VALIDATIONS PASSED ---');
            process.exit(0);
        });

    } catch (err) {
        console.error('❌ Validation Failed:', err.message || err);
        process.exit(1);
    }
}

runTests();
