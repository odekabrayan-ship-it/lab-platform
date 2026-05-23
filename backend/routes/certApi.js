const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun, ApiError } = require('../services/businessLogic');
const crypto = require('crypto');

// GET /api/cert/credentials - Get current user's credentials
router.get('/credentials', async (req, res, next) => {
    try {
        const pro = await dbGet(`SELECT id FROM professionals WHERE user_id = ?`, [req.user.id]);
        if (!pro) return res.json({ success: true, data: [] });
        
        const creds = await dbAll(`SELECT * FROM cert_credentials WHERE professional_id = ? ORDER BY issued_date DESC`, [pro.id]);
        res.json({ success: true, data: creds });
    } catch (err) { next(err); }
});

// POST /api/cert/applications - Submit certification application
router.post('/applications', async (req, res, next) => {
    try {
        const { certification_type, documents, professional_statement } = req.body;
        if (!certification_type) throw new ApiError('Certification type is required', 400);

        const pro = await dbGet(`SELECT id FROM professionals WHERE user_id = ?`, [req.user.id]);
        if (!pro) throw new ApiError('Professional profile not found. Please complete your profile first.', 404);

        const result = await dbRun(
            `INSERT INTO cert_applications (professional_id, certification_type, documents, professional_statement) VALUES (?, ?, ?, ?)`,
            [pro.id, certification_type, JSON.stringify(documents || []), professional_statement || '']
        );

        await dbRun(
            `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (?, 'APPLICATION_SUBMITTED', ?, ?)`,
            [result.lastID, req.user.id, JSON.stringify({ certification_type })]
        );

        res.json({ success: true, data: { id: result.lastID, message: 'Application submitted successfully.' } });
    } catch (err) { next(err); }
});

// GET /api/cert/applications - Get user's applications (or all for admin)
router.get('/applications', async (req, res, next) => {
    try {
        if (req.user.role === 'admin') {
            const apps = await dbAll(`
                SELECT ca.*, p.full_name, p.specialization, u.email
                FROM cert_applications ca
                JOIN professionals p ON ca.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                ORDER BY ca.submitted_at DESC
            `);
            return res.json({ success: true, data: apps });
        }

        const pro = await dbGet(`SELECT id FROM professionals WHERE user_id = ?`, [req.user.id]);
        if (!pro) return res.json({ success: true, data: [] });

        const apps = await dbAll(`SELECT * FROM cert_applications WHERE professional_id = ? ORDER BY submitted_at DESC`, [pro.id]);
        res.json({ success: true, data: apps });
    } catch (err) { next(err); }
});

// POST /api/cert/applications/:id/review - Admin reviews application
router.post('/applications/:id/review', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') throw new ApiError('Admin access required', 403);

        const { decision, notes } = req.body;
        if (!['APPROVED', 'REJECTED', 'MORE_INFO_NEEDED'].includes(decision)) {
            throw new ApiError('Decision must be APPROVED, REJECTED, or MORE_INFO_NEEDED', 400);
        }

        const app = await dbGet(`SELECT * FROM cert_applications WHERE id = ?`, [req.params.id]);
        if (!app) throw new ApiError('Application not found', 404);

        await dbRun(
            `UPDATE cert_applications SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, decision_notes = ? WHERE id = ?`,
            [decision, req.user.id, notes || '', req.params.id]
        );

        // If approved, auto-create credential
        if (decision === 'APPROVED') {
            const credNumber = `QC-${app.certification_type.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
            const verificationHash = crypto.randomBytes(16).toString('hex');

            await dbRun(
                `INSERT INTO cert_credentials (professional_id, credential_type, issuing_authority, credential_number, issued_date, expiry_date, status, verification_hash) VALUES (?, ?, 'QualiCore Certification Authority', ?, date('now'), date('now', '+2 years'), 'ACTIVE', ?)`,
                [app.professional_id, app.certification_type, credNumber, verificationHash]
            );
        }

        await dbRun(
            `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (?, ?, ?, ?)`,
            [req.params.id, `APPLICATION_${decision}`, req.user.id, JSON.stringify({ notes })]
        );

        res.json({ success: true, data: { message: `Application ${decision.toLowerCase()}.` } });
    } catch (err) { next(err); }
});

// GET /api/cert/registry - Public credential registry
router.get('/registry', async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT cc.credential_type, cc.credential_number, cc.issued_date, cc.expiry_date, cc.status,
                   p.full_name, p.specialization
            FROM cert_credentials cc
            JOIN professionals p ON cc.professional_id = p.id
            WHERE cc.status = 'ACTIVE'
        `;
        const params = [];

        if (search) {
            query += ` AND (p.full_name LIKE ? OR cc.credential_number LIKE ? OR p.specialization LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY cc.issued_date DESC LIMIT 50`;
        const creds = await dbAll(query, params);
        res.json({ success: true, data: creds });
    } catch (err) { next(err); }
});

// GET /api/cert/audit - Audit log (admin only)
router.get('/audit', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') throw new ApiError('Admin access required', 403);

        const logs = await dbAll(`
            SELECT cal.*, u.email as performed_by_email
            FROM cert_audit_log cal
            LEFT JOIN users u ON cal.performed_by = u.id
            ORDER BY cal.created_at DESC
            LIMIT 100
        `);
        res.json({ success: true, data: logs });
    } catch (err) { next(err); }
});

module.exports = router;
