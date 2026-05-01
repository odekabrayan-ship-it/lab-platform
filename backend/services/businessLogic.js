const db = require('../database');
const ApiError = require('../utils/ApiError');

const dbGet = (sql, params) => new Promise((resolve, reject) => db.db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbAll = (sql, params) => new Promise((resolve, reject) => db.db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const dbRun = (sql, params) => new Promise((resolve, reject) => db.db.run(sql, params, function(err) { err ? reject(err) : resolve(this) }));

class RequestLifecycleService {
    static async addSample(test_request_id, sample_code) {
        const request = await dbGet(`SELECT status FROM test_requests WHERE id = ?`, [test_request_id]);
        if (!request) throw new ApiError('Test request not found', 404);
        if (request.status === 'completed') throw new ApiError('Cannot add sample to completed request', 400);

        return await dbRun(`INSERT INTO samples (test_request_id, sample_code) VALUES (?, ?)`, [test_request_id, sample_code]);
    }

    static async completeRequest(request_id) {
        // Business Rule: Ensure all samples have at least one VALIDATED result before completing
        const samples = await dbAll(`SELECT id FROM samples WHERE test_request_id = ?`, [request_id]);
        
        if (samples.length === 0) {
            throw new ApiError('Cannot complete request: No samples have been registered.', 400);
        }

        for (const sample of samples) {
            const results = await dbGet(`SELECT count(*) as count FROM test_results WHERE sample_id = ? AND status = 'validated'`, [sample.id]);
            if (results.count === 0) {
                throw new ApiError(`Cannot complete request: Sample ${sample.id} has no validated results.`, 400);
            }
        }

        const result = await dbRun(`UPDATE test_requests SET status = 'completed' WHERE id = ?`, [request_id]);
        if (result.changes === 0) throw new ApiError('Request not found', 404);
        return result;
    }
}

module.exports = { RequestLifecycleService, dbGet, dbAll, dbRun, ApiError };
