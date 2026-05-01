const publicDb = require('../public_database');

function registerTrustSignalRoutes(app, { asyncHandler, sendSuccess }) {
    
    // 1. POST TRUST SIGNAL (Increment confidence count)
    app.post('/api/public/brands/:id/trust-signal', asyncHandler(async (req, res) => {
        // Basic check if brand exists
        const brand = await publicDb.dbGet(`SELECT id FROM public_brands WHERE id = ?`, [req.params.id]);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        // Increment count
        await publicDb.dbRun(`
            UPDATE public_brands 
            SET trust_count = trust_count + 1 
            WHERE id = ?
        `, [req.params.id]);

        // Get updated count
        const updated = await publicDb.dbGet(`SELECT trust_count FROM public_brands WHERE id = ?`, [req.params.id]);

        sendSuccess(res, { 
            brand_id: req.params.id, 
            new_count: updated.trust_count,
            message: "Confidence signal recorded"
        });
    }));
}

module.exports = { registerTrustSignalRoutes };
