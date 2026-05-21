const { dbGet, dbAll, dbRun, ApiError } = require('./businessLogic');

class ResultService {
    /**
     * Add a new test result for a sample (Technician action).
     * The sample must be in 'in_testing' status.
     */
    static async addResult({ sampleId, parameterName, value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot, enteredBy }) {
        const sample = await dbGet(`SELECT id, status, test_request_id FROM samples WHERE id = ?`, [sampleId]);
        if (!sample) throw new ApiError('Sample not found', 404);
        if (sample.status !== 'ANALYZING' && sample.status !== 'in_testing') {
            throw new ApiError('Results can only be added to samples that are currently in testing (ANALYZING status required)', 400);
        }

        // --- ISO 17025 COMPETENCE CHECK ---
        // Verify if the technician is authorized for this method
        const labId = await dbGet(`SELECT lab_id FROM test_requests WHERE id = ?`, [sample.test_request_id]);
        const method = await dbGet(`SELECT id FROM lab_methods WHERE lab_id = ? AND (name = ? OR code = ?)`, [labId.lab_id, parameterName, methodReference]);
        
        if (method) {
            const auth = await dbGet(`
                SELECT id FROM method_authorizations 
                WHERE lab_id = ? AND user_id = ? AND method_id = ? AND status = 'ACTIVE'
                AND (expiry_at IS NULL OR expiry_at >= DATE('now'))
            `, [labId.lab_id, enteredBy, method.id]);

            if (!auth) {
                throw new ApiError(`ISO 17025 Violation: You are not authorized to perform the method '${parameterName}'. Please contact your Lab Manager for method authorization.`, 403);
            }
        }

        const result = await dbRun(
            `INSERT INTO test_results (sample_id, parameter_name, value, unit, method_reference, measurement_uncertainty, specification_limit, pass_fail, equipment_id, positive_control, negative_control, incubation_time, incubation_temp, reagent_lot, entered_by, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
            [sampleId, parameterName, value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot, enteredBy]
        );

        const resultId = result.lastID;

        // Audit log: result created
        await dbRun(
            `INSERT INTO result_audit_logs (result_id, action, performed_by, new_value)
             VALUES (?, 'created', ?, ?)`,
            [resultId, enteredBy, JSON.stringify({ parameterName, value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot })]
        );

        return { id: resultId, status: 'draft' };
    }

    /**
     * Update a draft result (only if status === 'draft').
     */
    static async updateResult({ resultId, value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot, updatedBy }) {
        const result = await dbGet(`SELECT * FROM test_results WHERE id = ?`, [resultId]);
        if (!result) throw new ApiError('Result not found', 404);
        if (result.status === 'validated') {
            throw new ApiError('Cannot modify a validated result.', 400);
        }

        const oldValue = JSON.stringify(result);

        await dbRun(
            `UPDATE test_results SET value = ?, unit = ?, method_reference = ?, measurement_uncertainty = ?, specification_limit = ?, pass_fail = ?, equipment_id = ?, positive_control = ?, negative_control = ?, incubation_time = ?, incubation_temp = ?, reagent_lot = ? WHERE id = ?`,
            [value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot, resultId]
        );

        const newValue = JSON.stringify({ value, unit, method_reference: methodReference, measurement_uncertainty: measurementUncertainty, specification_limit: specificationLimit, pass_fail: passFail, equipment_id: equipmentId });

        await dbRun(
            `INSERT INTO result_audit_logs (result_id, action, performed_by, old_value, new_value)
             VALUES (?, 'updated', ?, ?, ?)`,
            [resultId, updatedBy, oldValue, newValue]
        );

        return { success: true };
    }

    /**
     * Validate ALL draft results for a sample (Reviewer action).
     */
    static async validateResults({ sampleId, validatedBy }) {
        const sample = await dbGet(`SELECT id, status, test_request_id FROM samples WHERE id = ?`, [sampleId]);
        if (!sample) throw new ApiError('Sample not found', 404);

        const draftResults = await dbAll(
            `SELECT * FROM test_results WHERE sample_id = ? AND status = 'draft'`,
            [sampleId]
        );

        if (draftResults.length === 0) {
            throw new ApiError('No draft results to validate for this sample', 400);
        }

        // Maker-Checker Validation
        for (const res of draftResults) {
            if (res.entered_by === validatedBy) {
                throw new ApiError('ISO 17025 Violation: You cannot validate your own work.', 403);
            }
        }

        await dbRun(
            `UPDATE test_results SET status = 'validated', validated_by = ?, validated_at = CURRENT_TIMESTAMP
             WHERE sample_id = ? AND status = 'draft'`,
            [validatedBy, sampleId]
        );

        for (const result of draftResults) {
            await dbRun(
                `INSERT INTO result_audit_logs (result_id, action, performed_by, old_value, new_value)
                 VALUES (?, 'validated', ?, 'draft', 'validated')`,
                [result.id, validatedBy]
            );
        }

        return { validatedCount: draftResults.length };
    }

    /**
     * Get all results for a sample.
     */
    static async getResultsBySample(sampleId) {
        return await dbAll(
            `SELECT r.*, u.email as entered_by_email, v.email as validated_by_email
             FROM test_results r
             JOIN users u ON r.entered_by = u.id
             LEFT JOIN users v ON r.validated_by = v.id
             WHERE r.sample_id = ? AND r.status != 'superseded'
             ORDER BY r.created_at ASC`,
            [sampleId]
        );
    }

    /**
     * Amend a validated result (ISO-17025 Amendment Workflow).
     */
    static async amendResult({ resultId, value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot, amendmentReason, amendedBy }) {
        const originalResult = await dbGet(`SELECT * FROM test_results WHERE id = ?`, [resultId]);
        if (!originalResult || originalResult.status !== 'validated') throw new ApiError('Invalid result for amendment', 400);

        await dbRun(`UPDATE test_results SET status = 'superseded' WHERE id = ?`, [resultId]);

        const newResult = await dbRun(
            `INSERT INTO test_results (sample_id, parameter_name, value, unit, method_reference, measurement_uncertainty, specification_limit, pass_fail, equipment_id, positive_control, negative_control, incubation_time, incubation_temp, reagent_lot, entered_by, validated_by, validated_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'validated')`,
            [originalResult.sample_id, originalResult.parameter_name, value, unit, methodReference, measurementUncertainty, specificationLimit, passFail, equipmentId, positiveControl, negativeControl, incubationTime, incubationTemp, reagentLot, originalResult.entered_by, amendedBy]
        );

        await dbRun(
            `INSERT INTO result_audit_logs (result_id, action, performed_by, old_value, new_value, amendment_reason)
             VALUES (?, 'amended', ?, ?, ?, ?)`,
            [originalResult.id, amendedBy, JSON.stringify(originalResult), JSON.stringify({ value, unit, passFail }), amendmentReason]
        );

        return { id: newResult.lastID, status: 'validated' };
    }

    /**
     * Reject draft results (Reviewer action).
     */
    static async rejectResults({ sampleId, rejectedBy, reason }) {
        const draftResults = await dbAll(`SELECT * FROM test_results WHERE sample_id = ? AND status = 'draft'`, [sampleId]);
        if (draftResults.length === 0) throw new ApiError('No draft results to reject', 400);

        await dbRun(`UPDATE test_results SET status = 'rejected' WHERE sample_id = ? AND status = 'draft'`, [sampleId]);

        for (const result of draftResults) {
            await dbRun(
                `INSERT INTO result_audit_logs (result_id, action, performed_by, old_value, new_value, amendment_reason)
                 VALUES (?, 'rejected', ?, 'draft', 'rejected', ?)`,
                [result.id, rejectedBy, reason]
            );
        }
        return { rejectedCount: draftResults.length };
    }

    /**
     * Batch add results (High-throughput Technician action).
     */
    static async batchAddResults({ results, enteredBy }) {
        const createdIds = [];
        for (const r of results) {
            const res = await this.addResult({
                sampleId: r.sample_id,
                parameterName: r.parameter_name,
                value: r.value,
                unit: r.unit,
                methodReference: r.method_reference,
                measurementUncertainty: r.measurement_uncertainty,
                specificationLimit: r.specification_limit,
                passFail: r.pass_fail,
                equipmentId: r.equipment_id,
                positiveControl: r.positive_control,
                negativeControl: r.negative_control,
                incubationTime: r.incubation_time,
                incubationTemp: r.incubation_temp,
                reagentLot: r.reagent_lot,
                enteredBy: enteredBy
            });
            createdIds.push(res.id);
        }
        return { count: createdIds.length, ids: createdIds };
    }

    static async getResultAuditLogs(resultId) {
        return await dbAll(
            `SELECT l.*, u.email as performed_by_email
             FROM result_audit_logs l
             JOIN users u ON l.performed_by = u.id
             WHERE l.result_id = ?
             ORDER BY l.timestamp ASC`,
            [resultId]
        );
    }
    /**
     * Get all samples with results pending validation (Reviewer Queue).
     */
    static async getPendingReviewSamples(labId) {
        return await dbAll(
            `SELECT s.id, s.sample_code, s.description as sample_desc, r.test_description, c.company_name,
                    (SELECT COUNT(*) FROM test_results WHERE sample_id = s.id AND status = 'draft') as draft_count
             FROM samples s
             JOIN test_requests r ON s.test_request_id = r.id
             JOIN clients c ON r.client_id = c.id
             WHERE r.lab_id = ? AND EXISTS (SELECT 1 FROM test_results WHERE sample_id = s.id AND status = 'draft')
             ORDER BY r.created_at ASC`,
            [labId]
        );
    }
}

module.exports = ResultService;
