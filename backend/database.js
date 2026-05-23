const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const isPg = !!process.env.DATABASE_URL;

let pgPool;
let sqliteDb;

if (isPg) {
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log("DATABASE: PostgreSQL connection pool established successfully.");
} else {
    const dbPath = process.env.DB_PATH || 'qualicore.db';
    sqliteDb = new sqlite3.Database(dbPath);
    console.log(`DATABASE: Local SQLite fallback active at ${dbPath}`);
}

// -------------------------------------------------------------
// Dialect Translation Engine
// -------------------------------------------------------------
function translateQuery(sql) {
    if (!sql) return sql;
    let converted = sql;

    // 1. Placeholder Translation: Convert ? to positional $1, $2, $3...
    let placeholderIndex = 1;
    converted = converted.replace(/\?/g, () => `$${placeholderIndex++}`);

    // 2. SQLite Date Functions Mapping to PostgreSQL
    converted = converted.replace(/date\('now'\)/gi, "CURRENT_DATE");
    converted = converted.replace(/DATE\('now'\)/gi, "CURRENT_DATE");

    // date('now', '+X days') / date('now', '-X days')
    converted = converted.replace(/date\('now',\s*'([+-])(\d+)\s*days?'\)/gi, (match, sign, amount) => {
        return `(CURRENT_DATE ${sign} INTERVAL '${amount} days')`;
    });

    // date('now', '+X months') / date('now', '-X months')
    converted = converted.replace(/date\('now',\s*'([+-])(\d+)\s*months?'\)/gi, (match, sign, amount) => {
        return `(CURRENT_DATE ${sign} INTERVAL '${amount} months')`;
    });

    // date('now', '+X years') / date('now', '-X years')
    converted = converted.replace(/date\('now',\s*'([+-])(\d+)\s*years?'\)/gi, (match, sign, amount) => {
        return `(CURRENT_DATE ${sign} INTERVAL '${amount} years')`;
    });

    // date('now', '-24 days', '-1 day')
    converted = converted.replace(/date\('now',\s*'-24 days',\s*'-1 day'\)/gi, "(CURRENT_DATE - INTERVAL '25 days')");

    // date('now', $X) -> (CURRENT_DATE + CAST($X AS interval))
    converted = converted.replace(/date\('now',\s*(\$\d+)\)/gi, "(CURRENT_DATE + CAST($1 AS interval))");

    // Type casts for date extracts
    converted = converted.replace(/date\(subscription_expiry\)/gi, "subscription_expiry::date");
    converted = converted.replace(/date\(created_at\)/gi, "created_at::date");

    // SQLite datetime functions -> PostgreSQL equivalents
    converted = converted.replace(/datetime\('now',\s*'([+-])(\d+)\s*days?'\)/gi, (match, sign, amount) => {
        return `(NOW() ${sign} INTERVAL '${amount} days')`;
    });
    converted = converted.replace(/datetime\('now',\s*'([+-])(\d+)\s*hours?'\)/gi, (match, sign, amount) => {
        return `(NOW() ${sign} INTERVAL '${amount} hours')`;
    });
    converted = converted.replace(/datetime\('now'\)/gi, "NOW()");

    // 3. PostgreSQL Type Definitions & Constraints
    converted = converted.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
    converted = converted.replace(/\bAUTOINCREMENT\b/gi, "");

    // Convert BOOLEAN DEFAULT 0/1 to smallint or compatible expressions
    converted = converted.replace(/BOOLEAN DEFAULT 0/gi, "INTEGER DEFAULT 0");
    converted = converted.replace(/BOOLEAN DEFAULT 1/gi, "INTEGER DEFAULT 1");

    // 4. Case-Insensitive Pattern Match
    converted = converted.replace(/\bLIKE\b/g, "ILIKE");

    // 5. Conflict Resolution: SQLite INSERT OR IGNORE -> PostgreSQL ON CONFLICT DO NOTHING
    if (converted.trim().toUpperCase().includes('INSERT OR IGNORE INTO')) {
        converted = converted.replace(/INSERT OR IGNORE INTO/gi, "INSERT INTO");
        // Only append ON CONFLICT if not already present
        if (!converted.toUpperCase().includes('ON CONFLICT')) {
            converted = converted.trim() + " ON CONFLICT DO NOTHING";
        }
    }

    return converted;
}

