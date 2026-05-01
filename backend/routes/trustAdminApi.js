const publicDb = require('../public_database');

function registerTrustAdminRoutes(app, { authenticateToken, authorize, asyncHandler, sendSuccess }) {
    // 1. COMPANIES
    app.get('/api/admin/trust/companies', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        const companies = await publicDb.dbAll(`SELECT * FROM public_companies ORDER BY created_at DESC`, []);
        sendSuccess(res, companies);
    }));

    app.put('/api/admin/trust/companies/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        const { name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared, trust_status, featured_status } = req.body;
        await publicDb.dbRun(`
            UPDATE public_companies SET 
                name=?, industry=?, consumer_group=?, country=?, profile_summary=?, compliance_claims=?, 
                quality_practices=?, certifications_declared=?, trust_status=?, featured_status=?
            WHERE id=?
        `, [name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared, trust_status, featured_status, req.params.id]);
        sendSuccess(res, { success: true });
    }));

    app.delete('/api/admin/trust/companies/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        await publicDb.dbRun(`DELETE FROM public_brands WHERE company_id = ?`, [req.params.id]);
        await publicDb.dbRun(`DELETE FROM public_companies WHERE id = ?`, [req.params.id]);
        sendSuccess(res, { success: true });
    }));

    // 2. BRANDS
    app.get('/api/admin/trust/brands', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        const brands = await publicDb.dbAll(`
            SELECT b.*, c.name as company_name 
            FROM public_brands b 
            JOIN public_companies c ON b.company_id = c.id 
            ORDER BY b.created_at DESC
        `, []);
        sendSuccess(res, brands);
    }));

    app.put('/api/admin/trust/brands/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        const { name, category, trust_badge, brand_description, visibility_status } = req.body;
        await publicDb.dbRun(`
            UPDATE public_brands SET 
                name=?, category=?, trust_badge=?, brand_description=?, visibility_status=?
            WHERE id=?
        `, [name, category, trust_badge, brand_description, visibility_status, req.params.id]);
        sendSuccess(res, { success: true });
    }));

    app.delete('/api/admin/trust/brands/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
        await publicDb.dbRun(`DELETE FROM public_products WHERE brand_id = ?`, [req.params.id]);
        await publicDb.dbRun(`DELETE FROM public_brands WHERE id = ?`, [req.params.id]);
        sendSuccess(res, { success: true });
    }));
}

module.exports = { registerTrustAdminRoutes };
