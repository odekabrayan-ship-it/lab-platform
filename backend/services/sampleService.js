const { dbGet, dbRun, ApiError } = require('./businessLogic');

class SampleService {
    /**
     * Generate a unique, deterministic sample code: SMP-YYYY-####
     */
    static async generateSampleCode() {
        const year = new Date().getFullYear();
        const counterName = `sample_code_${year}`;
        
        // Ensure counter exists for this year
        await dbRun(`INSERT OR IGNORE INTO counters (name, value) VALUES (?, 0)`, [counterName]);
        
        // Increment and return the new value
        await dbRun(`UPDATE counters SET value = value + 1 WHERE name = ?`, [counterName]);
        const counter = await dbGet(`SELECT value FROM counters WHERE name = ?`, [counterName]);
        
        // Format to 4 digits (e.g., 0001, 0042, 1024)
        const sequence = counter.value.toString().padStart(4, '0');
        return `SMP-${year}-${sequence}`;
    }

    /**
     * Register a new physical sample tied to an accepted test request.
     */
    static async registerSample({ 
        testRequestId, description, conditionNotes, receivedBy, storageLocation, hazardFlags,
        sourceCompany, sourceContact, testsRequested, testSpecs, clientNotes, samplingDate, samplingLocation
    }) {
        const request = await dbGet(`SELECT id, status, client_id, lab_id FROM test_requests WHERE id = ?`, [testRequestId]);
        
        if (!request) {
            throw new ApiError('Test request not found', 404);
        }
        if (request.status !== 'accepted' && request.status !== 'in_progress') {
            throw new ApiError('Samples can only be registered for accepted or in-progress test requests', 400);
        }

        const sampleCode = await this.generateSampleCode();

        const result = await dbRun(
            `INSERT INTO samples (
                test_request_id, sample_code, description, condition_notes, received_by, status, 
                storage_location, hazard_flags, source_company, source_contact, 
                tests_requested, test_specs, client_notes, sampling_date, sampling_location
            ) 
             VALUES (?, ?, ?, ?, ?, 'REGISTERED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                testRequestId, sampleCode, description, conditionNotes, receivedBy, 
                storageLocation, hazardFlags, sourceCompany, sourceContact, 
                testsRequested, testSpecs, clientNotes, samplingDate, samplingLocation
            ]
        );

        const sampleId = result.lastID;

        // Log to the "Pizza Tracker" History
        await dbRun(
            `INSERT INTO sample_status_history (sample_id, status, actor_id, notes) 
             VALUES (?, 'REGISTERED', ?, ?)`,
            [sampleId, receivedBy, 'Sample entry created in registry']
        );

        // Create initial custody log
        await dbRun(
            `INSERT INTO sample_custody_logs (sample_id, action, performed_by, notes) VALUES (?, 'received', ?, ?)`,
            [sampleId, receivedBy, 'Initial sample receipt']
        );

        // Notify client
        const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id]);
        if (clientUser) {
            await dbRun(
                `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'SAMPLE_RECEIVED')`,
                [clientUser.user_id, `Sample ${sampleCode} received for test request #${testRequestId}.`]
            );
        }

        // Audit logs
        await dbRun(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, 'SAMPLE_CREATED', 'SAMPLES', ?, ?)`,
            [receivedBy, sampleId, JSON.stringify({ sampleCode, testRequestId })]
        );

        return { id: sampleId, sampleCode, status: 'received' };
    }

    /**
     * Update sample status and automatically log to the Journey Tracker.
     */
    static async updateSampleStatus(sampleId, newStatus, performedBy, notes = '') {
        const validStatuses = ['REGISTERED', 'IN_CUSTODY', 'PREP', 'ANALYZING', 'REVIEW', 'CERTIFIED', 'DISPOSED'];
        if (!validStatuses.includes(newStatus)) {
            throw new ApiError('Invalid sample status', 400);
        }

        const sample = await dbGet(`SELECT status, test_request_id, sample_code FROM samples WHERE id = ?`, [sampleId]);
        if (!sample) {
            throw new ApiError('Sample not found', 404);
        }

        await dbRun(`UPDATE samples SET status = ? WHERE id = ?`, [newStatus, sampleId]);

        // Log to the "Pizza Tracker" History
        await dbRun(
            `INSERT INTO sample_status_history (sample_id, status, actor_id, notes) 
             VALUES (?, ?, ?, ?)`,
            [sampleId, newStatus, performedBy, notes || `Sample transitioned to ${newStatus}`]
        );

        // Map status to custody action for legacy support
        let action = 'transferred';
        if (newStatus === 'IN_CUSTODY') action = 'received';
        else if (newStatus === 'DISPOSED') action = 'disposed';
        else if (newStatus === 'ANALYZING') action = 'tested';

        await dbRun(
            `INSERT INTO sample_custody_logs (sample_id, action, performed_by, notes) VALUES (?, ?, ?, ?)`,
            [sampleId, action, performedBy, notes || `Status updated to ${newStatus}`]
        );

        // Notify client
        const request = await dbGet(`SELECT client_id, lab_id FROM test_requests WHERE id = ?`, [sample.test_request_id]);
        if (request) {
            const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id]);
            if (clientUser) {
                await dbRun(
                    `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'SAMPLE_STATUS_UPDATE')`,
                    [clientUser.user_id, `Sample ${sample.sample_code} is now in phase: ${newStatus}.`]
                );
            }
        }

        // Audit logs
        await dbRun(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value) VALUES (?, 'SAMPLE_STATUS_CHANGED', 'SAMPLES', ?, ?, ?)`,
            [performedBy, sampleId, sample.status, newStatus]
        );

        return { success: true, newStatus };
    }

    /**
     * Add a custom custody log entry (e.g., transferring rooms).
     */
    static async addCustodyLog(sampleId, action, notes, performedBy) {
        const validActions = ['received', 'transferred', 'tested', 'stored', 'disposed'];
        if (!validActions.includes(action)) {
            throw new ApiError('Invalid custody action', 400);
        }

        const sample = await dbGet(`SELECT id FROM samples WHERE id = ?`, [sampleId]);
        if (!sample) {
            throw new ApiError('Sample not found', 404);
        }

        await dbRun(
            `INSERT INTO sample_custody_logs (sample_id, action, performed_by, notes) VALUES (?, ?, ?, ?)`,
            [sampleId, action, performedBy, notes]
        );

        // Audit logs
        await dbRun(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, 'CUSTODY_ACTION', 'SAMPLES', ?, ?)`,
            [performedBy, sampleId, JSON.stringify({ action })]
        );

        return { success: true };
    }
}

module.exports = SampleService;