// Helper to normalize parameters for PostgreSQL (converts boolean true/false to 1/0 integers)
function normalizeParams(params) {
    if (!params) return params;
    if (Array.isArray(params)) {
        return params.map(val => {
            if (val === true) return 1;
            if (val === false) return 0;
            return val;
        });
    }
    return params;
}

// -------------------------------------------------------------
// Core Promise-based Query Methods
// -------------------------------------------------------------
const dbGet = async (query, params = []) => {
    if (isPg) {
        const translated = translateQuery(query);
        const normalizedParams = normalizeParams(params);
        const res = await pgPool.query(translated, normalizedParams);
        return res.rows[0] || null;
    } else {
        return new Promise((res, rej) => sqliteDb.get(query, params, (err, row) => err ? rej(err) : res(row)));
    }
};

const dbAll = async (query, params = []) => {
    if (isPg) {
        const translated = translateQuery(query);
        const normalizedParams = normalizeParams(params);
        const res = await pgPool.query(translated, normalizedParams);
        return res.rows;
    } else {
        return new Promise((res, rej) => sqliteDb.all(query, params, (err, rows) => err ? rej(err) : res(rows)));
    }
};

const dbRun = async (query, params = []) => {
    if (isPg) {
        let translated = translateQuery(query);
        const normalizedParams = normalizeParams(params);
        
        // Append RETURNING id to INSERT statements to track lastID
        if (translated.trim().toUpperCase().startsWith('INSERT ')) {
            if (!translated.toUpperCase().includes(' RETURNING ')) {
                translated = translated.trim() + ' RETURNING id';
            }
        }
        
        const res = await pgPool.query(translated, normalizedParams);
        return {
            lastID: res.rows.length > 0 ? Object.values(res.rows[0])[0] : null,
            changes: res.rowCount
        };
    } else {
        return new Promise((res, rej) => sqliteDb.run(query, params, function(err) {
            if (err) rej(err);
            else res({ lastID: this.lastID, changes: this.changes });
        }));
    }
};

// -------------------------------------------------------------
// High-Fidelity API Compatibility Shim (Callback-based db.db)
// -------------------------------------------------------------
const pgInitQueue = [];
let pgInitRunning = false;

function normalizeArgs(params, callback) {
    let normalizedParams = [];
    let normalizedCallback = null;

    if (typeof params === 'function') {
        normalizedCallback = params;
        normalizedParams = [];
    } else if (params !== undefined && params !== null) {
        normalizedParams = Array.isArray(params) ? params : [params];
        normalizedCallback = callback;
    } else {
        normalizedCallback = callback;
    }

    return { params: normalizedParams, callback: normalizedCallback };
}

async function runPgInitQueue() {
    if (pgInitRunning) return;
    pgInitRunning = true;
    for (const item of pgInitQueue) {
        try {
            await dbRun(item.query, item.params);
            if (item.callback) item.callback(null);
        } catch (err) {
            // Gracefully ignore duplicate column errors in schema migrations
            if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate column'))) {
                if (item.callback) item.callback(null);
            } else {
                console.error("SCHEMA ERROR DURING INITIALIZATION:", err.message);
                if (item.callback) item.callback(err);
            }
        }
    }
    pgInitRunning = false;
}

