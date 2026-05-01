const publicDb = require('../public_database');

class TrustRecertificationService {
    constructor() {
        this.checkInterval = 1000 * 60 * 60; // Check every hour
        this.timer = null;
    }

    start() {
        console.log("Trust Recertification Engine: ACTIVE");
        this.runCheck();
        this.timer = setInterval(() => this.runCheck(), this.checkInterval);
    }

    async runCheck() {
        try {
            console.log("Trust Engine: Running Expiry Audit...");

            // 1. Mark expired companies
            const expiredResult = await publicDb.dbRun(`
                UPDATE public_companies 
                SET trust_status = 'EXPIRED'
                WHERE trust_expiry < date('now') 
                AND trust_status != 'EXPIRED'
            `);
            
            if (expiredResult.changes > 0) {
                console.log(`Trust Engine: ${expiredResult.changes} companies have EXPIRED.`);
            }

            // 2. Identify companies expiring in 30 days for "Mock Email"
            const expiringSoon = await publicDb.dbAll(`
                SELECT id, name, trust_expiry 
                FROM public_companies 
                WHERE trust_expiry BETWEEN date('now') AND date('now', '+30 days')
                AND trust_status = 'VERIFIED'
            `);

            expiringSoon.forEach(company => {
                console.log(`[MOCK EMAIL] To: admin@${company.name.toLowerCase().replace(/\s/g, '')}.com`);
                console.log(`Subject: QualiCore Trust Renewal Required for ${company.name}`);
                console.log(`Message: Your trust verification is set to expire on ${company.trust_expiry}. Please submit renewal documentation to maintain your registry status.`);
                console.log("--------------------------------------------------");
            });

            // 3. Auto-update status to 'AWAITING_UPDATE' if within 14 days
            const awaitingUpdate = await publicDb.dbRun(`
                UPDATE public_companies 
                SET trust_status = 'AWAITING_UPDATE'
                WHERE trust_expiry BETWEEN date('now') AND date('now', '+14 days')
                AND trust_status = 'VERIFIED'
            `);

            if (awaitingUpdate.changes > 0) {
                console.log(`Trust Engine: ${awaitingUpdate.changes} companies moved to AWAITING_UPDATE.`);
            }

        } catch (err) {
            console.error("Trust Engine Error:", err);
        }
    }

    async recertifyCompany(id, months = 12) {
        await publicDb.dbRun(`
            UPDATE public_companies 
            SET trust_expiry = date('now', '+${months} months'),
                last_recertified_at = CURRENT_TIMESTAMP,
                trust_status = 'VERIFIED'
            WHERE id = ?
        `, [id]);
        return { success: true, next_expiry: `+${months} months` };
    }
}

module.exports = new TrustRecertificationService();
