const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { dbGet, dbAll, dbRun, ApiError } = require('../services/businessLogic');
const { generateCertificatePDF } = require('../utils/certPdf');
const {
    sendApplicationReceived,
    sendApplicationApproved,
    sendApplicationRejected,
    sendMoreInfoRequired,
    sendExpiryWarning
} = require('../utils/certEmail');

// ── File upload config ─────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../storage/cert-docs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safe = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        cb(null, safe);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Only PDF, image, and Word documents are allowed.'));
    }
});

// ── Helper ─────────────────────────────────────────────────────────────────
async function getProfessional(userId) {
    return dbGet(`SELECT * FROM professionals WHERE user_id = ?`, [userId]);
}

async function getApplicantEmail(professionalId) {
    const row = await dbGet(
        `SELECT u.email, p.full_name FROM users u JOIN professionals p ON p.user_id = u.id WHERE p.id = ?`,
        [professionalId]
    );
    return row || {};
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL PROFILE
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/cert/profile — Get current user's professional profile
router.get('/profile', async (req, res, next) => {
    try {
        const pro = await getProfessional(req.user.id);
        res.json({ success: true, data: pro || null });
    } catch (err) { next(err); }
});

// PUT /api/cert/profile — Create or update professional profile
router.put('/profile', async (req, res, next) => {
    try {
        const { full_name, specialization, institution, years_experience, phone, bio } = req.body;
        if (!full_name) throw new ApiError('Full name is required', 400);

        const existing = await getProfessional(req.user.id);
        if (existing) {
            await dbRun(
                `UPDATE professionals SET full_name=?, specialization=?, institution=?, years_experience=?, phone=?, bio=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`,
                [full_name, specialization || '', institution || '', years_experience || 0, phone || '', bio || '', req.user.id]
            );
        } else {
            await dbRun(
                `INSERT INTO professionals (user_id, full_name, specialization, institution, years_experience, phone, bio) VALUES (?,?,?,?,?,?,?)`,
                [req.user.id, full_name, specialization || '', institution || '', years_experience || 0, phone || '', bio || '']
            );
        }
        const updated = await getProfessional(req.user.id);
        res.json({ success: true, data: updated });
    } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CREDENTIALS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/cert/credentials — Get current user's credentials
router.get('/credentials', async (req, res, next) => {
    try {
        const pro = await getProfessional(req.user.id);
        if (!pro) return res.json({ success: true, data: [] });
        const creds = await dbAll(
            `SELECT * FROM cert_credentials WHERE professional_id = ? ORDER BY issued_date DESC`,
            [pro.id]
        );
        res.json({ success: true, data: creds });
    } catch (err) { next(err); }
});

// GET /api/cert/credentials/:id/download — Download PDF certificate
router.get('/credentials/:id/download', async (req, res, next) => {
    try {
        const pro = await getProfessional(req.user.id);
        if (!pro && req.user.role !== 'admin') throw new ApiError('Professional profile not found', 404);

        const whereClause = req.user.role === 'admin'
            ? `WHERE cc.id = ?`
            : `WHERE cc.id = ? AND cc.professional_id = ?`;
        const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, pro.id];

        const cred = await dbGet(
            `SELECT cc.*, p.full_name, p.specialization FROM cert_credentials cc JOIN professionals p ON cc.professional_id = p.id ${whereClause}`,
            params
        );
        if (!cred) throw new ApiError('Credential not found', 404);
        if (cred.status !== 'ACTIVE') throw new ApiError('Certificate is not active', 403);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="QualiCore-${cred.credential_number}.pdf"`);

        await dbRun(
            `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (NULL, 'CERTIFICATE_DOWNLOADED', ?, ?)`,
            [req.user.id, JSON.stringify({ credential_id: cred.id, credential_number: cred.credential_number })]
        );

        generateCertificatePDF(cred, { full_name: cred.full_name, specialization: cred.specialization }, res);
    } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// APPLICATIONS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/cert/applications — Submit application with real file uploads
router.post('/applications', upload.array('documents', 10), async (req, res, next) => {
    try {
        const { certification_type, professional_statement } = req.body;
        if (!certification_type) throw new ApiError('Certification type is required', 400);

        const pro = await getProfessional(req.user.id);
        if (!pro) throw new ApiError('Please complete your professional profile before applying.', 404);

        const uploadedFiles = (req.files || []).map(f => ({
            name: f.originalname,
            filename: f.filename,
            size: f.size,
            mimetype: f.mimetype
        }));

        const result = await dbRun(
            `INSERT INTO cert_applications (professional_id, certification_type, documents, professional_statement) VALUES (?, ?, ?, ?)`,
            [pro.id, certification_type, JSON.stringify(uploadedFiles), professional_statement || '']
        );

        await dbRun(
            `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (?, 'APPLICATION_SUBMITTED', ?, ?)`,
            [result.lastID, req.user.id, JSON.stringify({ certification_type, files: uploadedFiles.length })]
        );

        // Email notification (non-blocking)
        const userRow = await dbGet(`SELECT email FROM users WHERE id = ?`, [req.user.id]);
        sendApplicationReceived(userRow?.email, pro.full_name, certification_type).catch(() => {});

        res.json({ success: true, data: { id: result.lastID, message: 'Application submitted successfully.' } });
    } catch (err) { next(err); }
});

// GET /api/cert/applications — Get applications
router.get('/applications', async (req, res, next) => {
    try {
        if (req.user.role === 'admin') {
            const apps = await dbAll(`
                SELECT ca.*, p.full_name, p.specialization, p.institution, u.email
                FROM cert_applications ca
                JOIN professionals p ON ca.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                ORDER BY ca.submitted_at DESC
            `);
            return res.json({ success: true, data: apps });
        }
        const pro = await getProfessional(req.user.id);
        if (!pro) return res.json({ success: true, data: [] });
        const apps = await dbAll(
            `SELECT * FROM cert_applications WHERE professional_id = ? ORDER BY submitted_at DESC`,
            [pro.id]
        );
        res.json({ success: true, data: apps });
    } catch (err) { next(err); }
});

// GET /api/cert/applications/:id — Get single application detail
router.get('/applications/:id', async (req, res, next) => {
    try {
        const app = await dbGet(`
            SELECT ca.*, p.full_name, p.specialization, p.institution, p.bio, p.years_experience, u.email
            FROM cert_applications ca
            JOIN professionals p ON ca.professional_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE ca.id = ?
        `, [req.params.id]);
        if (!app) throw new ApiError('Application not found', 404);

        if (req.user.role !== 'admin') {
            const pro = await getProfessional(req.user.id);
            if (!pro || app.professional_id !== pro.id) throw new ApiError('Access denied', 403);
        }
        res.json({ success: true, data: app });
    } catch (err) { next(err); }
});

// POST /api/cert/applications/:id/review — Multi-stage admin review
router.post('/applications/:id/review', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') throw new ApiError('Admin access required', 403);

        const { decision, notes, review_stage } = req.body;
        const validDecisions = ['APPROVED', 'REJECTED', 'MORE_INFO_NEEDED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW'];
        if (!validDecisions.includes(decision)) {
            throw new ApiError(`Decision must be one of: ${validDecisions.join(', ')}`, 400);
        }

        const app = await dbGet(`SELECT * FROM cert_applications WHERE id = ?`, [req.params.id]);
        if (!app) throw new ApiError('Application not found', 404);

        await dbRun(
            `UPDATE cert_applications SET status=?, reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP, decision_notes=?, review_stage=? WHERE id=?`,
            [decision, req.user.id, notes || '', review_stage || 'INITIAL', req.params.id]
        );

        const { email, full_name } = await getApplicantEmail(app.professional_id);

        // Auto-issue credential on approval
        if (decision === 'APPROVED') {
            const credNumber = `QC-${app.certification_type.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
            const verificationHash = crypto.randomBytes(20).toString('hex');

            const credResult = await dbRun(
                `INSERT INTO cert_credentials (professional_id, credential_type, issuing_authority, credential_number, issued_date, expiry_date, status, verification_hash)
                 VALUES (?, ?, 'QualiCore Certification Authority', ?, date('now'), date('now', '+2 years'), 'ACTIVE', ?)`,
                [app.professional_id, app.certification_type, credNumber, verificationHash]
            );

            await dbRun(
                `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (?, 'CREDENTIAL_ISSUED', ?, ?)`,
                [app.id, req.user.id, JSON.stringify({ credential_number: credNumber, credential_id: credResult.lastID })]
            );

            sendApplicationApproved(email, full_name, app.certification_type, credNumber, verificationHash).catch(() => {});
        } else if (decision === 'REJECTED') {
            sendApplicationRejected(email, full_name, app.certification_type, notes).catch(() => {});
        } else if (decision === 'MORE_INFO_NEEDED') {
            sendMoreInfoRequired(email, full_name, app.certification_type, notes).catch(() => {});
        }

        await dbRun(
            `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (?, ?, ?, ?)`,
            [app.id, `APPLICATION_${decision}`, req.user.id, JSON.stringify({ notes, review_stage })]
        );

        res.json({ success: true, data: { message: `Application ${decision.toLowerCase().replace(/_/g, ' ')}.` } });
    } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CREDENTIAL REGISTRY & PUBLIC VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/cert/registry — Public searchable credential registry
router.get('/registry', async (req, res, next) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT cc.id, cc.credential_type, cc.credential_number, cc.issued_date, cc.expiry_date, cc.status,
                   cc.issuing_authority, cc.verification_hash,
                   p.full_name, p.specialization, p.institution
            FROM cert_credentials cc
            JOIN professionals p ON cc.professional_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (status) { query += ` AND cc.status = ?`; params.push(status); }
        else { query += ` AND cc.status = 'ACTIVE'`; }

        if (search) {
            query += ` AND (p.full_name LIKE ? OR cc.credential_number LIKE ? OR p.specialization LIKE ? OR p.institution LIKE ? OR cc.credential_type LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        query += ` ORDER BY cc.issued_date DESC LIMIT 100`;
        const creds = await dbAll(query, params);
        res.json({ success: true, data: creds });
    } catch (err) { next(err); }
});

// GET /api/cert/verify/:credentialNumber — Public single credential verification (no auth)
router.get('/verify/:credentialNumber', async (req, res, next) => {
    try {
        const cred = await dbGet(`
            SELECT cc.credential_type, cc.credential_number, cc.issued_date, cc.expiry_date, cc.status,
                   cc.issuing_authority, cc.verification_hash,
                   p.full_name, p.specialization, p.institution
            FROM cert_credentials cc
            JOIN professionals p ON cc.professional_id = p.id
            WHERE cc.credential_number = ?
        `, [req.params.credentialNumber]);

        if (!cred) return res.json({ success: true, data: null, verified: false });

        const now = new Date();
        const expiry = cred.expiry_date ? new Date(cred.expiry_date) : null;
        const isExpired = expiry && expiry < now;

        res.json({
            success: true,
            verified: cred.status === 'ACTIVE' && !isExpired,
            data: cred,
            isExpired,
            checkedAt: now.toISOString()
        });
    } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// RENEWAL
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/cert/credentials/:id/renew — Apply for renewal
router.post('/credentials/:id/renew', async (req, res, next) => {
    try {
        const pro = await getProfessional(req.user.id);
        if (!pro) throw new ApiError('Professional profile required', 404);

        const cred = await dbGet(
            `SELECT * FROM cert_credentials WHERE id = ? AND professional_id = ?`,
            [req.params.id, pro.id]
        );
        if (!cred) throw new ApiError('Credential not found', 404);

        // Check existing pending renewal
        const existing = await dbGet(
            `SELECT id FROM cert_applications WHERE professional_id = ? AND certification_type = ? AND status = 'SUBMITTED'`,
            [pro.id, cred.credential_type]
        );
        if (existing) throw new ApiError('A renewal application is already pending for this credential.', 409);

        const { professional_statement } = req.body;
        const result = await dbRun(
            `INSERT INTO cert_applications (professional_id, certification_type, documents, professional_statement) VALUES (?, ?, '[]', ?)`,
            [pro.id, cred.credential_type, professional_statement || 'Renewal application']
        );

        await dbRun(
            `INSERT INTO cert_audit_log (cert_application_id, action, performed_by, details) VALUES (?, 'RENEWAL_SUBMITTED', ?, ?)`,
            [result.lastID, req.user.id, JSON.stringify({ original_credential_id: cred.id, credential_number: cred.credential_number })]
        );

        const userRow = await dbGet(`SELECT email FROM users WHERE id = ?`, [req.user.id]);
        sendApplicationReceived(userRow?.email, pro.full_name, `${cred.credential_type} (Renewal)`).catch(() => {});

        res.json({ success: true, data: { id: result.lastID, message: 'Renewal application submitted.' } });
    } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/cert/audit — Full audit trail (admin only)
router.get('/audit', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') throw new ApiError('Admin access required', 403);
        const { limit = 200, action } = req.query;
        let query = `
            SELECT cal.*, u.email as performed_by_email,
                   ca.certification_type, ca.status as app_status
            FROM cert_audit_log cal
            LEFT JOIN users u ON cal.performed_by = u.id
            LEFT JOIN cert_applications ca ON cal.cert_application_id = ca.id
            WHERE 1=1
        `;
        const params = [];
        if (action) { query += ` AND cal.action = ?`; params.push(action); }
        query += ` ORDER BY cal.created_at DESC LIMIT ?`;
        params.push(parseInt(limit));
        const logs = await dbAll(query, params);
        res.json({ success: true, data: logs });
    } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// EXPIRY SWEEP — runs from cron or admin trigger
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/cert/admin/expiry-sweep — Sweep and notify expiring credentials
router.post('/admin/expiry-sweep', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') throw new ApiError('Admin access required', 403);

        // Expire overdue credentials
        await dbRun(`UPDATE cert_credentials SET status='EXPIRED' WHERE expiry_date < date('now') AND status='ACTIVE'`);

        // Find credentials expiring in next 90 days
        const expiring = await dbAll(`
            SELECT cc.*, p.full_name, p.institution, u.email
            FROM cert_credentials cc
            JOIN professionals p ON cc.professional_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE cc.status = 'ACTIVE'
              AND cc.expiry_date BETWEEN date('now') AND date('now', '+90 days')
        `);

        let notified = 0;
        for (const cred of expiring) {
            try {
                await sendExpiryWarning(cred.email, cred.full_name, cred.credential_type, cred.credential_number, cred.expiry_date);
                notified++;
            } catch (_) {}
        }

        res.json({ success: true, data: { expired_updated: true, expiry_warnings_sent: notified, expiring_credentials: expiring.length } });
    } catch (err) { next(err); }
});

module.exports = router;
