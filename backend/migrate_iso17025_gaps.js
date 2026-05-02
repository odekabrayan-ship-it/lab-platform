/**
 * QUALICORE ISO 17025 GAP REMEDIATION MIGRATION
 * Adds tables and columns to support:
 * - P1-2: nonconformances (CAPA persistence) - ISO 17025 §8.7
 * - P1-4: method MU library fields - ISO 17025 §7.6
 * - P2-3: method validation status fields - ISO 17025 §7.2
 * - P2-4: sample receipt temperature and integrity fields - ISO 17025 §7.4.3
 */

const { db } = require('./database');

db.serialize(() => {
    console.log('🔧 Running ISO 17025 Gap Remediation Migration...');

    // ── P1-2: NONCONFORMANCES / CAPA TABLE ──────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS nonconformances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        ncr_number TEXT NOT NULL UNIQUE,
        sample_id INTEGER REFERENCES samples(id),
        batch_number TEXT,
        product_description TEXT,
        issue_description TEXT NOT NULL,
        source TEXT DEFAULT 'MANUAL' CHECK(source IN ('MANUAL', 'INTERNAL_REVIEW', 'SAMPLE_RECEIPT', 'CLIENT_COMPLAINT', 'AUDIT', 'EXTERNAL_PT')),
        detected_by INTEGER REFERENCES users(id),
        priority TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'ESCALATED')),
        immediate_action TEXT,
        rca TEXT,
        corrective_action TEXT,
        preventive_action TEXT,
        verification_method TEXT,
        effectiveness_check_date DATE,
        owner_id INTEGER REFERENCES users(id),
        due_date DATE,
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lab_id) REFERENCES laboratories(id)
    )`, (err) => {
        if (err) console.error('nonconformances table:', err.message);
        else console.log('✅ nonconformances table ready');
    });

    // ── P1-4 + P2-3: METHOD MU LIBRARY + VALIDATION STATUS FIELDS ──────────
    const methodColumns = [
        // MU Library (P1-4)
        `ALTER TABLE lab_methods ADD COLUMN typical_mu TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN mu_unit TEXT DEFAULT '%'`,
        `ALTER TABLE lab_methods ADD COLUMN mu_coverage_factor REAL DEFAULT 2`,
        `ALTER TABLE lab_methods ADD COLUMN mu_confidence_level TEXT DEFAULT '95%'`,
        `ALTER TABLE lab_methods ADD COLUMN mu_calculation_method TEXT DEFAULT 'GUM'`,
        // Validation Status (P2-3)
        `ALTER TABLE lab_methods ADD COLUMN validation_status TEXT DEFAULT 'PENDING' CHECK(validation_status IN ('PENDING', 'IN_DEVELOPMENT', 'VALIDATED', 'VERIFIED', 'RETIRED'))`,
        `ALTER TABLE lab_methods ADD COLUMN scope_of_application TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN validation_report_url TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN linearity_range TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN detection_limit TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN quantitation_limit TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN precision_rsd TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN recovery_percent TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN bias_percent TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN validated_by_name TEXT`,
        `ALTER TABLE lab_methods ADD COLUMN validated_by_user_id INTEGER REFERENCES users(id)`,
        `ALTER TABLE lab_methods ADD COLUMN validated_date DATE`,
    ];

    methodColumns.forEach(sql => {
        db.run(sql, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Method column:', err.message);
            }
        });
    });
    console.log('✅ lab_methods MU + validation columns ready');

    // ── P2-4: SAMPLE RECEIPT TEMPERATURE + INTEGRITY FIELDS ─────────────────
    const sampleColumns = [
        `ALTER TABLE samples ADD COLUMN receipt_temperature REAL`,
        `ALTER TABLE samples ADD COLUMN transport_condition TEXT`,
        `ALTER TABLE samples ADD COLUMN integrity_status TEXT DEFAULT 'OK' CHECK(integrity_status IN ('OK', 'COMPROMISED', 'QUERY_RAISED', 'REJECTED'))`,
        `ALTER TABLE samples ADD COLUMN integrity_notes TEXT`,
        `ALTER TABLE samples ADD COLUMN required_temp_min REAL`,
        `ALTER TABLE samples ADD COLUMN required_temp_max REAL`,
    ];

    sampleColumns.forEach(sql => {
        db.run(sql, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Sample column:', err.message);
            }
        });
    });
    console.log('✅ samples receipt temperature + integrity columns ready');

    // ── P1-1: Ensure environment_logs table exists for validation queue context
    db.run(`CREATE TABLE IF NOT EXISTS environment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id),
        location TEXT,
        temperature REAL,
        humidity REAL,
        pressure REAL,
        logged_by INTEGER REFERENCES users(id),
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err && !err.message.includes('already exists')) console.error('environment_logs:', err.message);
        else console.log('✅ environment_logs table ready');
    });

    console.log('\n🏛️ ISO 17025 Gap Remediation Migration COMPLETE.');
    console.log('   Restart the server to activate all new endpoints.\n');
    setTimeout(() => process.exit(0), 500);
});
