const publicDb = require('../public_database');

async function migrateCategories() {
    try {
        console.log("Aligning Sovereign Registry with Expert Taxonomy...");

        const mappings = [
            { name: 'Global Mart Holdings', group: 'RETAIL' },
            { name: 'Elite Grocers', group: 'RETAIL' },
            { name: 'BioMed Labs International', group: 'PHARMACY' },
            { name: 'Nexus Pharma', group: 'PHARMACY' },
            { name: 'AgriCore Foods', group: 'STAPLES' },
            { name: 'Apex Nutrition', group: 'BEVERAGES' }
        ];

        for (const m of mappings) {
            await publicDb.dbRun(`UPDATE public_companies SET consumer_group = ? WHERE name = ?`, [m.group, m.name]);
        }

        console.log("Expert Taxonomy Applied.");
        process.exit(0);
    } catch (e) {
        console.error("Migration Failed:", e);
        process.exit(1);
    }
}

migrateCategories();
