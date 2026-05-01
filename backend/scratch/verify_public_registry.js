const publicDb = require('../public_database');

async function verify() {
    try {
        console.log("Verifying Sovereign Registry Integrity...");
        
        const companies = await publicDb.dbAll(`SELECT id, name, industry, trust_status FROM public_companies`, []);
        console.log("\n--- VERIFIED COMPANIES ---");
        console.table(companies);

        const brands = await publicDb.dbAll(`
            SELECT b.id, b.name, b.category, b.trust_badge, c.name as company_name 
            FROM public_brands b
            JOIN public_companies c ON b.company_id = c.id
        `, []);
        console.log("\n--- VERIFIED BRANDS ---");
        console.table(brands);

        process.exit(0);
    } catch (e) {
        console.error("Verification Error:", e);
        process.exit(1);
    }
}

verify();