const dbMock = {
    get: (query, params, callback) => {
        const normalized = normalizeArgs(params, callback);
        dbGet(query, normalized.params)
            .then(row => { if (normalized.callback) normalized.callback(null, row); })
            .catch(err => { if (normalized.callback) normalized.callback(err); });
    },
    all: (query, params, callback) => {
        const normalized = normalizeArgs(params, callback);
        dbAll(query, normalized.params)
            .then(rows => { if (normalized.callback) normalized.callback(null, rows); })
            .catch(err => { if (normalized.callback) normalized.callback(err); });
    },
    run: (query, params, callback) => {
        const normalized = normalizeArgs(params, callback);
        const isSchema = query.trim().toUpperCase().startsWith('CREATE ') || query.trim().toUpperCase().startsWith('ALTER ');
        if (isSchema) {
            pgInitQueue.push({ query, params: normalized.params, callback: normalized.callback });
            if (!pgInitRunning) {
                setTimeout(runPgInitQueue, 20);
            }
        } else {
            dbRun(query, normalized.params)
                .then(result => {
                    if (normalized.callback) normalized.callback.call(result, null);
                })
                .catch(err => {
                    if (normalized.callback) normalized.callback(err);
                });
        }
    },
    serialize: (callback) => {
        // Execute serialization setup synchronously
        callback();
    }
};

const dbExport = isPg ? dbMock : sqliteDb;

// Attach .db reference pointing to itself to satisfy db.db.get/run usages
dbExport.db = dbExport;

