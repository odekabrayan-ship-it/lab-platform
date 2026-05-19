const publicDb = require('../public_database');

class VigilanceEngine {
    constructor() {
        this.checkInterval = 1000 * 60 * 30; // Check every 30 minutes
        this.timer = null;
    }

    start() {
        console.log("Vigilance Intelligence Engine: ACTIVE");
        this.runAudit();
        this.timer = setInterval(() => this.runAudit(), this.checkInterval);
    }

    async runAudit() {
        try {
            console.log("Vigilance Engine: Running Herd Intelligence Audit...");

            // 1. SAFETY TRIGGER: Check for spikes (>5 reports in 72h)
            const spikes = await publicDb.dbAll(`
                SELECT brand_id, COUNT(*) as report_count
                FROM public_adverse_events
                WHERE created_at > datetime('now', '-3 days')
                GROUP BY brand_id
                HAVING COUNT(*) >= 5
            `);

            for (const spike of spikes) {
                const brand = await publicDb.dbGet(`SELECT name FROM public_brands WHERE id = ?`, [spike.brand_id]);
                console.log(`🚨 ALERT: Brand [${brand.name}] exceeded safety threshold with ${spike.report_count} signals in 72h.`);
                
                await publicDb.dbRun(`
                    UPDATE public_brands 
                    SET vigilance_status = 'UNDER_REVIEW'
                    WHERE id = ? AND vigilance_status != 'UNDER_REVIEW'
                `, [spike.brand_id]);

                console.log(`[MOCK NOTIFICATION] To: quality@${brand.name.toLowerCase().replace(/\s/g, '')}.com`);
                console.log(`Subject: IMMEDIATE ACTION REQUIRED: Safety Threshold Exceeded`);
                console.log(`Message: Your brand has been automatically flagged for 'Under Vigilance Review' due to a spike in consumer adverse effect reports. You have 48 hours to provide a formal response or batch testing data.`);
                console.log("--------------------------------------------------");
            }

            // 2. RESOLUTION RATE: Calculate for each brand
            const brands = await publicDb.dbAll(`SELECT id FROM public_brands`);
            for (const b of brands) {
                const stats = await publicDb.dbGet(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved
                    FROM public_adverse_events
                    WHERE brand_id = ?
                `, [b.id]);

                if (stats.total > 0) {
                    const rate = Math.round((stats.resolved / stats.total) * 100);
                    await publicDb.dbRun(`UPDATE public_brands SET resolution_rate = ? WHERE id = ?`, [rate, b.id]);
                } else {
                    await publicDb.dbRun(`UPDATE public_brands SET resolution_rate = 100 WHERE id = ?`, [b.id]);
                }
            }

        } catch (err) {
            console.error("Vigilance Engine Error:", err);
        }
    }
}

module.exports = new VigilanceEngine();
