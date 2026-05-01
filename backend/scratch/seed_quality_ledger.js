const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/lab-platform/backend/qualicore.db');

async function seedQualityLedger() {
    console.log("--- SEEDING SOVEREIGN QUALITY LEDGER ---");

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 1. Environmental Logs
            db.run(`INSERT INTO environmental_logs (lab_id, parameter, value, unit, recorded_by) VALUES 
                (1, 'Temperature', 21.8, '°C', 23),
                (1, 'Humidity', 44.5, '%', 23),
                (1, 'Temperature', 22.1, '°C', 23)`);

            // 2. Sterilization Logs
            db.run(`INSERT INTO sterilization_logs (lab_id, item_description, method, temperature, pressure, duration_minutes, operator_id, verified_by, started_at, completed_at) VALUES 
                (1, 'Glassware Batch-99', 'Autoclave', 121.0, 15.0, 20, 23, 24, '2026-04-29 09:00:00', '2026-04-29 09:20:00')`);

            // 3. Equipment Audit Dates
            db.run(`UPDATE lab_equipment SET last_calibration_date = '2026-04-01', next_calibration_date = '2026-10-01' WHERE lab_id = 1`);

            // 4. SOPs
            db.run(`INSERT OR IGNORE INTO lab_sops (lab_id, title, code, version, category, effective_date, next_review_date) VALUES 
                (1, 'Sample Receiving & Pre-treatment', 'SOP-GEN-01', 'v2.4', 'GENERAL', '2026-01-01', '2026-12-01'),
                (1, 'Calibration of Analytical Balances', 'SOP-MET-05', 'v1.1', 'METROLOGY', '2026-02-15', '2026-10-15')`);

            console.log(">> ISO-17025 Compliance Records Seeded Successfully.");
            resolve();
        });
    });
}

seedQualityLedger().then(() => {
    db.close();
    process.exit(0);
});
