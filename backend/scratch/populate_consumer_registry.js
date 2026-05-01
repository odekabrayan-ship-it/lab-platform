const publicDb = require('../public_database');

async function populate() {
    try {
        console.log("Injecting Consumer Registry Intelligence...");

        // 1. Supermarkets
        const mart = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, trust_status, profile_summary, compliance_claims, quality_practices, certifications_declared, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'Global Mart Holdings', 
            'Retail/Supermarket', 
            'United Kingdom', 
            'VERIFIED', 
            'Leading international retailer focused on sustainable supply chains and rigorous product vetting.',
            'Direct Lab Verification for House Brands',
            'Continuous Batch Testing of Perishables',
            'ISO-9001, BRC Global Standard',
            3
        ]);

        const elite = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, trust_status, profile_summary, compliance_claims, quality_practices, certifications_declared, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'Elite Grocers', 
            'Retail/Supermarket', 
            'Germany', 
            'VERIFIED', 
            'Premium grocer specializing in high-integrity organic and artisanal products.',
            'Zero-Tolerance Contamination Policy',
            'Supplier Integrity Audits (Monthly)',
            'EU Organic, IFS Food',
            3
        ]);

        // 2. Pharmaceuticals
        const biomed = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, trust_status, profile_summary, compliance_claims, quality_practices, certifications_declared, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'BioMed Labs International', 
            'Pharmaceuticals', 
            'Switzerland', 
            'VERIFIED', 
            'Advanced clinical pharmaceutical group with a focus on purity and patient safety.',
            'Full API Traceability',
            'Double-Blind Quality Verification',
            'GMP, WHO-PQ',
            3
        ]);

        const nexus = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, trust_status, profile_summary, compliance_claims, quality_practices, certifications_declared, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'Nexus Pharma', 
            'Pharmaceuticals', 
            'USA', 
            'VERIFIED', 
            'Innovative medical group providing high-fidelity therapeutic solutions.',
            'Real-Time Batch Release Monitoring',
            'GxP Compliant Infrastructure',
            'FDA Approved Facility, GMP',
            3
        ]);

        // 3. Food Manufacturing
        const agricore = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, trust_status, profile_summary, compliance_claims, quality_practices, certifications_declared, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'AgriCore Foods', 
            'Food Manufacturing', 
            'Canada', 
            'VERIFIED', 
            'Plant-based nutrition leaders with a focus on clean-label agricultural products.',
            'Non-GMO Project Verified',
            'Technical Grade Purity Controls',
            'HACCP, SQF Level 3',
            3
        ]);

        const apex = await publicDb.dbRun(`
            INSERT INTO public_companies (name, industry, country, trust_status, profile_summary, compliance_claims, quality_practices, certifications_declared, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'Apex Nutrition', 
            'Food Manufacturing', 
            'Netherlands', 
            'VERIFIED', 
            'Performance nutrition specialist with industry-leading analytical rigor.',
            'Heavy Metal Tested (Every Batch)',
            'Full Nutrient Profile Validation',
            'FSSC 22000',
            3
        ]);

        // --- BRANDS ---
        const brands = [
            { cid: mart.lastID, name: 'DailyFresh Whole Milk', cat: 'dairy', badge: 'PREMIUM', desc: 'Premium homogenized whole milk with full lab-verified purity trace.' },
            { cid: elite.lastID, name: 'PureGold Extra Virgin Oil', cat: 'oils', badge: 'PREMIUM', desc: 'Cold-pressed extra virgin olive oil tested for polyphenol content and authenticity.' },
            { cid: biomed.lastID, name: 'SafeCure 500 (Paracetamol)', cat: 'pharma', badge: 'STANDARD', desc: 'High-purity therapeutic grade paracetamol with zero detectable impurities.' },
            { cid: nexus.lastID, name: 'VitaMax Multi-Complex', cat: 'pharma', badge: 'FEATURED', desc: 'Advanced multivitamin formula verified for bioavailability and active concentration.' },
            { cid: agricore.lastID, name: 'Organic Harvest Oat Milk', cat: 'dairy', badge: 'STANDARD', desc: 'Certified organic oat milk with no added sugars or thickeners, lab-verified.' },
            { cid: apex.lastID, name: 'NutriBoost Whey Isolate', cat: 'beverages', badge: 'PREMIUM', desc: 'Ultra-pure whey isolate tested for protein yield and absence of banned substances.' }
        ];

        for (const b of brands) {
            await publicDb.dbRun(`
                INSERT INTO public_brands (company_id, name, category, trust_badge, brand_description)
                VALUES (?, ?, ?, ?, ?)
            `, [b.cid, b.name, b.cat, b.badge, b.desc]);
        }

        console.log("Intelligence Injection Complete: 6 Companies and 6 Brands localized in the Sovereign Registry.");
        process.exit(0);

    } catch (e) {
        console.error("Injection Failed:", e);
        process.exit(1);
    }
}

populate();
