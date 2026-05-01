const publicDb = require('../public_database');

function registerTrustVigilanceRoutes(app, { authenticateToken, authorize, asyncHandler, sendSuccess }) {
    
    // 1. PUBLIC SUBMISSION
    app.post('/api/public/vigilance/report', asyncHandler(async (req, res) => {
        const { brand_id, symptom_type, severity, batch_number, description, reporter_email } = req.body;
        
        if (!brand_id || !reporter_email) {
            return res.status(400).json({ success: false, message: "Missing mandatory fields" });
        }

        const result = await publicDb.dbRun(`
            INSERT INTO public_adverse_events (brand_id, symptom_type, severity, batch_number, description, reporter_email)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [brand_id, symptom_type, severity, batch_number, description, reporter_email]);

        sendSuccess(res, { 
            report_id: result.lastID, 
            status: 'PENDING',
            message: "Adverse event report submitted for investigation."
        });
    }));

    // 2. ADMIN: GET ALL REPORTS
    app.get('/api/admin/vigilance/reports', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        const reports = await publicDb.dbAll(`
            SELECT v.*, b.name as brand_name, c.name as company_name
            FROM public_adverse_events v
            JOIN public_brands b ON v.brand_id = b.id
            JOIN public_companies c ON b.company_id = c.id
            ORDER BY v.created_at DESC
        `, []);
        sendSuccess(res, reports);
    }));

    // 3. ADMIN: UPDATE STATUS / ADD RESPONSE
    app.put('/api/admin/vigilance/reports/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        const { status, brand_response } = req.body;
        await publicDb.dbRun(`
            UPDATE public_adverse_events 
            SET status = ?, brand_response = ?
            WHERE id = ?
        `, [status, brand_response, req.params.id]);
        sendSuccess(res, { success: true });
    }));
}

module.exports = { registerTrustVigilanceRoutes };
