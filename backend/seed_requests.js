const db = require('./database');
async function seed() {
    try {
        const labs = await db.dbAll("SELECT id FROM laboratories");
        const clients = await db.dbAll("SELECT id FROM clients");
        
        if (labs.length === 0 || clients.length === 0) {
            console.log("No labs or clients found. Seed them first.");
            return;
        }

        const labId = labs[0].id;
        const clientId = clients[0].id;

        // Seed engagement with valid status
        const engagementRes = await db.dbRun(
            `INSERT OR IGNORE INTO engagements (client_id, lab_id, status) VALUES (?, ?, 'ACCEPTED')`,
            [clientId, labId]
        );
        
        // Find the engagement ID (since we used INSERT OR IGNORE)
        const engagement = await db.dbGet(`SELECT id FROM engagements WHERE client_id = ? AND lab_id = ?`, [clientId, labId]);
        const engagementId = engagement.id;

        await db.dbRun(
            `INSERT OR IGNORE INTO test_requests (id, client_id, lab_id, engagement_id, status, test_description) 
             VALUES (1, ?, ?, ?, 'accepted', 'Professional Water Quality Analysis')`,
            [clientId, labId, engagementId]
        );
        console.log("Test request #1 seeded and accepted.");
    } catch (e) {
        console.error(e);
    }
}
seed();
