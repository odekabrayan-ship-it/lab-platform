const TrustSnapshotService = require('./services/TrustSnapshotService');
const privateDb = require('./database');

async function syncAll() {
    console.log("Starting initial sync to Public Trust Portal...");
    
    try {
        const labs = await privateDb.dbAll(`SELECT id FROM laboratories`, []);
        console.log(`Syncing ${labs.length} laboratories...`);
        for (const l of labs) {
            await TrustSnapshotService.syncLaboratory(l.id);
        }

        const clients = await privateDb.dbAll(`SELECT id FROM clients`, []);
        console.log(`Syncing ${clients.length} companies...`);
        for (const c of clients) {
            await TrustSnapshotService.syncCompany(c.id);
        }

        const reports = await privateDb.dbAll(`SELECT id FROM reports`, []);
        console.log(`Syncing ${reports.length} reports...`);
        for (const r of reports) {
            await TrustSnapshotService.syncReport(r.id);
        }

        await TrustSnapshotService.refreshGlobalStats();
        console.log("Initial sync completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Sync failed:", err);
        process.exit(1);
    }
}

syncAll();
