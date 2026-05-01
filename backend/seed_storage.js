const db = require('./database');
async function seed() {
    try {
        const labs = await db.dbAll("SELECT id FROM laboratories");
        if (labs.length === 0) {
            console.log("No labs found. Seed labs first.");
            return;
        }
        
        // Seed for all existing labs to be safe
        for (const lab of labs) {
            const labId = lab.id;
            
            const professionalStorage = [
                ['ULT Freezer (-80°C) - Alpha', 'Critical storage for sensitive biologicals and RNA samples', 500],
                ['Cryogenic Tank (LN2) - 01', 'Long-term storage in liquid nitrogen vapor phase', 1000],
                ['Bio-Fridge (2-8°C) - Section A', 'Standard refrigerated storage for reagents and media', 2000],
                ['CO2 Incubator (37°C) - Micro', 'Incubation for microbiological cultures (5% CO2 control)', 200],
                ['Hazardous Material Vault', 'Reinforced storage for flammable or toxic chemical samples', 100],
                ['Room Temp Archive - Shelf 04', 'Ambient temperature storage for dry or non-perishable samples', 5000],
                ['BOD Incubator (20°C)', 'Incubator for Biochemical Oxygen Demand testing', 150],
                ['Light-Sensitive Cabinet', 'Opaque storage for light-sensitive analytes', 50]
            ];

            for (const [name, desc, cap] of professionalStorage) {
                // Use INSERT OR IGNORE to prevent duplicates if name is unique (though it's not unique in schema, good practice)
                await db.dbRun(
                    "INSERT INTO lab_storage (lab_id, name, description, capacity) VALUES (?, ?, ?, ?)", 
                    [labId, name, desc, cap]
                );
            }
            console.log(`Professional storage locations seeded for lab ${labId}`);
        }
    } catch (e) {
        console.error(e);
    }
}
seed();
