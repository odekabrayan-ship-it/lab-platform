const publicDb = require('./public_database');

async function seedStandaloneRegistry() {
    console.log("Seeding Standalone Consumer Trust Registry...");

    // DROP and RECREATE tables to ensure schema integrity
    await publicDb.dbRun(`DROP TABLE IF EXISTS public_products`);
    await publicDb.dbRun(`DROP TABLE IF EXISTS public_brands`);
    await publicDb.dbRun(`DROP TABLE IF EXISTS public_companies`);
    await publicDb.dbRun(`DROP TABLE IF EXISTS system_stats`);

    // Re-initialize schema (Wait for public_database to handle it or do it here)
    // For safety, we rely on the public_database.js exports which run immediately.
    // However, since we just dropped them, we should call the init logic if possible.
    // In this script, we'll just run the CREATE statements manually for speed.
    
    await publicDb.dbRun(`CREATE TABLE public_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT,
        country TEXT,
        trust_status TEXT DEFAULT 'PENDING',
        profile_summary TEXT,
        logo_url TEXT,
        compliance_claims TEXT,
        quality_practices TEXT,
        certifications_declared TEXT,
        verification_level INTEGER DEFAULT 1,
        featured_status INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await publicDb.dbRun(`CREATE TABLE public_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        trust_badge TEXT DEFAULT 'STANDARD',
        visibility_status TEXT DEFAULT 'PUBLISHED',
        brand_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES public_companies(id)
    )`);

    await publicDb.dbRun(`CREATE TABLE public_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        trust_label TEXT,
        public_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brand_id) REFERENCES public_brands(id)
    )`);

    await publicDb.dbRun(`CREATE TABLE system_stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 1. Companies
    const companies = [
        {
            name: "Global BioScience Corp",
            industry: "Food & Beverage",
            country: "Germany",
            profile_summary: "A leader in biotechnology and high-purity food production systems.",
            compliance_claims: "EU Regulatory Alignment, ISO 9001 Certified Facilities",
            quality_practices: "Multi-stage filtration, Cold-chain integrity monitoring",
            certifications_declared: "EU Organic, FairTrade",
            featured_status: 1
        },
        {
            name: "Apex Nutrition Group",
            industry: "Nutraceuticals",
            country: "USA",
            profile_summary: "Dedicated to premium dietary supplements and clinical-grade nutrition.",
            compliance_claims: "FDA cGMP Compliance, Third-party quality audits",
            quality_practices: "Raw material quarantine, Batch-specific traceability",
            certifications_declared: "Non-GMO Project Verified, NSF Certified",
            featured_status: 1
        }
    ];

    for (const c of companies) {
        const res = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, profile_summary, compliance_claims, quality_practices, certifications_declared, trust_status, featured_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
        `, [c.name, c.industry, c.country, c.profile_summary, c.compliance_claims, c.quality_practices, c.certifications_declared, c.featured_status]);
        
        const companyId = res.lastID;

        // 2. Brands
        const brands = [
            { name: `${c.name.split(' ')[0]} Pure`, category: "Healthy Living", trust_badge: "PREMIUM", description: "The flagship line for pure, unadulterated essentials." },
            { name: `${c.name.split(' ')[0]} Essential`, category: "Daily Nutrition", trust_badge: "STANDARD", description: "Accessible quality for everyday healthy living." }
        ];

        for (const b of brands) {
            const bRes = await publicDb.dbRun(`
                INSERT INTO public_brands (company_id, name, category, trust_badge, brand_description)
                VALUES (?, ?, ?, ?, ?)
            `, [companyId, b.name, b.category, b.trust_badge, b.description]);

            const brandId = bRes.lastID;

            // 3. Products
            await publicDb.dbRun(`
                INSERT INTO public_products (brand_id, name, category, trust_label, public_description)
                VALUES (?, ?, ?, ?, ?)
            `, [brandId, `${b.name} Wellness Pack`, "Supplements", "Trust-Verified", "A curated selection of daily vitamins."]);
        }
    }

    // 4. Stats
    const stats = [
        { key: "verified_companies", value: "150+" },
        { key: "trusted_brands", value: "450+" },
        { key: "monitored_products", value: "2,000+" }
    ];

    for (const s of stats) {
        await publicDb.dbRun(`INSERT INTO system_stats (key, value) VALUES (?, ?)`, [s.key, s.value]);
    }

    console.log("Seeding completed successfully.");
}

seedStandaloneRegistry().catch(console.error);
