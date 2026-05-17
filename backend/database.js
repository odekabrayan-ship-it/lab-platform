const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || 'qualicore.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS laboratories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        is_internal BOOLEAN DEFAULT 0,
        owner_company_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_company_id) REFERENCES clients(id)
    )`);

    // 3. clients
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 4. professionals
    db.run(`CREATE TABLE IF NOT EXISTS professionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS test_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        FOREIGN KEY (test_request_id) REFERENCES test_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (received_by) REFERENCES users(id)
    )`);

    // 7. test_results
    db.run(`CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, raw_data_url TEXT, reagent_id INTEGER REFERENCES lab_reagents(id),
        FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
        FOREIGN KEY (entered_by) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id)
    )`);

    // 8. audit_logs
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // 10. lab_equipment
    db.run(`CREATE TABLE IF NOT EXISTS lab_equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS lab_reagents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id),
        name TEXT NOT NULL,
        manufacturer TEXT,
        lot_number TEXT NOT NULL,
        expiry_date DATE NOT NULL,
        opened_at DATE,
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'DEPLETED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 12. invoices
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS broadcast_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'ANNOUNCEMENT' CHECK(type IN ('ANNOUNCEMENT', 'JOB_ALERT', 'URGENT')),
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 15. broadcast_applications
    db.run(`CREATE TABLE IF NOT EXISTS broadcast_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        broadcast_id INTEGER NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SHORTLISTED', 'REJECTED', 'HIRED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(broadcast_id, professional_id)
    )`);

    // 16. method_authorizations (ISO 17025 Competence Matrix)
    db.run(`CREATE TABLE IF NOT EXISTS method_authorizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method_id INTEGER NOT NULL REFERENCES lab_methods(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
        authorized_by INTEGER REFERENCES users(id),
        authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_at DATE,
        notes TEXT
    )`);

    // 17. lab_methods (Method Catalog)
    db.run(`CREATE TABLE IF NOT EXISTS lab_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT,
        description TEXT,
        category TEXT,
        equipment_needed TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 18. staff (Internal Employees)
    db.run(`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, user_id)
    )`);

    // 19. job_invitations (Proactive Sourcing)
    db.run(`CREATE TABLE IF NOT EXISTS job_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        broadcast_id INTEGER REFERENCES broadcast_messages(id) ON DELETE CASCADE,
        message TEXT,
        status TEXT DEFAULT 'SENT' CHECK(status IN ('SENT', 'ACCEPTED', 'DECLINED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 20. system_settings
    db.run(`CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 21. verification_payments
    db.run(`CREATE TABLE IF NOT EXISTS verification_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'KES',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed')),
        mpesa_receipt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 22. professional_experience
    db.run(`CREATE TABLE IF NOT EXISTS professional_experience (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        organization_name TEXT NOT NULL,
        role_title TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        responsibilities TEXT,
        is_current INTEGER DEFAULT 0
    )`);

    // 23. professional_skills
    db.run(`CREATE TABLE IF NOT EXISTS professional_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        skill_name TEXT NOT NULL,
        category TEXT CHECK(category IN ('INSTRUMENT', 'METHOD', 'SOFTWARE', 'COMPLIANCE')),
        proficiency TEXT CHECK(proficiency IN ('EXPERT', 'ADVANCED', 'INTERMEDIATE'))
    )`);

    // 24. professional_documents
    db.run(`CREATE TABLE IF NOT EXISTS professional_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 25. user_broadcast_status
    db.run(`CREATE TABLE IF NOT EXISTS user_broadcast_status (
        user_id INTEGER NOT NULL REFERENCES users(id),
        broadcast_id INTEGER NOT NULL REFERENCES broadcast_messages(id),
        is_read INTEGER DEFAULT 0,
        read_at TIMESTAMP,
        PRIMARY KEY(user_id, broadcast_id)
    )`);

    // 26. engagements
    db.run(`CREATE TABLE IF NOT EXISTS engagements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    // ... Additional tables simplified for recovery ...
    db.run(`CREATE TABLE IF NOT EXISTS equipment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        performed_by INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        notes TEXT,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES lab_equipment(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS product_specifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    db.run(`CREATE TABLE IF NOT EXISTS sample_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        actor_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sample_custody_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        performed_by INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS lab_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_id INTEGER NOT NULL REFERENCES laboratories(id),
        name TEXT NOT NULL,
        description TEXT,
        current_load INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 100
    )`);

    // 28. rfqs (Request for Quotation)
    db.run(`CREATE TABLE IF NOT EXISTS rfqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        sample_type TEXT,
        required_standards TEXT,
        deadline DATE,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'awarded')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 29. bids (Laboratory Proposals)
    db.run(`CREATE TABLE IF NOT EXISTS bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    // 30. contracts (Legally Traceable Agreements)
    db.run(`CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rfq_id INTEGER NOT NULL REFERENCES rfqs(id),
        company_id INTEGER NOT NULL REFERENCES clients(id),
        lab_id INTEGER NOT NULL REFERENCES laboratories(id),
        agreed_price REAL NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
    )`);

    console.log("DATABASE: Sovereignty restored. All technical ledgers synchronized.");
});

module.exports = {
    db,
    dbGet: (query, params) => new Promise((res, rej) => db.get(query, params, (err, row) => err ? rej(err) : res(row))),
    dbAll: (query, params) => new Promise((res, rej) => db.all(query, params, (err, rows) => err ? rej(err) : res(rows))),
    dbRun: (query, params) => new Promise((res, rej) => db.run(query, params, function(err) { err ? rej(err) : res(this); })),
    ApiError: class extends Error { constructor(message, status = 500) { super(message); this.status = status; } }
};