// -------------------------------------------------------------
// Schema Initialization (Identical to Original SQLite setup)
// -------------------------------------------------------------
dbExport.serialize(() => {
    // 1. users
    dbExport.run(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'lab', 'client', 'professional', 'consumer')),
        sub_role TEXT,
        parent_lab_id INTEGER,
        parent_client_id INTEGER,
        is_verified INTEGER DEFAULT 0,
        signature_pin TEXT, 
        signatory_title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. laboratories
    dbExport.run(`CREATE TABLE IF NOT EXISTS laboratories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        organization_type TEXT,
        country TEXT,
        city TEXT,
        address TEXT,
        contact_person TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        accreditation_status TEXT,
        accreditation_body TEXT,
        accreditation_number TEXT,
        accreditation_expiry DATE,
        authorized_signatory TEXT,
        scope_description TEXT,
        equipment_summary TEXT,
        turnaround_time TEXT,
        operating_hours TEXT,
        sample_pickup INTEGER DEFAULT 0,
        emergency_service INTEGER DEFAULT 0,
        availability_status TEXT DEFAULT 'active',
        verification_status TEXT DEFAULT 'PENDING_REVIEW' CHECK(verification_status IN ('PENDING_REVIEW', 'TRIAL_ACTIVE', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INFO_REQUESTED')),
        trial_started_at TIMESTAMP,
        admin_notes TEXT,
        mpesa_shortcode TEXT,
        mpesa_passkey TEXT,
        bank_name TEXT,
        bank_account_name TEXT,
        bank_account_number TEXT,
        bank_swift_code TEXT,
        flw_public_key TEXT,
        flw_secret_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        registration_fee_paid INTEGER DEFAULT 0,
        subscription_tier TEXT DEFAULT 'BASIC',
        subscription_expiry DATE,
        subscription_status TEXT DEFAULT 'PENDING_ONBOARDING',
        specialization TEXT,
        is_internal INTEGER DEFAULT 0,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        owner_company_id INTEGER,
        platform_override INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 3. clients
    dbExport.run(`CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        company_name TEXT NOT NULL,
        industry_type TEXT,
        country TEXT,
        city TEXT,
        full_address TEXT,
        tax_id TEXT,
        website TEXT,
        company_bio TEXT,
        contact_person TEXT,
        contact_phone TEXT,
        verification_status TEXT DEFAULT 'pending_verification' CHECK(verification_status IN ('pending_verification', 'trial_active', 'active', 'suspended', 'payment_required')),
        trial_started_at TIMESTAMP,
        registration_fee_paid INTEGER DEFAULT 0,
        subscription_tier TEXT DEFAULT 'BASIC',
        subscription_expiry DATE,
        subscription_status TEXT DEFAULT 'PENDING_ONBOARDING',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        platform_override INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 4. professionals
    dbExport.run(`CREATE TABLE IF NOT EXISTS professionals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        specialty TEXT,
        experience_years INTEGER,
        license_number TEXT,
        contact_phone TEXT,
        bio TEXT,
        location TEXT,
        is_available INTEGER DEFAULT 1,
        certification_status TEXT DEFAULT 'draft' CHECK(certification_status IN ('draft', 'submitted', 'payment_pending', 'payment_completed', 'pending_review', 'approved', 'rejected')),
        verification_paid INTEGER DEFAULT 0,
        verification_paid_at TIMESTAMP,
        registration_fee_paid INTEGER DEFAULT 0,
        subscription_status TEXT DEFAULT 'PENDING_ONBOARDING',
        subscription_expiry DATE,
        subscription_tier TEXT DEFAULT 'BASIC',
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 5. test_requests
    dbExport.run(`CREATE TABLE IF NOT EXISTS test_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        lab_id INTEGER NOT NULL,
        engagement_id INTEGER NOT NULL,
        test_description TEXT NOT NULL,
        po_number TEXT,
        batch_number TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        request_source TEXT DEFAULT 'CLIENT_INITIATED',
        initiated_by INTEGER,
        assigned_technician_id INTEGER,
        assignment_notes TEXT,
        shipping_tracking_number TEXT,
        dispatch_notes TEXT,
        dispatched_at TIMESTAMP,
        received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (lab_id) REFERENCES laboratories(id),
        FOREIGN KEY (engagement_id) REFERENCES engagements(id),
        FOREIGN KEY (initiated_by) REFERENCES users(id),
        FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
    )`);

    // 6. samples
    dbExport.run(`CREATE TABLE IF NOT EXISTS samples (
        id SERIAL PRIMARY KEY,
        test_request_id INTEGER NOT NULL,
        sample_code TEXT NOT NULL UNIQUE,
        description TEXT,
        received_by INTEGER NOT NULL,
        condition_notes TEXT,
        status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(status IN ('REGISTERED', 'IN_CUSTODY', 'PREP', 'ANALYZING', 'REVIEW', 'CERTIFIED', 'DISPOSED')),
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        storage_location TEXT,
        hazard_flags TEXT,
        label_printed_at TIMESTAMP, source_company TEXT, source_contact TEXT, tests_requested TEXT, test_specs TEXT, client_notes TEXT, sampling_date DATETIME, sampling_location TEXT, custody_status TEXT DEFAULT 'IN_STORAGE', current_custodian_id INTEGER REFERENCES users(id), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        receipt_temperature REAL,
        transport_condition TEXT,
        integrity_status TEXT DEFAULT 'OK' CHECK(integrity_status IN ('OK', 'COMPROMISED', 'QUERY_RAISED', 'REJECTED')),
        integrity_notes TEXT,
        required_temp_min REAL,
        required_temp_max REAL,
        FOREIGN KEY (test_request_id) REFERENCES test_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (received_by) REFERENCES users(id)
    )`);

    // 7. test_results
    dbExport.run(`CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        sample_id INTEGER NOT NULL,
        parameter_name TEXT NOT NULL,
        value TEXT,
        unit TEXT,
        method_reference TEXT,
        measurement_uncertainty TEXT,
        specification_limit TEXT,
        pass_fail TEXT,
        equipment_id TEXT,
        positive_control TEXT,
        negative_control TEXT,
        incubation_time TEXT,
        incubation_temp TEXT,
        reagent_lot TEXT,
        entered_by INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'validated', 'superseded', 'rejected')),
        validated_at TIMESTAMP,
        validated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, raw_data_url TEXT, reagent_id INTEGER,
        FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
        FOREIGN KEY (entered_by) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id)
    )`);

    // 8. audit_logs
    dbExport.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // 9. notifications
    dbExport.run(`CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 10. lab_equipment
    dbExport.run(`CREATE TABLE IF NOT EXISTS lab_equipment (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        manufacturer TEXT,
        model_number TEXT,
        serial_number TEXT UNIQUE,
        internal_asset_id TEXT,
        location TEXT,
        purchase_date DATE,
        criticality TEXT DEFAULT 'NON-CRITICAL',
        calibration_interval_months INTEGER DEFAULT 12,
        last_maintenance_date DATE,
        next_maintenance_date DATE,
        last_cleaning_date DATE,
        calibration_date DATE,
        calibration_expiry DATE,
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
    )`);

    // 11. lab_reagents
    dbExport.run(`CREATE TABLE IF NOT EXISTS lab_reagents (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        manufacturer TEXT,
        lot_number TEXT NOT NULL,
        expiry_date DATE NOT NULL,
        opened_at DATE,
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'DEPLETED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 12. invoices
    dbExport.run(`CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        test_request_id INTEGER NOT NULL,
        lab_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        invoice_number TEXT NOT NULL UNIQUE,
        po_number TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        description TEXT,
        status TEXT DEFAULT 'UNPAID' CHECK(status IN ('UNPAID','PAID','DISPUTED','CANCELLED')),
        due_date DATE,
        paid_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_request_id) REFERENCES test_requests(id),
        FOREIGN KEY (lab_id) REFERENCES laboratories(id),
        FOREIGN KEY (client_id) REFERENCES clients(id)
    )`);

    // 13. reports
    dbExport.run(`CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        test_request_id INTEGER NOT NULL UNIQUE,
        generated_by INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        report_number TEXT NOT NULL UNIQUE,
        verification_code TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'generated' CHECK(status IN ('generated', 'delivered')),
        digitally_signed_at TIMESTAMP,
        signed_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_request_id) REFERENCES test_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (generated_by) REFERENCES users(id),
        FOREIGN KEY (signed_by) REFERENCES users(id)
    )`);

    // 14. broadcast_messages
    dbExport.run(`CREATE TABLE IF NOT EXISTS broadcast_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'ANNOUNCEMENT' CHECK(type IN ('ANNOUNCEMENT', 'JOB_ALERT', 'URGENT')),
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 15. broadcast_applications
    dbExport.run(`CREATE TABLE IF NOT EXISTS broadcast_applications (
        id SERIAL PRIMARY KEY,
        broadcast_id INTEGER NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SHORTLISTED', 'REJECTED', 'HIRED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(broadcast_id, professional_id)
    )`);

    // 16. method_authorizations
    dbExport.run(`CREATE TABLE IF NOT EXISTS method_authorizations (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method_id INTEGER NOT NULL REFERENCES lab_methods(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
        authorized_by INTEGER REFERENCES users(id),
        authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_at DATE,
        notes TEXT
    )`);

    // 17. lab_methods
    dbExport.run(`CREATE TABLE IF NOT EXISTS lab_methods (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT,
        description TEXT,
        category TEXT,
        equipment_needed TEXT,
        typical_mu TEXT,
        mu_unit TEXT DEFAULT '%',
        mu_coverage_factor REAL DEFAULT 2,
        mu_confidence_level TEXT DEFAULT '95%',
        mu_calculation_method TEXT DEFAULT 'GUM',
        validation_status TEXT DEFAULT 'PENDING' CHECK(validation_status IN ('PENDING', 'IN_DEVELOPMENT', 'VALIDATED', 'VERIFIED', 'RETIRED')),
        scope_of_application TEXT,
        validation_report_url TEXT,
        linearity_range TEXT,
        detection_limit TEXT,
        quantitation_limit TEXT,
        precision_rsd TEXT,
        recovery_percent TEXT,
        bias_percent TEXT,
        validated_by_name TEXT,
        validated_by_user_id INTEGER REFERENCES users(id),
        validated_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 18. staff
    dbExport.run(`CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, user_id)
    )`);

    // 19. job_invitations
    dbExport.run(`CREATE TABLE IF NOT EXISTS job_invitations (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        broadcast_id INTEGER REFERENCES broadcast_messages(id) ON DELETE CASCADE,
        message TEXT,
        status TEXT DEFAULT 'SENT' CHECK(status IN ('SENT', 'ACCEPTED', 'DECLINED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 20. system_settings
    dbExport.run(`CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 21. verification_payments
    dbExport.run(`CREATE TABLE IF NOT EXISTS verification_payments (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'KES',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed')),
        mpesa_receipt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 22. professional_experience
    dbExport.run(`CREATE TABLE IF NOT EXISTS professional_experience (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        organization_name TEXT NOT NULL,
        role_title TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        responsibilities TEXT,
        is_current INTEGER DEFAULT 0
    )`);

    // 23. professional_skills
    dbExport.run(`CREATE TABLE IF NOT EXISTS professional_skills (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        skill_name TEXT NOT NULL,
        category TEXT CHECK(category IN ('INSTRUMENT', 'METHOD', 'SOFTWARE', 'COMPLIANCE')),
        proficiency TEXT CHECK(proficiency IN ('EXPERT', 'ADVANCED', 'INTERMEDIATE'))
    )`);

    // 24. professional_documents
    dbExport.run(`CREATE TABLE IF NOT EXISTS professional_documents (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 25. user_broadcast_status
    dbExport.run(`CREATE TABLE IF NOT EXISTS user_broadcast_status (
        user_id INTEGER NOT NULL REFERENCES users(id),
        broadcast_id INTEGER NOT NULL REFERENCES broadcast_messages(id),
        is_read INTEGER DEFAULT 0,
        read_at TIMESTAMP,
        PRIMARY KEY(user_id, broadcast_id)
    )`);

    // 26. engagements
    dbExport.run(`CREATE TABLE IF NOT EXISTS engagements (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        lab_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
        sla_tat TEXT,
        review_date DATE,
        partnership_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (lab_id) REFERENCES laboratories(id),
        UNIQUE(client_id, lab_id)
    )`);
    
    // 27. payments
    dbExport.run(`CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        request_id INTEGER DEFAULT 0,
        payer_user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'KES',
        phone TEXT,
        checkout_request_id TEXT UNIQUE,
        mpesa_receipt TEXT,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'FAILED')),
        payment_type TEXT DEFAULT 'TEST_REQUEST',
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payer_user_id) REFERENCES users(id)
    )`);

    // 27a. disputes
    dbExport.run(`CREATE TABLE IF NOT EXISTS disputes (
        id SERIAL PRIMARY KEY,
        test_request_id INTEGER NOT NULL,
        report_id INTEGER,
        raised_by INTEGER NOT NULL,
        dispute_type TEXT NOT NULL CHECK(dispute_type IN ('RESULT_CHALLENGE','RETEST_REQUEST','DELIVERY_DELAY','BILLING_DISPUTE')),
        description TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED')),
        resolution_notes TEXT,
        resolved_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        FOREIGN KEY (test_request_id) REFERENCES test_requests(id),
        FOREIGN KEY (raised_by) REFERENCES users(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id)
    )`);

    // 27b. trust_brands
    dbExport.run(`CREATE TABLE IF NOT EXISTS trust_brands (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        trust_badge TEXT DEFAULT 'STANDARD',
        brand_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);

    // 27c. vigilance_reports
    dbExport.run(`CREATE TABLE IF NOT EXISTS vigilance_reports (
        id SERIAL PRIMARY KEY,
        brand_name TEXT NOT NULL,
        batch_number TEXT,
        symptom_type TEXT,
        description TEXT NOT NULL,
        severity TEXT DEFAULT 'MEDIUM',
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'RESOLVED', 'CLOSED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 27d. equipment_logs
    dbExport.run(`CREATE TABLE IF NOT EXISTS equipment_logs (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER NOT NULL,
        performed_by INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        notes TEXT,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES lab_equipment(id) ON DELETE CASCADE
    )`);

    // 27e. product_specifications
    dbExport.run(`CREATE TABLE IF NOT EXISTS product_specifications (
        id SERIAL PRIMARY KEY,
        client_id INTEGER,
        product_name TEXT,
        parameter_name TEXT,
        limit_type TEXT,
        limit_value TEXT,
        unit TEXT,
        method_reference TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
    )`);

    // 27f. sample_status_history
    dbExport.run(`CREATE TABLE IF NOT EXISTS sample_status_history (
        id SERIAL PRIMARY KEY,
        sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        actor_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 27g. sample_custody_logs
    dbExport.run(`CREATE TABLE IF NOT EXISTS sample_custody_logs (
        id SERIAL PRIMARY KEY,
        sample_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        performed_by INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
    )`);
    
    // 27h. lab_storage
    dbExport.run(`CREATE TABLE IF NOT EXISTS lab_storage (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        current_load INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 100
    )`);

    // 28. rfqs
    dbExport.run(`CREATE TABLE IF NOT EXISTS rfqs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        sample_type TEXT,
        required_standards TEXT,
        deadline DATE,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'awarded')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 29. bids
    dbExport.run(`CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'KES',
        turnaround_time TEXT NOT NULL,
        method_proposal TEXT,
        capability_statement TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rfq_id, lab_id)
    )`);

    // 30. contracts
    dbExport.run(`CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER NOT NULL REFERENCES rfqs(id),
        company_id INTEGER NOT NULL REFERENCES clients(id),
        lab_id INTEGER NOT NULL REFERENCES laboratories(id),
        agreed_price REAL NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Counters
    dbExport.run(`CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
    )`);

    // 31. verification_applications
    dbExport.run(`CREATE TABLE IF NOT EXISTS verification_applications (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        tier TEXT NOT NULL CHECK(tier IN ('LEVEL 1', 'LEVEL 2', 'LEVEL 3')),
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
        target_brands TEXT, 
        submitted_documents TEXT, 
        admin_notes TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);

    // 32. nonconformances
    dbExport.run(`CREATE TABLE IF NOT EXISTS nonconformances (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        ncr_number TEXT NOT NULL UNIQUE,
        sample_id INTEGER,
        batch_number TEXT,
        product_description TEXT,
        issue_description TEXT NOT NULL,
        source TEXT DEFAULT 'MANUAL' CHECK(source IN ('MANUAL', 'INTERNAL_REVIEW', 'SAMPLE_RECEIPT', 'CLIENT_COMPLAINT', 'AUDIT', 'EXTERNAL_PT')),
        detected_by INTEGER,
        priority TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'ESCALATED')),
        immediate_action TEXT,
        rca TEXT,
        corrective_action TEXT,
        preventive_action TEXT,
        verification_method TEXT,
        effectiveness_check_date DATE,
        owner_id INTEGER,
        due_date DATE,
        resolved_by INTEGER,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lab_id) REFERENCES laboratories(id)
    )`);

    // 33. environment_logs
    dbExport.run(`CREATE TABLE IF NOT EXISTS environment_logs (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        location TEXT,
        temperature REAL,
        humidity REAL,
        pressure REAL,
        logged_by INTEGER,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 34. result_audit_logs
    dbExport.run(`CREATE TABLE IF NOT EXISTS result_audit_logs (
        id SERIAL PRIMARY KEY,
        result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        performed_by INTEGER NOT NULL REFERENCES users(id),
        old_value TEXT,
        new_value TEXT,
        amendment_reason TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 35. report_audit_logs
    dbExport.run(`CREATE TABLE IF NOT EXISTS report_audit_logs (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        performed_by INTEGER NOT NULL REFERENCES users(id),
        metadata TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Backward-compatibility schema syncs (run on sqliteDb or ignored gracefully in pg)
    dbExport.run(`ALTER TABLE samples ADD COLUMN receipt_temperature REAL`, (err) => {});
    dbExport.run(`ALTER TABLE samples ADD COLUMN transport_condition TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE samples ADD COLUMN integrity_status TEXT DEFAULT 'OK'`, (err) => {});
    dbExport.run(`ALTER TABLE samples ADD COLUMN integrity_notes TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE samples ADD COLUMN required_temp_min REAL`, (err) => {});
    dbExport.run(`ALTER TABLE samples ADD COLUMN required_temp_max REAL`, (err) => {});

    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN typical_mu TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN mu_unit TEXT DEFAULT '%'`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN mu_coverage_factor REAL DEFAULT 2`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN mu_confidence_level TEXT DEFAULT '95%'`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN mu_calculation_method TEXT DEFAULT 'GUM'`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN validation_status TEXT DEFAULT 'PENDING'`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN scope_of_application TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN validation_report_url TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN linearity_range TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN detection_limit TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN quantitation_limit TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN precision_rsd TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN recovery_percent TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN bias_percent TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN validated_by_name TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN validated_by_user_id INTEGER`, (err) => {});
    dbExport.run(`ALTER TABLE lab_methods ADD COLUMN validated_date DATE`, (err) => {});
    
    // Stripe Subscriptions
    dbExport.run(`ALTER TABLE laboratories ADD COLUMN stripe_customer_id TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE laboratories ADD COLUMN stripe_subscription_id TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE clients ADD COLUMN stripe_customer_id TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE clients ADD COLUMN stripe_subscription_id TEXT`, (err) => {});
    dbExport.run(`ALTER TABLE laboratories ADD COLUMN platform_override INTEGER DEFAULT 0`, (err) => {});
    dbExport.run(`ALTER TABLE clients ADD COLUMN platform_override INTEGER DEFAULT 0`, (err) => {});
    // Invitations
    dbExport.run(`CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        sub_role TEXT,
        tenant_lab_id INTEGER,
        tenant_client_id INTEGER,
        token TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        invited_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Professional Certification Portal Schema
    dbExport.run(`CREATE TABLE IF NOT EXISTS cert_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL,
        certification_type TEXT NOT NULL,
        status TEXT DEFAULT 'SUBMITTED',
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        decision_notes TEXT,
        documents TEXT,
        professional_statement TEXT,
        FOREIGN KEY (professional_id) REFERENCES professionals(id)
    )`);

    dbExport.run(`CREATE TABLE IF NOT EXISTS cert_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL,
        credential_type TEXT NOT NULL,
        issuing_authority TEXT,
        credential_number TEXT,
        issued_date DATE,
        expiry_date DATE,
        status TEXT DEFAULT 'ACTIVE',
        verification_hash TEXT,
        FOREIGN KEY (professional_id) REFERENCES professionals(id)
    )`);

    dbExport.run(`CREATE TABLE IF NOT EXISTS cert_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cert_application_id INTEGER,
        action TEXT NOT NULL,
        performed_by INTEGER,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);


    // ── Schema Migrations: safely add new columns if missing ───────────────
    const migrations = [
        `ALTER TABLE cert_applications ADD COLUMN review_stage TEXT DEFAULT 'INITIAL'`,
        `ALTER TABLE professionals ADD COLUMN specialization TEXT`,
        `ALTER TABLE professionals ADD COLUMN institution TEXT`,
        `ALTER TABLE professionals ADD COLUMN years_experience INTEGER DEFAULT 0`,
        `ALTER TABLE professionals ADD COLUMN phone TEXT`,
        `ALTER TABLE professionals ADD COLUMN updated_at TIMESTAMP`,
    ];
    for (const m of migrations) {
        try { dbExport.run(m); } catch (_) { /* column already exists */ }
    }

    console.log("DATABASE: Adapters established. Schema validation complete.");

});

module.exports = {
    db: dbExport,
    dbGet,
    dbAll,
    dbRun,
    ApiError: class extends Error { constructor(message, status = 500) { super(message); this.status = status; } }
};
