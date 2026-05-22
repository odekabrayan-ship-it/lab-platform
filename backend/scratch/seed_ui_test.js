const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./qualicore.db');

const API_BASE = 'http://localhost:3000';

async function runSeed() {
    try {
        const clientEmail = `client_${Date.now()}@demo.com`;
        await axios.post(`${API_BASE}/api/register`, { email: clientEmail, password: 'password123', role: 'client' });
        const clientToken = (await axios.post(`${API_BASE}/api/login`, { email: clientEmail, password: 'password123' })).data.data.token;
        await axios.post(`${API_BASE}/api/clients`, { company_name: 'UI Test Client', industry_type: 'Testing', country: 'USA', city: 'NY' }, { headers: { Authorization: `Bearer ${clientToken}` } });

        const labEmail = `lab_${Date.now()}@demo.com`;
        const labReg = await axios.post(`${API_BASE}/api/register`, { email: labEmail, password: 'password123', role: 'lab' });
        const labUserId = labReg.data.data.id;
        const labToken = (await axios.post(`${API_BASE}/api/login`, { email: labEmail, password: 'password123' })).data.data.token;

        await axios.post(`${API_BASE}/api/labs`, { name: 'UI Test Lab', accreditation_status: 'ISO 17025', country: 'USA', city: 'NY', signature_pin: '1234' }, { headers: { Authorization: `Bearer ${labToken}` } });
        
        const labRes = await axios.get(`${API_BASE}/api/labs/me`, { headers: { Authorization: `Bearer ${labToken}` } });
        const labProfileId = labRes.data.data.id;

        await new Promise((resolve) => db.run(`UPDATE laboratories SET verification_status = 'VERIFIED' WHERE id = ?`, [labProfileId], resolve));
        await new Promise((resolve) => db.run(`UPDATE users SET sub_role = 'LAB_MANAGER' WHERE id = ?`, [labUserId], resolve));
        await new Promise((resolve) => db.run(`UPDATE clients SET verification_status = 'active' WHERE company_name = 'UI Test Client'`, [], resolve));

        const engagementRes = await axios.post(`${API_BASE}/api/engagements`, { lab_id: labProfileId }, { headers: { Authorization: `Bearer ${clientToken}` } });
        const engagementId = engagementRes.data.data.id;
        await new Promise((resolve) => db.run(`UPDATE engagements SET status = 'ACCEPTED' WHERE id = ?`, [engagementId], resolve));

        await axios.post(`${API_BASE}/api/requests`, { lab_id: labProfileId, engagement_id: engagementId, test_description: 'UI E2E Demo Request', sample_count: 1 }, { headers: { Authorization: `Bearer ${clientToken}` } });

        console.log("=========================================");
        console.log("✅ Seed Complete!");
        console.log("Lab Login:");
        console.log(`Email: ${labEmail}`);
        console.log(`Password: password123`);
        console.log("=========================================");
        process.exit(0);
    } catch (e) {
        console.error(e.response?.data || e);
        process.exit(1);
    }
}
runSeed();
