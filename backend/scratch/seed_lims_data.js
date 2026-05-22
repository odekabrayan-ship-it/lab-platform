const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../qualicore.db');
const db = new sqlite3.Database(dbPath);

const labId = 24; // Sovereign Lab Diagnostics
const labUserId = 75; // Our Lab user ID
const clientId = 1; // Pure Beverage Co.

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function seed() {
  console.log("=== INITIATING ISO/IEC 17025 LIMS DATA SEEDING PROTOCOL ===");
  console.log(`Targeting Lab Node: ID ${labId} | Lab User ID: ${labUserId} | Client ID: ${clientId}\n`);

  try {
    // 1. SEED METROLOGY EQUIPMENT
    console.log("[1/4] Seeding Metrology and Certified Assets...");
    
    // Clear any existing demo equipment for this lab to avoid duplicates
    await runQuery("DELETE FROM lab_equipment WHERE lab_id = ?", [labId]);

    const equipment = [
      {
        name: "Class II Biosafety Cabinet (A2)",
        manufacturer: "Thermo Scientific",
        model_number: "1300 Series A2",
        serial_number: "SN-BSC-99238",
        internal_asset_id: "LAB-BSC-001",
        location: "Microbiology Suite",
        criticality: "CRITICAL",
        calibration_interval_months: 12,
        calibration_date: "2026-01-15",
        calibration_expiry: "2027-01-15",
        status: "ACTIVE"
      },
      {
        name: "HPLC-FLD Chromatography System",
        manufacturer: "Agilent Technologies",
        model_number: "Infinity II 1260",
        serial_number: "SN-HPLC-88231",
        internal_asset_id: "LAB-HPLC-001",
        location: "Chromatography Lab",
        criticality: "CRITICAL",
        calibration_interval_months: 6,
        calibration_date: "2026-03-10",
        calibration_expiry: "2026-09-10",
        status: "ACTIVE"
      },
      {
        name: "GC-MS Mass Spectrometer",
        manufacturer: "Shimadzu",
        model_number: "QP2020 NX",
        serial_number: "SN-GCMS-77123",
        internal_asset_id: "LAB-GCMS-001",
        location: "Analytical Mass Spec Room",
        criticality: "CRITICAL",
        calibration_interval_months: 12,
        calibration_date: "2025-11-20",
        calibration_expiry: "2026-11-20",
        status: "ACTIVE"
      }
    ];

    for (const eq of equipment) {
      await runQuery(
        `INSERT INTO lab_equipment (
          lab_id, name, manufacturer, model_number, serial_number, 
          internal_asset_id, location, purchase_date, criticality, 
          calibration_interval_months, last_maintenance_date, next_maintenance_date,
          last_cleaning_date, calibration_date, calibration_expiry, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          labId, eq.name, eq.manufacturer, eq.model_number, eq.serial_number,
          eq.internal_asset_id, eq.location, '2025-01-01', eq.criticality,
          eq.calibration_interval_months, '2026-04-10', '2026-10-10',
          '2026-05-18', eq.calibration_date, eq.calibration_expiry, eq.status
        ]
      );
      console.log(`   + Registered Asset: ${eq.name} (${eq.internal_asset_id})`);
    }

    // 2. SEED TESTING METHODS
    console.log("\n[2/4] Seeding Standard Operational Testing Methods...");
    await runQuery("DELETE FROM lab_methods WHERE lab_id = ?", [labId]);

    const methods = [
      {
        name: "Quantitative microbiological assay",
        code: "ISO-MICRO-01",
        description: "Standard operational testing for yeast, mold, and pathogen load validation under ISO 17025 validation protocols.",
        category: "Microbiology",
        equipment_needed: "Class II Biosafety Cabinet (A2), Autoclave Systems",
        typical_mu: "0.02",
        mu_unit: "log cfu/g",
        mu_coverage_factor: 2.0,
        mu_confidence_level: "95%",
        mu_calculation_method: "Type A statistical evaluation of replicate measurements",
        validation_status: "VALIDATED",
        scope_of_application: "Food products, beverages, dry ingredients, and environmental swabs",
        detection_limit: "10 cfu/g",
        quantitation_limit: "10 cfu/g",
        precision_rsd: "1.8%",
        recovery_percent: "98.5%",
        bias_percent: "+0.5%",
        validated_by_name: "Dr. Catherine Vance (QA Director)"
      },
      {
        name: "Trace heavy metals extraction & analysis",
        code: "ISO-METALS-02",
        description: "Acid digestion extraction and quantitative detection of lead, arsenic, and mercury in raw/processed food matrices using GC-MS spectrometry.",
        category: "Heavy Metals",
        equipment_needed: "GC-MS Mass Spectrometer, Acid Digestion Hood",
        typical_mu: "0.05",
        mu_unit: "ppm",
        mu_coverage_factor: 2.0,
        mu_confidence_level: "95%",
        mu_calculation_method: "Combined standard uncertainty model (ISO GUM)",
        validation_status: "VALIDATED",
        scope_of_application: "Water, beverage concentrates, milk powders, and agricultural raw materials",
        detection_limit: "0.01 ppm",
        quantitation_limit: "0.05 ppm",
        precision_rsd: "2.4%",
        recovery_percent: "97.2%",
        bias_percent: "-1.1%",
        validated_by_name: "Dr. Catherine Vance (QA Director)"
      }
    ];

    for (const m of methods) {
      await runQuery(
        `INSERT INTO lab_methods (
          lab_id, name, code, description, category, equipment_needed,
          created_at, typical_mu, mu_unit, mu_coverage_factor, mu_confidence_level,
          mu_calculation_method, validation_status, scope_of_application,
          detection_limit, quantitation_limit, precision_rsd, recovery_percent,
          bias_percent, validated_by_name, validated_date
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`,
        [
          labId, m.name, m.code, m.description, m.category, m.equipment_needed,
          m.typical_mu, m.mu_unit, m.mu_coverage_factor, m.mu_confidence_level,
          m.mu_calculation_method, m.validation_status, m.scope_of_application,
          m.detection_limit, m.quantitation_limit, m.precision_rsd, m.recovery_percent,
          m.bias_percent, m.validated_by_name
        ]
      );
      console.log(`   + Authorized Method: ${m.name} [${m.code}]`);
    }

    // 3. ESTABLISH CORPORATE PARTNERSHIP ENGAGEMENT
    console.log("\n[3/4] Establishing Client-Laboratory Active Partnership Engagement...");
    let engagement = await getQuery(
      "SELECT id FROM engagements WHERE client_id = ? AND lab_id = ?",
      [clientId, labId]
    );
    
    let engagementId;
    if (engagement) {
      engagementId = engagement.id;
      console.log(`   + Found existing Engagement ID: ${engagementId}`);
    } else {
      engagementId = await runQuery(
        `INSERT INTO engagements (
          client_id, lab_id, status, sla_tat, created_at
        ) VALUES (?, ?, 'ACCEPTED', '3 Days', datetime('now'))`,
        [clientId, labId]
      );
      console.log(`   + Created new accepted Engagement ID: ${engagementId}`);
    }

    // 4. INGEST SAMPLE BATCH
    console.log("\n[4/4] Ingesting Infant Formula sample batch & creating custody chain...");
    
    // Clear any previous duplicate test requests and samples to maintain clean verification flow
    await runQuery("DELETE FROM samples WHERE sample_code = ?", ["SMP-2026-8801"]);
    await runQuery(
      "DELETE FROM test_requests WHERE lab_id = ? AND batch_number = ?",
      [labId, "BATCH-INFANT-NUTR-8822"]
    );

    // Create the parent test request
    const testRequestId = await runQuery(
      `INSERT INTO test_requests (
        client_id, lab_id, engagement_id, test_description, po_number, batch_number,
        status, request_source, initiated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        clientId, labId, engagementId,
        "ISO-17025 microbiological verification and heavy metals extraction for nutritional safety certification",
        "PO-PURE-2026-90", "BATCH-INFANT-NUTR-8822",
        "RECEIVED", "PORTAL", 5 // pure beverage user ID
      ]
    );
    console.log(`   + Created Test Request ID: ${testRequestId}`);

    // Ingest the sample linked to the test request
    const sampleId = await runQuery(
      `INSERT INTO samples (
        test_request_id, sample_code, description, received_by, condition_notes,
        status, received_at, created_at, storage_location, hazard_flags,
        source_company, source_contact, tests_requested, custody_status,
        current_custodian_id, updated_at, receipt_temperature, transport_condition,
        integrity_status
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
      [
        testRequestId,
        "SMP-2026-8801",
        "PureNutri Infant Formula Powder (Aflatoxin-Free Grade) - Batch 8822",
        labUserId,
        "Sample received sealed in sterile composite containers at 22.4°C. Perfect integrity.",
        "IN_CUSTODY",
        "Cabinet M-04 (Sterile Suite)",
        "NONE",
        "Pure Beverage Co.",
        "Mr. Marcus Aurelius (QA Executive)",
        "Quantitative microbiological assay, heavy metals spectrometry",
        "SECURE",
        labUserId,
        22.4,
        "Sealed Sterile Bag",
        "INTACT"
      ]
    );
    console.log(`   + Ingested Custody-Tracked Sample ID: ${sampleId} [SMP-2026-8801]`);

    // Add sample status history for LIMS verification
    await runQuery(
      `INSERT INTO sample_status_history (
        sample_id, status, actor_id, notes, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))`,
      [
        sampleId,
        "IN_CUSTODY",
        labUserId,
        "Technical intake complete. Sample registered, labeled, and placed in Cabinet M-04 storage."
      ]
    );
    
    // Add sample custody log for custody chain compliance
    await runQuery(
      `INSERT INTO sample_custody_logs (
        sample_id, action, performed_by, notes, timestamp
      ) VALUES (?, ?, ?, ?, datetime('now'))`,
      [
        sampleId,
        "SAMPLE_RECEIPT",
        labUserId,
        "Initial intake transfer from client courier to Laboratory QA Custodian."
      ]
    );
    
    console.log(`   + Established Cryptographic Chain of Custody record`);

    console.log("\n=======================================================");
    console.log("   ISO-17025 SEEDING PROTOCOL COMPLETED SUCCESSFULLY!");
    console.log("=======================================================");

  } catch (err) {
    console.error("❌ Seeding encountered database exception:", err);
  } finally {
    db.close();
  }
}

seed();
