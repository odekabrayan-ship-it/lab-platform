const privateDb = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log("Seeding Private System with demo data...");
    const hashedPassword = await bcrypt.hash('password123', 10);

    try {
        // 1. Create Admin
        const adminRes = await privateDb.dbRun(`INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)`, ['admin@qualicore.com', hashedPassword, 'admin']);
        
        // 2. Create Verified Labs
        const labs = [
            { email: 'global_bioscience@lab.com', name: 'Global BioScience Labs', country: 'Germany', city: 'Berlin', specialization: 'Microbiology', iso: 'ISO/IEC 17025:2017' },
            { email: 'apex_analytics@lab.com', name: 'Apex Analytics Group', country: 'USA', city: 'Boston', specialization: 'Chemical Analysis', iso: 'ISO/IEC 17025:2017' },
            { email: 'safefood_labs@lab.com', name: 'SafeFood Integrity Labs', country: 'Kenya', city: 'Nairobi', specialization: 'Food Safety', iso: 'ISO/IEC 17025:2017' }
        ];

        for (const l of labs) {
            const u = await privateDb.dbRun(`INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'lab')`, [l.email, hashedPassword]);
            if (u.lastID) {
                await privateDb.dbRun(`
                    INSERT INTO laboratories (user_id, name, country, city, specialization, accreditation_status, verification_status)
                    VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED')
                `, [u.lastID, l.name, l.country, l.city, l.specialization, l.iso]);
            }
        }

        // 3. Create Verified Companies
        const companies = [
            { email: 'pure_bev@client.com', name: 'Pure Beverage Co.', industry: 'Food & Beverage' },
            { email: 'health_care_corp@client.com', name: 'HealthCare Corp', industry: 'Pharmaceuticals' }
        ];

        for (const c of companies) {
            const u = await privateDb.dbRun(`INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'client')`, [c.email, hashedPassword]);
            if (u.lastID) {
                const clientRes = await privateDb.dbRun(`
                    INSERT INTO clients (user_id, company_name, industry_type, country, verification_status)
                    VALUES (?, ?, ?, 'Global', 'active')
                `, [u.lastID, c.name, c.industry]);
                const clientId = clientRes.lastID;

                // Seed Brands for this company
                const brands = [
                    { name: `${c.name.split(' ')[0]} Pure`, category: 'Healthy Living', trust_score: 95 },
                    { name: `${c.name.split(' ')[0]} Essential`, category: 'Premium Nutrition', trust_score: 92 }
                ];

                for (const b of brands) {
                    const brandId = Math.floor(Math.random() * 1000000);
                    await TrustSnapshotService.syncBrand(brandId, clientId, b);

                    // Seed a few verified batches for this brand
                    const batches = [
                        { name: `${b.name} Batch A`, batch_number: `B-${brandId}-001`, safety_grade: 'S1 (Platinum)', health_markers: ['Lead-Free', 'Pesticide-Free', 'Pure-Grade'], last_tested_at: new Date().toISOString() },
                        { name: `${b.name} Batch B`, batch_number: `B-${brandId}-002`, safety_grade: 'S2 (Verified)', health_markers: ['Organic', 'Bacterial-Free', 'WHO-Compliant'], last_tested_at: new Date().toISOString() }
                    ];

                    for (const batch of batches) {
                        const batchId = Math.floor(Math.random() * 1000000);
                        await TrustSnapshotService.syncProductBatch(batchId, brandId, batch);
                    }
                }
            }
        }

        console.log("Seeding completed.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seed();
