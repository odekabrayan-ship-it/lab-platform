const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('public_trust.db');

db.serialize(() => {
    console.log("Seeding Registry with High-Integrity Sample Data...");
    
    // Clear existing to avoid duplicates during dev
    db.run(`DELETE FROM public_brands`);
    
    const brands = [
        {
            company_id: 1,
            name: 'PureVital Skincare',
            category: 'Personal Care',
            trust_badge: 'PREMIUM',
            description: 'Advanced dermatological formulations with documented safety profiles.',
            count: 5420,
            rate: 99,
            status: 'STABLE'
        },
        {
            company_id: 2,
            name: 'OptiFuel Nutrition',
            category: 'Food & Beverage',
            trust_badge: 'FEATURED',
            description: 'Bio-available protein systems for high-performance athletes.',
            count: 3210,
            rate: 100,
            status: 'STABLE'
        },
        {
            company_id: 1,
            name: 'DermaGuard Antiseptic',
            category: 'Personal Care',
            trust_badge: 'STANDARD',
            description: 'Hospital-grade hygiene solutions for residential use.',
            count: 1850,
            rate: 95,
            status: 'UNDER_REVIEW'
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO public_brands (company_id, name, category, trust_badge, brand_description, visibility_status, trust_count, resolution_rate, vigilance_status)
        VALUES (?, ?, ?, ?, ?, 'PUBLISHED', ?, ?, ?)
    `);

    brands.forEach(b => {
        stmt.run(b.company_id, b.name, b.category, b.trust_badge, b.description, b.count, b.rate, b.status);
    });

    stmt.finalize();
    console.log("Seed complete.");
});

db.close();
