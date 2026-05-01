const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const axios = require('axios');
const BillingEngine = require('./services/BillingEngine');

// Import Business Logic Layer
const { RequestLifecycleService, dbGet, dbAll, dbRun, ApiError } = require('./services/businessLogic');
const SampleService = require('./services/sampleService');

// Import Public Trust Modules
const publicDb = require('./public_database');
const { registerTrustAdminRoutes } = require('./routes/trustAdminApi');
const { registerTrustSealRoutes } = require('./routes/trustSealApi');
const { registerTrustSignalRoutes } = require('./routes/trustSignalApi');
const { registerTrustVigilanceRoutes } = require('./routes/trustVigilanceApi');
const trustRecertService = require('./services/TrustRecertificationService');
const vigilanceEngine = require('./services/VigilanceEngine');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_qualicore_mvp';
const storageDir = path.join(__dirname, 'storage', 'reports');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

// Async Wrapper for Error Handling
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Response Formatter
const sendSuccess = (res, data, status = 200) => {
    res.status(status).json({ success: true, data });
};

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return next(new ApiError('Access token required', 401));

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return next(new ApiError('Invalid token', 403));
        req.user = user;
        next();
    });
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) return next(new ApiError('Access token required', 401));
        
        // Super Admins have global authority across all perspectives
        if (req.user.role === 'admin') return next();

        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError(`Access denied. Role: ${req.user.role}. Required: ${allowedRoles.join(' or ')}`, 403));
        }
        next();
    };
};

const authorizeSubRole = (...allowedSubRoles) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) return next();
        if (req.user.role === 'admin') return next(); // Admin bypass for sub-roles
        
        const u = await dbGet(`SELECT sub_role FROM users WHERE id = ?`, [req.user.id]);
        // If user has NO sub_role, they are the owner/director (full access)
        if (u && u.sub_role && !allowedSubRoles.includes(u.sub_role)) {
            throw new ApiError(`Access denied. Role ${u.sub_role} is not permitted to perform this action.`, 403);
        }
        next();
    });
};

const getClientId = async (userId) => {
    const u = await dbGet(`SELECT parent_client_id FROM users WHERE id = ?`, [userId]);
    if (u && u.parent_client_id) return u.parent_client_id;
    const c = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [userId]);
    if (!c) throw new ApiError('Client profile not found', 404);
    return c.id;
};

const getLabId = async (userId) => {
    const u = await dbGet(`SELECT role, parent_lab_id, parent_client_id FROM users WHERE id = ?`, [userId]);
    if (u && u.parent_lab_id) return u.parent_lab_id;
    
    // If client, look for their internal laboratory
    if (u && u.role === 'client') {
        const clientId = u.parent_client_id || (await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [userId]))?.id;
        if (clientId) {
            const l = await dbGet(`SELECT id FROM laboratories WHERE owner_company_id = ? AND is_internal = 1`, [clientId]);
            if (l) return l.id;
        }
    }
    
    const l = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [userId]);
    if (!l) {
        // Super Admins viewing from an administrative perspective can default to the primary system lab
        if (u && u.role === 'admin') {
            const defaultLab = await dbGet(`SELECT id FROM laboratories ORDER BY id ASC LIMIT 1`);
            if (defaultLab) return defaultLab.id;
        }
        throw new ApiError('Laboratory profile not found', 404);
    }
    return l.id;
};

const requireVerification = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role === 'admin') return next();
    
    let entity;
    if (req.user.role === 'lab') {
        entity = await dbGet(`SELECT verification_status FROM laboratories WHERE user_id = ?`, [req.user.id]);
    } else if (req.user.role === 'client') {
        const u = await dbGet(`SELECT parent_client_id FROM users WHERE id = ?`, [req.user.id]);
        if (u && u.parent_client_id) {
             entity = await dbGet(`SELECT verification_status FROM clients WHERE id = ?`, [u.parent_client_id]);
        } else {
             entity = await dbGet(`SELECT verification_status FROM clients WHERE user_id = ?`, [req.user.id]);
        }
    }
    
    const allowedStatuses = req.user.role === 'lab' ? ['VERIFIED', 'TRIAL_ACTIVE'] : ['active', 'trial_active'];
    if (!entity || !allowedStatuses.includes(entity.verification_status)) {
        const status = entity ? entity.verification_status : 'MISSING_PROFILE';
        throw new ApiError(`Action denied. Account status: ${status}. Full platform access requires administrator approval.`, 403);
    }
    next();
});

// --- Sovereign Subscription Sentinel ---
const runSubscriptionSentinel = async () => {
    console.log("SUBSCRIPTION OVERSIGHT: Commencing forensic audit of network memberships...");
    try {
        const expiringLabs = await dbAll(`
            SELECT user_id, name, subscription_expiry 
            FROM laboratories 
            WHERE subscription_status = 'ACTIVE' 
            AND date(subscription_expiry) <= date('now', '+7 days')
            AND date(subscription_expiry) > date('now')
        `);

        for (const lab of expiringLabs) {
            await dbRun(`INSERT INTO notifications (user_id, message, type, metadata) VALUES (?, ?, 'SUBSCRIPTION_RENEWAL', ?)`, [
                lab.user_id,
                `Urgent: Your laboratory subscription for '${lab.name}' expires on ${lab.subscription_expiry}. Please renew to prevent institutional lockout.`,
                JSON.stringify({ link: '/workspace/manager', action: 'PAYMENT' })
            ]);
        }

        const expiringPros = await dbAll(`
            SELECT user_id, full_name, subscription_expiry 
            FROM professionals 
            WHERE subscription_status = 'ACTIVE' 
            AND date(subscription_expiry) <= date('now', '+7 days')
            AND date(subscription_expiry) > date('now')
        `);

        for (const pro of expiringPros) {
            await dbRun(`INSERT INTO notifications (user_id, message, type, metadata) VALUES (?, ?, 'SUBSCRIPTION_RENEWAL', ?)`, [
                pro.user_id,
                `Specialist Notice: Your professional accreditation subscription expires on ${pro.subscription_expiry}. Renew now to maintain marketplace eligibility.`,
                JSON.stringify({ link: '/professional-profile', action: 'PAYMENT' })
            ]);
        }
        console.log(`SUBSCRIPTION OVERSIGHT: Audit complete. ${expiringLabs.length + expiringPros.length} notifications issued.`);
    } catch (err) {
        console.error("SENTINEL FAILURE:", err);
    }
};

// Admin Manual Renewal Notification
app.post('/api/admin/notify-renewal/:userId', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const user = await dbGet(`SELECT role, id FROM users WHERE id = ?`, [req.params.userId]);
    if (!user) throw new ApiError('User not found', 404);

    const link = user.role === 'lab' ? '/workspace/manager' : '/professional-profile';
    
    await dbRun(`INSERT INTO notifications (user_id, message, type, metadata) VALUES (?, ?, 'SUBSCRIPTION_RENEWAL', ?)`, [
        user.id,
        "System Administrator Alert: Your monthly subscription renewal is required. Click here to proceed to the secure payment portal.",
        JSON.stringify({ link, action: 'PAYMENT' })
    ]);
    
    sendSuccess(res, { success: true, message: "Renewal notification dispatched." });
}));

// Run sentinel on startup
runSubscriptionSentinel();

const requireActiveSubscription = asyncHandler(async (req, res, next) => {
    const user = req.user;
    let entity;
    let table = user.role === 'lab' ? 'laboratories' : 'clients';
    
    entity = await dbGet(`SELECT verification_status, trial_started_at, subscription_status, subscription_expiry FROM ${table} WHERE user_id = ?`, [user.id]);

    if (!entity) throw new ApiError('Profile not found', 404);

    // Trial state handling
    const trialStatus = user.role === 'lab' ? 'TRIAL_ACTIVE' : 'trial_active';
    const postTrialStatus = user.role === 'lab' ? 'PENDING_REVIEW' : 'payment_required';

    if (entity.verification_status === trialStatus) {
        const trialDays = Math.floor((new Date() - new Date(entity.trial_started_at)) / (1000 * 60 * 60 * 24));
        if (trialDays > 30) {
            // Auto-transition to payment required/pending review
            await dbRun(`UPDATE ${table} SET verification_status = ?, subscription_status = 'AWAITING_PAYMENT' WHERE user_id = ?`, [postTrialStatus, user.id]);
            throw new ApiError('Trial period expired. Please upgrade to a paid subscription to continue using the platform.', 402);
        }
        return next();
    }

    const activeStatus = user.role === 'lab' ? 'VERIFIED' : 'active';
    if (entity.subscription_status !== 'ACTIVE' && entity.verification_status === activeStatus) {
        throw new ApiError('Subscription inactive or expired. Access to marketplace features is restricted.', 402);
    }
    
    // Check for expiry
    if (entity.subscription_status === 'ACTIVE' && entity.subscription_expiry && new Date(entity.subscription_expiry) < new Date()) {
        await dbRun(`UPDATE ${table} SET subscription_status = 'EXPIRED' WHERE user_id = ?`, [user.id]);
        throw new ApiError('Your subscription has expired. Please renew to restore full access.', 402);
    }
    
    next();
});

// =======================
// AUTH & USERS
// =======================
app.post('/api/register', asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) throw new ApiError('Missing fields', 400);
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbRun(`INSERT INTO users (email, password, role) VALUES (?, ?, ?)`, [email, hashedPassword, role]);
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [result.lastID, 'USER_REGISTERED', JSON.stringify({ email, role })]);
    sendSuccess(res, { id: result.lastID, email, role }, 201);
}));

app.post('/api/verification/apply', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const { tier } = req.body;
    const clientId = await getClientId(req.user.id);
    
    const result = await dbRun(
        `INSERT INTO verification_applications (client_id, tier, status) VALUES (?, ?, 'PENDING')`,
        [clientId, tier]
    );

    // AUTOMATED BILLING TRIGGER
    const tierPricing = { 'LEVEL 1': 499, 'LEVEL 2': 1299, 'LEVEL 3': 2999 };
    const amount = tierPricing[tier] || 499;
    const invoice = await BillingEngine.generateTrustInvoice(clientId, tier, amount);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'verification', ?)`,
        [req.user.id, 'TRUST_ACCELERATION_APPLIED', JSON.stringify({ tier, applicationId: result.lastID, invoiceId: invoice.id })]);

    sendSuccess(res, { id: result.lastID, status: 'PENDING', invoice });
}));

app.get('/api/admin/verification-requests', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const requests = await dbAll(`
        SELECT va.*, c.company_name, c.industry_type, u.email as client_email
        FROM verification_applications va
        JOIN clients c ON va.client_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE va.status = 'PENDING'
        ORDER BY va.applied_at DESC
    `);
    sendSuccess(res, requests);
}));

app.post('/api/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await dbGet(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) throw new ApiError('User not found', 404);
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new ApiError('Invalid password', 401);

    // Fetch institutional status with Inheritance Awareness
    let status = 'NEW';
    let subStatus = 'NONE';
    
    const targetLabId = user.parent_lab_id || (user.role === 'lab' ? (await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [user.id]))?.id : null);
    const targetClientId = user.parent_client_id || (user.role === 'client' ? (await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [user.id]))?.id : null);

    if (targetLabId) {
        const lab = await dbGet(`SELECT verification_status, subscription_status FROM laboratories WHERE id = ?`, [targetLabId]);
        if (lab) { status = lab.verification_status; subStatus = lab.subscription_status; }
    } else if (targetClientId) {
        const client = await dbGet(`SELECT verification_status, subscription_status FROM clients WHERE id = ?`, [targetClientId]);
        if (client) { status = client.verification_status; subStatus = client.subscription_status; }
    } else if (user.role === 'professional') {
        const pro = await dbGet(`SELECT certification_status, subscription_status FROM professionals WHERE user_id = ?`, [user.id]);
        if (pro) { status = pro.certification_status; subStatus = pro.subscription_status; }
    }
    
    const token = jwt.sign({ 
        id: user.id, 
        role: user.role, 
        email: user.email,
        sub_role: user.sub_role,
        parent_client_id: user.parent_client_id
    }, JWT_SECRET, { expiresIn: '24h' });
    
    sendSuccess(res, { 
        token, 
        user: { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            sub_role: user.sub_role,
            parent_client_id: user.parent_client_id,
            verification_status: status,
            subscription_status: subStatus
        } 
    });
}));

// =======================
// TEAM MANAGEMENT (Enterprise RBAC)
// =======================

app.get('/api/team', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    // Only the owner can manage the team
    const u = await dbGet(`SELECT parent_client_id FROM users WHERE id = ?`, [req.user.id]);
    if (u && u.parent_client_id) throw new ApiError('Only the main company account can view the team', 403);

    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile not found', 404);

    const team = await dbAll(`
        SELECT id, email, sub_role, created_at 
        FROM users 
        WHERE parent_client_id = ?
        ORDER BY created_at DESC
    `, [client.id]);

    sendSuccess(res, team);
}));

app.post('/api/team/invite', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const { email, sub_role } = req.body;
    if (!email || !sub_role) throw new ApiError('Email and sub_role are required', 400);

    const u = await dbGet(`SELECT parent_client_id FROM users WHERE id = ?`, [req.user.id]);
    if (u && u.parent_client_id) throw new ApiError('Only the main company account can invite members', 403);

    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile not found', 404);

    const existing = await dbGet(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing) throw new ApiError('User with this email already exists', 400);

    // Generate secure temp password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await dbRun(
        `INSERT INTO users (email, password, role, sub_role, parent_client_id) VALUES (?, ?, 'client', ?, ?)`, 
        [email, hashedPassword, sub_role, client.id]
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'team', ?)`, 
        [req.user.id, 'TEAM_MEMBER_INVITED', JSON.stringify({ email, sub_role })]);

    sendSuccess(res, { id: result.lastID, email, sub_role, tempPassword }, 201);
}));

app.delete('/api/team/:id', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const u = await dbGet(`SELECT parent_client_id FROM users WHERE id = ?`, [req.user.id]);
    if (u && u.parent_client_id) throw new ApiError('Only the main company account can remove members', 403);

    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    const target = await dbGet(`SELECT id, email FROM users WHERE id = ? AND parent_client_id = ?`, [req.params.id, client.id]);
    
    if (!target) throw new ApiError('Team member not found', 404);

    await dbRun(`DELETE FROM users WHERE id = ?`, [req.params.id]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'team', ?)`, 
        [req.user.id, 'TEAM_MEMBER_REMOVED', JSON.stringify({ email: target.email })]);

    sendSuccess(res, { id: req.params.id, status: 'REMOVED' });
}));

// =======================
// QUOTING SYSTEM
// =======================

app.post('/api/quotes', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const { engagement_id, description } = req.body;
    if (!engagement_id || !description) throw new ApiError('Engagement and description are required', 400);

    const clientId = await getClientId(req.user.id);
    const engagement = await dbGet(`SELECT * FROM engagements WHERE id = ? AND client_id = ?`, [engagement_id, clientId]);
    if (!engagement) throw new ApiError('Valid engagement required', 403);

    const result = await dbRun(
        `INSERT INTO quotes (client_id, lab_id, engagement_id, description, status) VALUES (?, ?, ?, ?, 'PENDING')`,
        [clientId, engagement.lab_id, engagement_id, description]
    );

    const labUser = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [engagement.lab_id]);
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [labUser.user_id, `New quote request: ${description.substring(0, 30)}...`, 'QUOTE_REQUESTED']);

    sendSuccess(res, { id: result.lastID, status: 'PENDING' });
}));

app.get('/api/quotes/my', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const quotes = await dbAll(`
        SELECT q.*, l.name as lab_name
        FROM quotes q
        JOIN laboratories l ON q.lab_id = l.id
        WHERE q.client_id = ?
        ORDER BY q.created_at DESC
    `, [clientId]);
    sendSuccess(res, quotes);
}));

app.get('/api/quotes/lab', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const quotes = await dbAll(`
        SELECT q.*, c.company_name
        FROM quotes q
        JOIN clients c ON q.client_id = c.id
        WHERE q.lab_id = ?
        ORDER BY q.created_at DESC
    `, [lab.id]);
    sendSuccess(res, quotes);
}));

app.patch('/api/quotes/:id/issue', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { amount, valid_until, notes } = req.body;
    const labId = await getLabId(req.user.id);
    const quote = await dbGet(`SELECT * FROM quotes WHERE id = ? AND lab_id = ?`, [req.params.id, labId]);
    if (!quote) throw new ApiError('Quote not found', 404);

    await dbRun(
        `UPDATE quotes SET amount = ?, valid_until = ?, notes = ?, status = 'ISSUED', responded_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [amount, valid_until, notes, req.params.id]
    );

    const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [quote.client_id]);
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [clientUser.user_id, `Quote ISSUED: ${amount} USD. Check your procurement center.`, 'QUOTE_ISSUED']);

    sendSuccess(res, { status: 'ISSUED' });
}));

app.patch('/api/quotes/:id/accept', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const quote = await dbGet(`SELECT * FROM quotes WHERE id = ? AND client_id = ?`, [req.params.id, clientId]);
    if (!quote) throw new ApiError('Quote not found', 404);

    await dbRun(`UPDATE quotes SET status = 'ACCEPTED' WHERE id = ?`, [req.params.id]);

    const labUser = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [quote.lab_id]);
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [labUser.user_id, `Quote ACCEPTED for ${quote.description.substring(0, 20)}. Expect test requests soon.`, 'QUOTE_ACCEPTED']);

    sendSuccess(res, { status: 'ACCEPTED' });
}));

// =======================
// LABS & CLIENTS (Identity-linked)
// =======================
app.post('/api/labs', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab') throw new ApiError('Only labs can create lab profiles', 403);
    const { 
        name, organization_type, country, city, address,
        contact_person, contact_email, contact_phone,
        accreditation_status, accreditation_body, accreditation_number, accreditation_expiry,
        authorized_signatory, scope_description, equipment_summary,
        turnaround_time, operating_hours, sample_pickup, emergency_service
    } = req.body;

    const result = await dbRun(
        `INSERT INTO laboratories (
            user_id, name, organization_type, country, city, address,
            contact_person, contact_email, contact_phone,
            accreditation_status, accreditation_body, accreditation_number, accreditation_expiry,
            authorized_signatory, scope_description, equipment_summary,
            turnaround_time, operating_hours, sample_pickup, emergency_service,
            verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW')`,
        [
            req.user.id, name, organization_type, country, city, address,
            contact_person, contact_email, contact_phone,
            accreditation_status, accreditation_body, accreditation_number, accreditation_expiry,
            authorized_signatory, scope_description, equipment_summary,
            turnaround_time, operating_hours, sample_pickup, emergency_service
        ]
    );
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'LAB_PROFILE_CREATED', JSON.stringify({ id: result.lastID })]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.post('/api/labs/capabilities', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab') throw new ApiError('Only labs can add capabilities', 403);
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    if (!lab) throw new ApiError('Lab profile not found', 404);

    const { capabilities } = req.body; // Array of { test_category, test_name }
    if (!Array.isArray(capabilities)) throw new ApiError('Invalid capabilities format', 400);

    for (const cap of capabilities) {
        await dbRun(
            `INSERT INTO lab_capabilities (lab_id, test_category, test_name) VALUES (?, ?, ?)`,
            [lab.id, cap.test_category, cap.test_name]
        );
    }

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'LAB_CAPABILITIES_UPDATED', JSON.stringify({ count: capabilities.length })]);
    sendSuccess(res, { count: capabilities.length });
}));

app.get('/api/labs/search', authenticateToken, requireVerification, asyncHandler(async (req, res) => {
    const { category, accreditation, location, test_name } = req.query;
    let sql = `
        SELECT DISTINCT l.* 
        FROM laboratories l
        LEFT JOIN lab_capabilities lc ON l.id = lc.lab_id
        WHERE l.verification_status = 'VERIFIED'
    `;
    const params = [];

    if (category) {
        sql += ` AND lc.test_category LIKE ?`;
        params.push(`%${category}%`);
    }
    if (test_name) {
        sql += ` AND lc.test_name LIKE ?`;
        params.push(`%${test_name}%`);
    }
    if (accreditation) {
        sql += ` AND l.accreditation_status LIKE ?`;
        params.push(`%${accreditation}%`);
    }
    if (location) {
        sql += ` AND (l.city LIKE ? OR l.country LIKE ? OR l.address LIKE ?)`;
        params.push(`%${location}%`, `%${location}%`, `%${location}%`);
    }

    const labs = await dbAll(sql, params);
    sendSuccess(res, labs);
}));

app.get('/api/labs/me', authenticateToken, asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT * FROM laboratories WHERE user_id = ?`, [req.user.id]);
    sendSuccess(res, lab);
}));

app.get('/api/labs', authenticateToken, asyncHandler(async (req, res) => {
    sendSuccess(res, await dbAll(`SELECT * FROM laboratories WHERE verification_status = 'VERIFIED'`, []));
}));

app.post('/api/clients', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'client') throw new ApiError('Only clients can create company profiles', 403);
    const { 
        company_name, industry_type, country, city, 
        full_address, tax_id, website, company_bio,
        contact_person, contact_phone 
    } = req.body;
    
    const result = await dbRun(
        `INSERT INTO clients (
            user_id, company_name, industry_type, country, city, 
            full_address, tax_id, website, company_bio,
            contact_person, contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user.id, company_name, industry_type, country, city, 
            full_address, tax_id, website, company_bio,
            contact_person, contact_phone
        ]
    );
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'CLIENT_PROFILE_CREATED', JSON.stringify({ id: result.lastID })]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.get('/api/clients/me', authenticateToken, asyncHandler(async (req, res) => {
    const client = await dbGet(`SELECT * FROM clients WHERE user_id = ?`, [req.user.id]);
    sendSuccess(res, client);
}));

app.get('/api/clients', authenticateToken, asyncHandler(async (req, res) => {
    sendSuccess(res, await dbAll(`SELECT * FROM clients`, []));
}));

// =======================
// ENGAGEMENTS (Marketplace Trust)
// =======================
app.post('/api/engagements', authenticateToken, requireVerification, asyncHandler(async (req, res) => {
    if (req.user.role !== 'client') throw new ApiError('Only clients can request collaboration', 403);
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile required', 400);

    const { lab_id } = req.body;
    // Check if already exists (enforced by UNIQUE in DB too)
    const existing = await dbGet(`SELECT id FROM engagements WHERE client_id = ? AND lab_id = ?`, [client.id, lab_id]);
    if (existing) throw new ApiError('Collaboration request already exists', 400);

    const result = await dbRun(
        `INSERT INTO engagements (client_id, lab_id, status) VALUES (?, ?, 'PENDING')`,
        [client.id, lab_id]
    );

    // Trigger Notification for the Lab
    const labRecord = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [lab_id]);
    await dbRun(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [labRecord.user_id, `New collaboration request from ${client.company_name}`, 'ENGAGEMENT_REQUEST']
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'ENGAGEMENT_REQUESTED', JSON.stringify({ lab_id })]);
    sendSuccess(res, { id: result.lastID, status: 'PENDING' }, 201);
}));

app.get('/api/engagements/client', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'client') throw new ApiError('Access denied', 403);
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    const engagements = await dbAll(`
        SELECT e.*, l.name as lab_name, l.city, l.country 
        FROM engagements e
        JOIN laboratories l ON e.lab_id = l.id
        WHERE e.client_id = ?
    `, [client?.id]);
    sendSuccess(res, engagements);
}));
app.get('/api/engagements/lab', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab') throw new ApiError('Access denied', 403);
    const labId = await getLabId(req.user.id);
    const requests = await dbAll(`
        SELECT e.*, c.company_name, c.industry_type, c.country 
        FROM engagements e
        JOIN clients c ON e.client_id = c.id
        WHERE e.lab_id = ?
    `, [labId]);
    sendSuccess(res, requests);
}));

// --- Lab Team Management ---
app.post('/api/lab/team/invite', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const { email, password, sub_role } = req.body;
    if (!email || !password || !sub_role) throw new ApiError('Email, password, and role are required', 400);

    const labId = await getLabId(req.user.id);
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await dbRun(
        `INSERT INTO users (email, password, role, parent_lab_id, sub_role) VALUES (?, ?, 'lab', ?, ?)`,
        [email, hashedPassword, labId, sub_role]
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'lab_team', ?)`, 
        [req.user.id, 'LAB_USER_INVITED', JSON.stringify({ invited_email: email, sub_role })]);

    sendSuccess(res, { id: result.lastID, email, sub_role }, 201);
}));

app.get('/api/lab/team', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const team = await dbAll(
        `SELECT id, email, sub_role, created_at FROM users WHERE parent_lab_id = ?`,
        [labId]
    );
    sendSuccess(res, team);
}));

app.get('/api/lab/audit-ledger', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const logs = await dbAll(`
        SELECT al.*, u.email as actor_email
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE u.parent_lab_id = ? OR u.id = (SELECT user_id FROM laboratories WHERE id = ?)
        ORDER BY al.timestamp DESC
        LIMIT 200
    `, [labId, labId]);
    sendSuccess(res, logs);
}));

app.get('/api/lab/authorizations', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const auths = await dbAll(`
        SELECT a.*, u.email as staff_email, m.name as method_name, m.code as method_code
        FROM method_authorizations a
        JOIN users u ON a.user_id = u.id
        JOIN lab_methods m ON a.method_id = m.id
        WHERE a.lab_id = ?
        ORDER BY a.authorized_at DESC
    `, [labId]);
    sendSuccess(res, auths);
}));

app.post('/api/lab/authorizations', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const { user_id, method_id, expiry_at, notes } = req.body;
    const labId = await getLabId(req.user.id);
    
    // ISO 17025 Requirement: Check if staff is actually part of this lab
    const staff = await dbGet(`SELECT id FROM users WHERE id = ? AND (parent_lab_id = ? OR id = ?)`, [user_id, labId, req.user.id]);
    if (!staff) throw new ApiError('Target user is not a member of this laboratory team', 400);

    const result = await dbRun(`
        INSERT INTO method_authorizations (lab_id, user_id, method_id, authorized_by, expiry_at, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [labId, user_id, method_id, req.user.id, expiry_at, notes]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'STAFF_AUTHORIZED', 'user', ?)`, [req.user.id, user_id]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.patch('/api/lab/authorizations/:id', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const { status, expiry_at, notes } = req.body;
    const labId = await getLabId(req.user.id);
    await dbRun(`
        UPDATE method_authorizations 
        SET status = COALESCE(?, status), 
            expiry_at = COALESCE(?, expiry_at),
            notes = COALESCE(?, notes)
        WHERE id = ? AND lab_id = ?
    `, [status, expiry_at, notes, req.params.id, labId]);
    sendSuccess(res, { success: true });
}));

// --- Test Methods (SOP Registry) ---
app.get('/api/methods', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const methods = await dbAll(`SELECT * FROM lab_methods WHERE lab_id = ? ORDER BY name ASC`, [labId]);
    sendSuccess(res, methods);
}));

app.post('/api/methods', authenticateToken, authorize('lab', 'admin'), asyncHandler(async (req, res) => {
    const { name, code, description, category, equipment_needed } = req.body;
    const labId = await getLabId(req.user.id);
    const result = await dbRun(
        `INSERT INTO lab_methods (lab_id, name, code, description, category, equipment_needed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [labId, name, code, description, category, equipment_needed]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.put('/api/methods/:id', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { name, code, description, category, equipment_needed } = req.body;
    const labId = await getLabId(req.user.id);
    await dbRun(
        `UPDATE lab_methods SET name=?, code=?, description=?, category=?, equipment_needed=? WHERE id=? AND lab_id=?`,
        [name, code, description, category, equipment_needed, req.params.id, labId]
    );
    sendSuccess(res, { success: true });
}));

app.delete('/api/methods/:id', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    await dbRun(`DELETE FROM lab_methods WHERE id = ? AND lab_id = ?`, [req.params.id, labId]);
    sendSuccess(res, { success: true });
}));

app.delete('/api/lab/team/:id', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const target = await dbGet(`SELECT id FROM users WHERE id = ? AND parent_lab_id = ?`, [req.params.id, labId]);
    if (!target) throw new ApiError('Team member not found', 404);

    await dbRun(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    sendSuccess(res, { success: true });
}));

// --- Lab Storage (Inventory Locations) ---
app.get('/api/lab/storage', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const storage = await dbAll(`SELECT * FROM lab_storage WHERE lab_id = ?`, [labId]);
    sendSuccess(res, storage);
}));

app.post('/api/equipment', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const { 
        name, manufacturer, model_number, serial_number, internal_asset_id,
        location, purchase_date, criticality, calibration_interval_months,
        calibration_date, calibration_expiry 
    } = req.body;
    const labId = await getLabId(req.user.id);
    const result = await dbRun(
        `INSERT INTO lab_equipment (
            lab_id, name, manufacturer, model_number, serial_number, internal_asset_id,
            location, purchase_date, criticality, calibration_interval_months,
            calibration_date, calibration_expiry
        ) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            labId, name, manufacturer, model_number, serial_number, internal_asset_id,
            location, purchase_date, criticality, calibration_interval_months,
            calibration_date, calibration_expiry
        ]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.post('/api/lab/storage', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const { name, description, capacity } = req.body;
    const labId = await getLabId(req.user.id);
    const result = await dbRun(
        `INSERT INTO lab_storage (lab_id, name, description, capacity) VALUES (?, ?, ?, ?)`,
        [labId, name, description, capacity || 100]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.put('/api/engagements/:id/respond', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab') throw new ApiError('Only labs can respond to requests', 403);
    const { status, sla_tat, review_date, partnership_notes } = req.body; 
    if (!['ACCEPTED', 'REJECTED'].includes(status)) throw new ApiError('Invalid status', 400);

    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const eng = await dbGet(`SELECT * FROM engagements WHERE id = ? AND lab_id = ?`, [req.params.id, lab.id]);
    if (!eng) throw new ApiError('Engagement request not found', 404);

    await dbRun(
        `UPDATE engagements SET 
            status = ?, 
            sla_tat = ?, 
            review_date = ?, 
            partnership_notes = ?, 
            responded_at = CURRENT_TIMESTAMP 
         WHERE id = ?`, 
        [status, sla_tat, review_date, partnership_notes, req.params.id]
    );

    // Trigger Notification for the Client
    const clientRecord = await dbGet(`
        SELECT c.user_id, l.name as lab_name 
        FROM clients c 
        JOIN engagements e ON c.id = e.client_id 
        JOIN laboratories l ON e.lab_id = l.id
        WHERE e.id = ?
    `, [req.params.id]);

    const msg = status === 'ACCEPTED' 
        ? `Your collaboration request with ${clientRecord.lab_name} has been ACCEPTED.`
        : `Your collaboration request with ${clientRecord.lab_name} was declined.`;

    await dbRun(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [clientRecord.user_id, msg, `ENGAGEMENT_${status}`]
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'ENGAGEMENT_RESPONDED', JSON.stringify({ id: req.params.id, status, sla_tat })]);
    sendSuccess(res, { id: req.params.id, status });
}));

app.get('/api/notifications', authenticateToken, asyncHandler(async (req, res) => {
    const notifications = await dbAll(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
        [req.user.id]
    );
    sendSuccess(res, notifications);
}));

app.patch('/api/notifications/:id/read', authenticateToken, asyncHandler(async (req, res) => {
    await dbRun(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    sendSuccess(res, { id: req.params.id });
}));

app.get('/api/engagements/active', authenticateToken, asyncHandler(async (req, res) => {
    let sql, params;
    if (req.user.role === 'client') {
        const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
        sql = `
            SELECT e.*, l.name as lab_name, l.city, l.country, l.contact_email, l.turnaround_time as standard_tat
            FROM engagements e
            JOIN laboratories l ON e.lab_id = l.id
            WHERE e.client_id = ? AND e.status = 'ACCEPTED'
        `;
        params = [client?.id];
    } else {
        const labId = await getLabId(req.user.id);
        sql = `
            SELECT e.*, c.company_name, c.industry_type, c.country, c.contact_person
            FROM engagements e
            JOIN clients c ON e.client_id = c.id
            WHERE e.lab_id = ? AND e.status = 'ACCEPTED'
        `;
        params = [labId];
    }
    const active = await dbAll(sql, params);
    sendSuccess(res, active);
}));

// =======================
// TEST REQUESTS (Formal Execution)
// =======================
app.post('/api/requests', authenticateToken, requireVerification, asyncHandler(async (req, res) => {
    const { engagement_id, test_description, po_number, batch_number, request_source } = req.body;
    
    // 1. Verify engagement
    const engagement = await dbGet(`
        SELECT * FROM engagements 
        WHERE id = ? AND status = 'ACCEPTED'
    `, [engagement_id]);
    if (!engagement) throw new ApiError('Active collaboration engagement required', 403);

    const isLab = req.user.role === 'lab';
    const isClient = req.user.role === 'client';

    if (isClient) {
        const clientId = await getClientId(req.user.id);
        if (clientId !== engagement.client_id) throw new ApiError('Unauthorized engagement usage', 403);
    } else if (isLab) {
        const labId = await getLabId(req.user.id);
        if (labId !== engagement.lab_id) throw new ApiError('Unauthorized engagement usage', 403);
    } else {
        throw new ApiError('Unauthorized role', 403);
    }

    // 2. Create request
    const source = request_source || (isLab ? 'WALK_IN' : 'CLIENT_INITIATED');
    const status = isLab ? 'accepted' : 'pending'; // Lab-initiated requests are auto-accepted

    const result = await dbRun(
        `INSERT INTO test_requests (
            client_id, lab_id, engagement_id, test_description, po_number, 
            batch_number, status, request_source, initiated_by
        ) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [
            engagement.client_id, engagement.lab_id, engagement_id, test_description, 
            po_number, batch_number, status, source, req.user.id
        ]
    );

    // 3. Notify opposite party
    const targetUserId = isLab 
        ? (await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [engagement.client_id])).user_id
        : (await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [engagement.lab_id])).user_id;

    const msg = isLab 
        ? `A new walk-in test request (#${result.lastID}) has been registered for your samples.`
        : `New test request received: ${test_description.substring(0, 30)}...`;

    await dbRun(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [targetUserId, msg, isLab ? 'WALK_IN_CREATED' : 'TEST_REQUEST_RECEIVED']
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'TEST_REQUEST_CREATED', JSON.stringify({ engagement_id, id: result.lastID, source })]);
    sendSuccess(res, { id: result.lastID, status }, 201);
}));

app.get('/api/requests/client', authenticateToken, asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const requests = await dbAll(`
        SELECT r.*, l.name as lab_name,
               rp.id as report_id, rp.file_url as report_file_url, rp.report_number, rp.status as report_status
        FROM test_requests r
        JOIN laboratories l ON r.lab_id = l.id
        LEFT JOIN reports rp ON rp.test_request_id = r.id
        WHERE r.client_id = ?
        ORDER BY r.created_at DESC
    `, [clientId]);
    sendSuccess(res, requests);
}));

app.get('/api/requests/lab', authenticateToken, asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const requests = await dbAll(`
        SELECT r.*, c.company_name,
               rp.id as report_id, rp.file_url as report_file_url, rp.report_number, rp.status as report_status
        FROM test_requests r
        JOIN clients c ON r.client_id = c.id
        LEFT JOIN reports rp ON rp.test_request_id = r.id
        WHERE r.lab_id = ?
        ORDER BY r.created_at DESC
    `, [labId]);
    sendSuccess(res, requests);
}));

app.put('/api/requests/:id/respond', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
        const { status } = req.body; // accepted or rejected
    if (!['accepted', 'rejected'].includes(status)) throw new ApiError('Invalid status', 400);

    const labId = await getLabId(req.user.id);
    const request = await dbGet(`SELECT * FROM test_requests WHERE id = ? AND lab_id = ?`, [req.params.id, labId]);
    if (!request) throw new ApiError('Request not found', 404);
    if (request.status !== 'pending') throw new ApiError(`Cannot respond to a request with status '${request.status}'. Only pending requests can be accepted or rejected.`, 400);

    await dbRun(
        `UPDATE test_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, req.params.id]
    );

    // Notify Client
    const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id]);
    await dbRun(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [clientUser.user_id, `Your test request #${req.params.id} was ${status.toUpperCase()}.`, `TEST_REQUEST_${status.toUpperCase()}`]
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'system', ?)`, [req.user.id, 'TEST_REQUEST_RESPONDED', JSON.stringify({ id: req.params.id, status })]);
    sendSuccess(res, { id: req.params.id, status });
}));

app.put('/api/requests/:id/status', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
        const { status } = req.body; // in_progress or completed
    if (!['in_progress', 'completed'].includes(status)) throw new ApiError('Invalid status', 400);

    const labId = await getLabId(req.user.id);
    await dbRun(`UPDATE test_requests SET status = ? WHERE id = ? AND lab_id = ?`, [status, req.params.id, labId]);

    // Notify Client
    const request = await dbGet(`SELECT client_id FROM test_requests WHERE id = ?`, [req.params.id]);
    const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id]);
    await dbRun(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [clientUser.user_id, `Testing status updated to: ${status.replace('_', ' ').toUpperCase()}`, 'request']
    );

    sendSuccess(res, { id: req.params.id, status });
}));

app.get('/api/requests', authenticateToken, asyncHandler(async (req, res) => {
    const sql = `
        SELECT r.*, c.company_name, l.name as lab_name 
        FROM test_requests r
        JOIN clients c ON r.client_id = c.id
        JOIN laboratories l ON r.lab_id = l.id
        ORDER BY r.created_at DESC
    `;
    sendSuccess(res, await dbAll(sql, []));
}));

// Manual status update for completion (via Business Logic)
app.put('/api/requests/:id/complete', authenticateToken, asyncHandler(async (req, res) => {
    await RequestLifecycleService.completeRequest(req.params.id);
    sendSuccess(res, { message: 'Request successfully transitioned to completed' });
}));

// Generic status update for Lab Dashboard
app.put('/api/requests/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (status === 'completed') {
        await RequestLifecycleService.completeRequest(req.params.id);
    } else if (status === 'in_progress') {
        const request = await dbGet(`SELECT status FROM test_requests WHERE id = ?`, [req.params.id]);
        if (!request) throw new ApiError('Request not found', 404);
        if (request.status !== 'accepted') throw new ApiError('Can only start work on accepted requests', 400);
        await dbRun(`UPDATE test_requests SET status = 'in_progress' WHERE id = ?`, [req.params.id]);
    } else {
        throw new ApiError('Invalid status transition', 400);
    }
    sendSuccess(res, { message: 'Status updated successfully' });
}));

// =======================
// SAMPLES (Enforced via Business Logic & ISO-17025)
// =======================
app.post('/api/samples', authenticateToken, requireVerification, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only labs and internal labs can register samples', 403);
    const { 
        test_request_id, description, condition_notes, storage_location, hazard_flags,
        source_company, source_contact, tests_requested, test_specs, client_notes,
        sampling_date, sampling_location
    } = req.body;

    const result = await SampleService.registerSample({
        testRequestId: test_request_id,
        description,
        conditionNotes: condition_notes,
        receivedBy: req.user.id,
        storageLocation: storage_location,
        hazardFlags: hazard_flags,
        sourceCompany: source_company,
        sourceContact: source_contact,
        testsRequested: tests_requested,
        testSpecs: test_specs,
        clientNotes: client_notes,
        samplingDate: sampling_date,
        samplingLocation: sampling_location
    });
    sendSuccess(res, result, 201);
}));

app.get('/api/samples/request/:id', authenticateToken, asyncHandler(async (req, res) => {
    sendSuccess(res, await dbAll(`SELECT * FROM samples WHERE test_request_id = ? ORDER BY created_at DESC`, [req.params.id]));
}));

app.get('/api/samples/:id/logs', authenticateToken, asyncHandler(async (req, res) => {
    const logs = await dbAll(`
        SELECT l.*, u.email as performed_by_email 
        FROM sample_custody_logs l
        JOIN users u ON l.performed_by = u.id
        WHERE l.sample_id = ? 
        ORDER BY l.timestamp ASC
    `, [req.params.id]);
    sendSuccess(res, logs);
}));

app.get('/api/samples/:id/journey', authenticateToken, asyncHandler(async (req, res) => {
    const history = await dbAll(`
        SELECT h.*, u.email as actor_email
        FROM sample_status_history h
        LEFT JOIN users u ON h.actor_id = u.id
        WHERE h.sample_id = ?
        ORDER BY h.created_at ASC
    `, [req.params.id]);
    sendSuccess(res, history);
}));

app.put('/api/samples/:id/status', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client') throw new ApiError('Only labs and internal labs can update sample status', 403);
    const { status, notes } = req.body;
    const result = await SampleService.updateSampleStatus(req.params.id, status, req.user.id, notes);
    sendSuccess(res, result);
}));

app.patch('/api/samples/bulk-status', authenticateToken, asyncHandler(async (req, res) => {
    const { sampleIds, status, notes } = req.body;
    if (!Array.isArray(sampleIds)) throw new ApiError('sampleIds array required', 400);
    
    for (const id of sampleIds) {
        await SampleService.updateSampleStatus(id, status, req.user.id, notes);
    }
    sendSuccess(res, { success: true, count: sampleIds.length });
}));

app.post('/api/samples/:id/log', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only labs and internal labs can add custody logs', 403);
    const { action, notes } = req.body;
    const result = await SampleService.addCustodyLog(req.params.id, action, notes, req.user.id);
    sendSuccess(res, result, 201);
}));

// =======================
// RESULTS (ISO-17025 Compliant — Draft → Validated Workflow)
// =======================
const ResultService = require('./services/resultService');

// Add result (Technician)
app.post('/api/results', authenticateToken, requireVerification, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only lab users can enter results', 403);
    const { sample_id, parameter_name, value, unit, method_reference, measurement_uncertainty, specification_limit, pass_fail, equipment_id, positive_control, negative_control, incubation_time, incubation_temp, reagent_lot } = req.body;
    if (!sample_id || !parameter_name) throw new ApiError('sample_id and parameter_name are required', 400);
    const result = await ResultService.addResult({
        sampleId: sample_id,
        parameterName: parameter_name,
        value,
        unit,
        methodReference: method_reference,
        measurementUncertainty: measurement_uncertainty,
        specificationLimit: specification_limit,
        passFail: pass_fail,
        equipmentId: equipment_id,
        positiveControl: positive_control,
        negativeControl: negative_control,
        incubationTime: incubation_time,
        incubationTemp: incubation_temp,
        reagentLot: reagent_lot,
        enteredBy: req.user.id
    });
    sendSuccess(res, result, 201);
}));

// Batch add results (High-throughput Technician)
app.post('/api/results/batch', authenticateToken, requireVerification, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only lab users can enter results', 403);
    const { results } = req.body;
    if (!results || !Array.isArray(results)) throw new ApiError('Results array is required', 400);

    const result = await ResultService.batchAddResults({
        results,
        enteredBy: req.user.id
    });
    sendSuccess(res, result, 201);
}));

// Update result (only if draft)
app.put('/api/results/:id', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only lab users can update results', 403);
    const { value, unit, method_reference, measurement_uncertainty, specification_limit, pass_fail, equipment_id, positive_control, negative_control, incubation_time, incubation_temp, reagent_lot } = req.body;
    const result = await ResultService.updateResult({
        resultId: req.params.id,
        value,
        unit,
        methodReference: method_reference,
        measurementUncertainty: measurement_uncertainty,
        specificationLimit: specification_limit,
        passFail: pass_fail,
        equipmentId: equipment_id,
        positiveControl: positive_control,
        negativeControl: negative_control,
        incubationTime: incubation_time,
        incubationTemp: incubation_temp,
        reagentLot: reagent_lot,
        updatedBy: req.user.id
    });
    sendSuccess(res, result);
}));

// Amend result (ISO-17025 Amendment Workflow)
app.post('/api/results/:id/amend', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only lab users can amend results', 403);
    const { value, unit, method_reference, measurement_uncertainty, specification_limit, pass_fail, equipment_id, positive_control, negative_control, incubation_time, incubation_temp, reagent_lot, amendment_reason } = req.body;
    if (!amendment_reason) throw new ApiError('Amendment reason is required', 400);

    const result = await ResultService.amendResult({
        resultId: req.params.id,
        value,
        unit,
        methodReference: method_reference,
        measurementUncertainty: measurement_uncertainty,
        specificationLimit: specification_limit,
        passFail: pass_fail,
        equipmentId: equipment_id,
        positiveControl: positive_control,
        negativeControl: negative_control,
        incubationTime: incubation_time,
        incubationTemp: incubation_temp,
        reagentLot: reagent_lot,
        amendmentReason: amendment_reason,
        amendedBy: req.user.id
    });
    sendSuccess(res, result);
}));

// Get results by sample
app.get('/api/results/sample/:id', authenticateToken, asyncHandler(async (req, res) => {
    sendSuccess(res, await ResultService.getResultsBySample(req.params.id));
}));

// Validate all draft results for a sample (Reviewer)
app.put('/api/results/validate/:sample_id', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only lab users can validate results', 403);
    const result = await ResultService.validateResults({
        sampleId: req.params.sample_id,
        validatedBy: req.user.id
    });
    sendSuccess(res, result);
}));

// Reject draft results (Reviewer)
app.put('/api/results/reject/:sample_id', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'lab' && req.user.role !== 'client' && req.user.role !== 'admin') throw new ApiError('Only lab users can reject results', 403);
    const { reason } = req.body;
    if (!reason) throw new ApiError('Rejection reason is required', 400);

    const result = await ResultService.rejectResults({
        sampleId: req.params.sample_id,
        rejectedBy: req.user.id,
        reason
    });
    sendSuccess(res, result);
}));

// Get samples pending review (Reviewer Queue)
app.get('/api/results/pending-review', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const pending = await ResultService.getPendingReviewSamples(labId);
    sendSuccess(res, pending);
}));

// Get audit trail for a specific result
app.get('/api/results/:id/audit', authenticateToken, asyncHandler(async (req, res) => {
    sendSuccess(res, await ResultService.getResultAuditLogs(req.params.id));
}));

// =======================
// INDUSTRY INTELLIGENCE COCKPIT
// =======================
app.get('/api/industry/vigilance', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const client = await dbGet(`SELECT company_name FROM clients WHERE id = ?`, [clientId]);
    
    // Cross-link with Public Trust Registry
    const reports = await publicDb.dbAll(`
        SELECT ae.*, b.name as brand_name 
        FROM public_adverse_events ae
        JOIN public_brands b ON ae.brand_id = b.id
        JOIN public_companies c ON b.company_id = c.id
        WHERE c.name LIKE ?
        ORDER BY ae.created_at DESC LIMIT 50
    `, [`%${client.company_name}%`]);
    
    sendSuccess(res, reports);
}));

app.get('/api/industry/compliance', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    
    // Labs that this client has engagements with
    const labs = await dbAll(`
        SELECT l.id, l.name, l.accreditation_status, l.accreditation_expiry, l.verification_status
        FROM laboratories l
        JOIN engagements e ON l.id = e.lab_id
        WHERE e.client_id = ? AND e.status = 'ACCEPTED'
    `, [clientId]);
    
    sendSuccess(res, labs);
}));

// =======================
// REPORTS
// =======================

// Generate Report (Manager only)
app.post('/api/reports/generate', authenticateToken, authorize('lab', 'client'), authorizeSubRole('LAB_MANAGER', 'IQC_MANAGER'), requireVerification, asyncHandler(async (req, res) => {
    const { test_request_id, signature_pin } = req.body;

    // 0. Verify Signature PIN
    const signatory = await dbGet(`SELECT signature_pin FROM users WHERE id = ?`, [req.user.id]);
    if (!signatory.signature_pin) throw new ApiError('Signatory PIN not set. Please configure in profile.', 400);
    if (signatory.signature_pin !== signature_pin) throw new ApiError('Invalid Signature PIN', 403);

    // 1. Check report doesn't already exist
    const existingReport = await dbGet(`SELECT id FROM reports WHERE test_request_id = ?`, [test_request_id]);
    if (existingReport) throw new ApiError('A report has already been generated for this test request. Reports are immutable.', 400);

    // 2. Verify request exists, is completed, and belongs to this lab
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const request = await dbGet(`
        SELECT r.*,
               c.company_name, c.full_address as client_address, c.contact_person as client_contact,
               l.name as lab_name, l.address as lab_address, l.city as lab_city, l.country as lab_country,
               l.contact_email as lab_email, l.contact_phone as lab_phone,
               l.accreditation_number, l.accreditation_body, l.accreditation_status,
               l.authorized_signatory
        FROM test_requests r
        JOIN clients c ON r.client_id = c.id
        JOIN laboratories l ON r.lab_id = l.id
        WHERE r.id = ? AND r.lab_id = ?`, [test_request_id, lab.id]);

    if (!request) throw new ApiError('Test request not found or access denied', 404);
    if (request.status !== 'completed') throw new ApiError('Report can only be generated for completed requests', 400);

    // 3. Verify ALL samples have ALL results validated (no drafts)
    const samples = await dbAll(`SELECT id, sample_code, description, received_at FROM samples WHERE test_request_id = ?`, [test_request_id]);
    if (samples.length === 0) throw new ApiError('Cannot generate report: No samples registered for this request', 400);

    for (const sample of samples) {
        const draftCount = await dbGet(`SELECT COUNT(*) as cnt FROM test_results WHERE sample_id = ? AND status = 'draft'`, [sample.id]);
        if (draftCount.cnt > 0) throw new ApiError(`Cannot generate report: Sample ${sample.sample_code} has ${draftCount.cnt} unvalidated draft result(s). All results must be validated first.`, 400);
        const validatedCount = await dbGet(`SELECT COUNT(*) as cnt FROM test_results WHERE sample_id = ? AND status = 'validated'`, [sample.id]);
        if (validatedCount.cnt === 0) throw new ApiError(`Cannot generate report: Sample ${sample.sample_code} has no validated results.`, 400);
    }

    // 4. Generate unique report number: QC-YYYY-REQ{id}-{random4}
    const year = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reportNumber = `QC-${year}-REQ${test_request_id}-${randomSuffix}`;

    // 5. Build the PDF
    const timestamp = Date.now();
    const filename = `report_${reportNumber}.pdf`;
    const filePath = path.join(storageDir, filename);
    const fileUrl = `/reports/${filename}`;
    const verificationCode = `VR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    // In production, this would be the public URL
    const verificationUrl = `http://localhost:5173/verify/${verificationCode}`;

    // Generate QR Code Buffer
    const qrBuffer = await QRCode.toBuffer(verificationUrl, { margin: 1, scale: 4 });

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // ---- HEADER ----
    doc.fillColor('#1a1a2e').rect(0, 0, doc.page.width, 90).fill();
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(request.lab_name.toUpperCase(), 50, 20, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#a0a0c0').text('ISO/IEC 17025 ACCREDITED LABORATORY QUALITY NETWORK', { align: 'center' });
    if (request.accreditation_number) {
        doc.text(`Accreditation: ${request.accreditation_body || 'ISO/IEC 17025'} | Cert No: ${request.accreditation_number}`, { align: 'center' });
    }
    
    // Professional Badge / Stamp
    doc.save();
    doc.rotate(-15, { origin: [doc.page.width - 100, 150] });
    doc.opacity(0.1);
    doc.fillColor('#1a1a2e').fontSize(40).font('Helvetica-Bold').text('CERTIFIED DATA', doc.page.width - 350, 200);
    doc.restore();

    doc.moveDown(3);

    // ---- TITLE ----
    doc.fillColor('#1a1a2e').fontSize(16).font('Helvetica-Bold').text('TEST REPORT / CERTIFICATE OF ANALYSIS', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#4a4a8a').fontSize(10).font('Helvetica').text(`Report Number: ${reportNumber}`, { align: 'center' });
    doc.fillColor('#666').fontSize(9).text(`Date of Issue: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'center' });
    doc.moveDown(1.5);

    // ---- SEPARATOR ----
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).lineWidth(1.5).strokeColor('#4a4a8a').stroke();
    doc.moveDown(1);

    // ---- PARTIES (LAB + CLIENT) ----
    const colLeft = 50;
    const colRight = 320;
    const infoY = doc.y;

    doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('ISSUING LABORATORY', colLeft, infoY);
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    doc.text(request.lab_name, colLeft, infoY + 15);
    doc.text(`${request.lab_address || ''}, ${request.lab_city || ''}, ${request.lab_country || ''}`, colLeft);
    doc.text(`Email: ${request.lab_email || 'N/A'}   Tel: ${request.lab_phone || 'N/A'}`, colLeft);

    doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('CLIENT', colRight, infoY);
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    doc.text(request.company_name, colRight, infoY + 15);
    doc.text(request.client_address || '', colRight);
    doc.text(`Contact: ${request.client_contact || 'N/A'}`, colRight);

    doc.moveDown(4);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).lineWidth(0.5).strokeColor('#cccccc').stroke();
    doc.moveDown(1);

    // ---- REQUEST METADATA ----
    doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('TEST REQUEST DETAILS', 50);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    doc.text(`Test Request ID: #${request.id}       Description: ${request.test_description}`);
    doc.text(`Number of Samples: ${samples.length}       Request Date: ${new Date(request.created_at).toLocaleDateString('en-GB')}`);
    doc.moveDown(1);

    // ---- PER-SAMPLE RESULTS TABLES ----
    for (const sample of samples) {
        doc.moveDown(0.5);
        // Sample header bar
        const barY = doc.y;
        doc.fillColor('#f0f0f8').rect(50, barY, doc.page.width - 100, 18).fill();
        doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(9).text(
            `Sample: ${sample.sample_code}   |   Received: ${new Date(sample.received_at).toLocaleDateString('en-GB')}   |   Description: ${sample.description || 'N/A'}`,
            55, barY + 4
        );
        doc.moveDown(1.2);

        const results = await dbAll(`
            SELECT tr.*, u.email as entered_by_email, v.email as validated_by_email
            FROM test_results tr
            JOIN users u ON tr.entered_by = u.id
            LEFT JOIN users v ON tr.validated_by = v.id
            WHERE tr.sample_id = ? AND tr.status = 'validated'
            ORDER BY tr.created_at ASC`, [sample.id]);

        // Table header
        const th = doc.y;
        doc.fillColor('#1a1a2e').rect(50, th, doc.page.width - 100, 16).fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
        doc.text('Parameter', 55, th + 4);
        doc.text('Value', 190, th + 4);
        doc.text('Unit', 250, th + 4);
        doc.text('MU (±)', 290, th + 4);
        doc.text('Specification', 340, th + 4);
        doc.text('Result', 430, th + 4);
        doc.text('Method', 475, th + 4);
        doc.moveDown(1.1);

        // Table rows
        let rowBg = false;
        for (const r of results) {
            const ry = doc.y;
            if (rowBg) {
                doc.fillColor('#f7f7fc').rect(50, ry - 1, doc.page.width - 100, 15).fill();
            }
            rowBg = !rowBg;
            const pfColor = r.pass_fail === 'Pass' ? '#22863a' : r.pass_fail === 'Fail' ? '#cb2431' : '#555555';
            doc.fillColor('#222').font('Helvetica').fontSize(8);
            doc.text(r.parameter_name, 55, ry);
            doc.text(r.value || '', 190, ry);
            doc.text(r.unit || '', 250, ry);
            doc.text(r.measurement_uncertainty || '-', 290, ry);
            doc.text(r.specification_limit || '-', 340, ry);
            doc.fillColor(pfColor).font('Helvetica-Bold').text(r.pass_fail || 'N/A', 430, ry);
            doc.fillColor('#555').font('Helvetica').fontSize(7).text(r.method_reference || '-', 475, ry);
            doc.moveDown(0.9);
        }

        // Validation info per sample
        if (results.length > 0) {
            const lastResult = results[results.length - 1];
            doc.moveDown(0.3);
            doc.fillColor('#666').font('Helvetica').fontSize(7).text(
                `Results validated by: ${lastResult.validated_by_email || 'N/A'}   |   Validation date: ${lastResult.validated_at ? new Date(lastResult.validated_at).toLocaleString('en-GB') : 'N/A'}`,
                55
            );
        }
        doc.moveDown(1.5);
    }

    // ---- SIGNATURE BLOCK ----
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).lineWidth(0.5).strokeColor('#cccccc').stroke();
    doc.moveDown(1);

    const sigY = doc.y;
    doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('AUTHORIZED TECHNICAL SIGNATORY', 50, sigY);
    doc.moveDown(2.5);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).lineWidth(0.8).strokeColor('#333').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#444').text(request.authorized_signatory || '________________________________', 50);
    doc.fontSize(7).fillColor('#888').text('Signature / Name & Title', 50);

    doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('DATE OF ISSUE', colRight, sigY);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#444').text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), colRight, sigY + 15);

    // ---- COMPLIANCE DISCLAIMER ----
    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).lineWidth(0.5).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
    
    // --- DIGITAL TRUST & VERIFICATION ---
    doc.moveDown(2);
    const bottomY = doc.y;
    
    // QR Code
    doc.image(qrBuffer, 50, bottomY, { width: 60 });
    
    doc.fillColor('#333').font('Helvetica-Bold').fontSize(8).text('DIGITALLY SIGNED & VERIFIED BY:', 120, bottomY + 5);
    doc.font('Helvetica').fontSize(8).text(`Authorized Signatory: ${request.authorized_signatory || 'Verified Laboratory Personnel'}`, 120);
    doc.text(`Signatory ID: SIGN-${req.user.id} | Timestamp: ${new Date().toISOString()}`, 120);
    doc.text(`Verification ID: ${verificationCode}`, 120);
    doc.fillColor('#4a4a8a').font('Helvetica-Bold').fontSize(7).text(`SCAN TO VERIFY AUTHENTICITY ON QUALICORE NETWORK`, 120, bottomY + 45);

    // COMPLIANCE STATEMENT
    doc.moveDown(2);
    doc.fillColor('#888').font('Helvetica').fontSize(7);
    doc.text('COMPLIANCE STATEMENT: This test report is issued in accordance with the requirements of ISO/IEC 17025. The results reported herein relate only to the specific samples tested as received by the laboratory. This certificate shall not be reproduced, except in full, without the written approval of the testing laboratory. Report Reference: ' + reportNumber, 50, doc.y, { align: 'justify', width: doc.page.width - 100 });

    // Page Numbering (Footer)
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#888').fontSize(7).text(
            `Page ${i + 1} of ${range.count} | Report: ${reportNumber} | Confidential Technical Record`,
            50,
            doc.page.height - 30,
            { align: 'center' }
        );
    }

    doc.end();

    // Wait for PDF to finish writing, then create record
    await new Promise((resolve, reject) => { writeStream.on('finish', resolve); writeStream.on('error', reject); });

    // 6. Persist report record
    const reportRecord = await dbRun(
        `INSERT INTO reports (test_request_id, generated_by, signed_by, file_url, report_number, verification_code, digitally_signed_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'generated')`,
        [test_request_id, req.user.id, req.user.id, fileUrl, reportNumber, verificationCode]
    );
    const reportId = reportRecord.lastID;

    // 7. Audit logs
    await dbRun(
        `INSERT INTO report_audit_logs (report_id, action, performed_by, metadata) VALUES (?, 'generated', ?, ?)`,
        [reportId, req.user.id, JSON.stringify({ report_number: reportNumber, test_request_id })]
    );
    await dbRun(
        `INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, 'report', ?)`,
        [req.user.id, JSON.stringify({ reportId, reportNumber, test_request_id })]
    );

    // 8. Notify client
    const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id]);
    if (clientUser) {
        await dbRun(
            `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'report')`,
            [clientUser.user_id, `Your official test report (${reportNumber}) for request #${test_request_id} is now available for download.`]
        );
    }
    // Notify lab confirming generation
    await dbRun(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'report')`,
        [req.user.id, `Report ${reportNumber} has been successfully generated and delivered to the client.`]
    );

    sendSuccess(res, { id: reportId, report_number: reportNumber, file_url: fileUrl, status: 'generated' }, 201);
}));

// Public Report Verification (Zero-Auth, read-only)
app.get('/api/reports/verify/:code', asyncHandler(async (req, res) => {
    const report = await dbGet(`
        SELECT r.*, 
               l.name as lab_name, l.accreditation_number, l.accreditation_body,
               tr.test_description,
               c.company_name as client_name
        FROM reports r
        JOIN test_requests tr ON r.test_request_id = tr.id
        JOIN laboratories l ON tr.lab_id = l.id
        JOIN clients c ON tr.client_id = c.id
        WHERE r.verification_code = ?
    `, [req.params.code]);

    if (!report) throw new ApiError('Certificate not found or invalid verification code', 404);

    // Fetch all technical results for this report
    const samples = await dbAll(`SELECT id, sample_code, description FROM samples WHERE test_request_id = ?`, [report.test_request_id]);
    for (let sample of samples) {
        sample.results = await dbAll(`
            SELECT tr.* FROM test_results tr 
            WHERE tr.sample_id = ? AND tr.status = 'validated'
            ORDER BY tr.created_at ASC
        `, [sample.id]);
    }

    sendSuccess(res, { report, samples });
}));

// Get Report by ID
app.get('/api/reports/:id', authenticateToken, asyncHandler(async (req, res) => {
    const row = await dbGet(`
        SELECT rp.*, r.test_description, l.name as lab_name, c.company_name
        FROM reports rp
        JOIN test_requests r ON rp.test_request_id = r.id
        JOIN laboratories l ON r.lab_id = l.id
        JOIN clients c ON r.client_id = c.id
        WHERE rp.id = ?`, [req.params.id]);
    if (!row) throw new ApiError('Report not found', 404);

    // Log access
    await dbRun(
        `INSERT INTO report_audit_logs (report_id, action, performed_by, metadata) VALUES (?, 'accessed', ?, ?)`,
        [row.id, req.user.id, JSON.stringify({ ip: req.ip })]
    );
    sendSuccess(res, row);
}));

// Download Report (logs the download action)
app.get('/api/reports/:id/download', authenticateToken, asyncHandler(async (req, res) => {
    const row = await dbGet(`SELECT * FROM reports WHERE id = ?`, [req.params.id]);
    if (!row) throw new ApiError('Report not found', 404);

    // Mark as delivered on first download
    if (row.status === 'generated') {
        await dbRun(`UPDATE reports SET status = 'delivered' WHERE id = ?`, [row.id]);
    }

    // Log the download
    await dbRun(
        `INSERT INTO report_audit_logs (report_id, action, performed_by, metadata) VALUES (?, 'downloaded', ?, ?)`,
        [row.id, req.user.id, JSON.stringify({ report_number: row.report_number })]
    );
    await dbRun(
        `INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, 'REPORT_DOWNLOADED', ?)`,
        [req.user.id, JSON.stringify({ reportId: row.id, report_number: row.report_number })]
    );

    // Return the download URL for the client to redirect to
    sendSuccess(res, { file_url: row.file_url, report_number: row.report_number });
}));

// Get all reports (enhanced with quality summary and procurement metadata)
app.get('/api/reports/my/list', authenticateToken, asyncHandler(async (req, res) => {
    let reports;
    if (req.user.role === 'client') {
        const clientId = await getClientId(req.user.id);
        reports = await dbAll(`
            SELECT rp.*, l.name as lab_name, r.test_description, r.po_number, r.batch_number,
                   (SELECT COUNT(*) FROM test_results tr JOIN samples s ON tr.sample_id = s.id WHERE s.test_request_id = rp.test_request_id AND tr.pass_fail = 'Pass') as pass_count,
                   (SELECT COUNT(*) FROM test_results tr JOIN samples s ON tr.sample_id = s.id WHERE s.test_request_id = rp.test_request_id AND tr.pass_fail = 'Fail') as fail_count,
                   (SELECT COUNT(*) FROM samples s WHERE s.test_request_id = rp.test_request_id) as sample_count
            FROM reports rp
            JOIN test_requests r ON rp.test_request_id = r.id
            JOIN laboratories l ON r.lab_id = l.id
            WHERE r.client_id = ?
            ORDER BY rp.created_at DESC`, [clientId]);
    } else {
        const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
        reports = await dbAll(`
            SELECT rp.*, c.company_name, r.test_description, r.po_number, r.batch_number,
                   (SELECT COUNT(*) FROM test_results tr JOIN samples s ON tr.sample_id = s.id WHERE s.test_request_id = rp.test_request_id AND tr.pass_fail = 'Pass') as pass_count,
                   (SELECT COUNT(*) FROM test_results tr JOIN samples s ON tr.sample_id = s.id WHERE s.test_request_id = rp.test_request_id AND tr.pass_fail = 'Fail') as fail_count,
                   (SELECT COUNT(*) FROM samples s WHERE s.test_request_id = rp.test_request_id) as sample_count
            FROM reports rp
            JOIN test_requests r ON rp.test_request_id = r.id
            JOIN clients c ON r.client_id = c.id
            WHERE r.lab_id = ?
            ORDER BY rp.created_at DESC`, [lab?.id]);
    }
    sendSuccess(res, reports);
}));

// =======================
// LAB INTELLIGENCE & OPERATIONS (Director's View)
// =======================

app.get('/api/analytics/lab', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const lid = lab.id;

    // 1. Revenue Metrics
    const billing = await dbGet(`
        SELECT SUM(amount) as total_invoiced, 
               SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as collected
        FROM invoices WHERE lab_id = ?
    `, [lid]);

    // 2. Turnaround Time (TAT) Average (Accepted to Completed in days)
    const tat = await dbGet(`
        SELECT AVG(julianday(responded_at) - julianday(created_at)) as avg_tat
        FROM test_requests 
        WHERE lab_id = ? AND status = 'completed' AND responded_at IS NOT NULL
    `, [lid]);

    // 3. Lab Load (Current active samples)
    const load = await dbGet(`
        SELECT COUNT(*) as active_samples
        FROM samples s
        JOIN test_requests tr ON s.test_request_id = tr.id
        WHERE tr.lab_id = ? AND s.status IN ('received', 'in_testing')
    `, [lid]);

    // 4. Quality Stats (Amendments & Rejections)
    const quality = await dbGet(`
        SELECT COUNT(*) as total_amendments
        FROM result_audit_logs al
        JOIN test_results tr ON al.result_id = tr.id
        JOIN samples s ON tr.sample_id = s.id
        JOIN test_requests req ON s.test_request_id = req.id
        WHERE req.lab_id = ? AND al.action = 'amended'
    `, [lid]);

    sendSuccess(res, {
        revenue: {
            total_invoiced: billing.total_invoiced || 0,
            collected: billing.collected || 0
        },
        tat_days: tat.avg_tat ? tat.avg_tat.toFixed(1) : 'N/A',
        active_samples: load.active_samples || 0,
        quality_events: quality.total_amendments || 0
    });
}));

// Equipment Registry
app.post('/api/equipment', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const { name, model_number, serial_number, calibration_date, calibration_expiry } = req.body;
    const result = await dbRun(`
        INSERT INTO lab_equipment (lab_id, name, model_number, serial_number, calibration_date, calibration_expiry)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [lab.id, name, model_number, serial_number, calibration_date, calibration_expiry]);
    sendSuccess(res, { id: result.lastID });
}));

app.get('/api/equipment', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const equipment = await dbAll(`SELECT * FROM lab_equipment WHERE lab_id = ?`, [lab.id]);
    sendSuccess(res, equipment);
}));

app.patch('/api/equipment/:id/status', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    await dbRun(`UPDATE lab_equipment SET status = ? WHERE id = ?`, [status, req.params.id]);
    sendSuccess(res, { success: true });
}));

// Equipment Lifecycle Logs
app.get('/api/equipment/:id/logs', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const logs = await dbAll(`
        SELECT l.*, u.email as performed_by_email
        FROM equipment_logs l
        JOIN users u ON l.performed_by = u.id
        WHERE l.equipment_id = ?
        ORDER BY l.performed_at DESC
    `, [req.params.id]);
    sendSuccess(res, logs);
}));

// --- Reagents & Consumables ---
app.get('/api/reagents', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const reagents = await dbAll(`SELECT * FROM lab_reagents WHERE lab_id = ?`, [labId]);
    sendSuccess(res, reagents);
}));

app.post('/api/reagents', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const { name, manufacturer, lot_number, expiry_date, opened_at } = req.body;
    const labId = await getLabId(req.user.id);
    const result = await dbRun(
        `INSERT INTO lab_reagents (lab_id, name, manufacturer, lot_number, expiry_date, opened_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [labId, name, manufacturer, lot_number, expiry_date, opened_at]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.put('/api/requests/:id/respond', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    // status can be: accepted, rejected, TECHNICAL_REVIEW, RELEASED
    const labId = await getLabId(req.user.id);
    await dbRun(`UPDATE test_requests SET status = ? WHERE id = ? AND lab_id = ?`, [status, req.params.id, labId]);
    
    // Auto-log the transition for audit
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, 'request', ?)`, [req.user.id, `REQUEST_TRANSITION_${status.toUpperCase()}`, req.params.id]);
    
    sendSuccess(res, { message: `Request updated to ${status}` });
}));

app.patch('/api/reagents/:id/status', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    const labId = await getLabId(req.user.id);
    await dbRun(`UPDATE lab_reagents SET status = ? WHERE id = ? AND lab_id = ?`, [status, req.params.id, labId]);
    sendSuccess(res, { success: true });
}));

app.post('/api/equipment/:id/logs', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { action_type, notes } = req.body;
    await dbRun(
        `INSERT INTO equipment_logs (equipment_id, performed_by, action_type, notes) VALUES (?, ?, ?, ?)`,
        [req.params.id, req.user.id, action_type, notes]
    );

    // Update timestamps
    if (action_type === 'CLEANING') {
        await dbRun(`UPDATE lab_equipment SET last_cleaning_date = DATE('now') WHERE id = ?`, [req.params.id]);
    } else if (action_type === 'MAINTENANCE') {
        await dbRun(`UPDATE lab_equipment SET last_maintenance_date = DATE('now') WHERE id = ?`, [req.params.id]);
    }
    
    sendSuccess(res, { success: true }, 201);
}));

app.get('/api/results/all-audit', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const logs = await dbAll(`
        SELECT al.*, tr.parameter_name, u.email as performer_email
        FROM result_audit_logs al
        JOIN test_results tr ON al.result_id = tr.id
        JOIN samples s ON tr.sample_id = s.id
        JOIN test_requests req ON s.test_request_id = req.id
        JOIN users u ON al.performed_by = u.id
        WHERE req.lab_id = ?
        ORDER BY al.timestamp DESC
        LIMIT 100
    `, [lab.id]);
    sendSuccess(res, logs);
}));

// =======================
// ANALYTICS (Client Intelligence Dashboard)

// =======================
app.get('/api/analytics/client', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile not found', 404);
    const cid = client.id;

    // Core KPIs
    const total      = await dbGet(`SELECT COUNT(*) as c FROM test_requests WHERE client_id = ?`, [cid]);
    const active     = await dbGet(`SELECT COUNT(*) as c FROM test_requests WHERE client_id = ? AND status IN ('pending','accepted','in_progress')`, [cid]);
    const completed  = await dbGet(`SELECT COUNT(*) as c FROM test_requests WHERE client_id = ? AND status = 'completed'`, [cid]);
    const rejected   = await dbGet(`SELECT COUNT(*) as c FROM test_requests WHERE client_id = ? AND status = 'rejected'`, [cid]);
    const reports    = await dbGet(`SELECT COUNT(*) as c FROM reports rp JOIN test_requests r ON rp.test_request_id = r.id WHERE r.client_id = ?`, [cid]);

    // Pass Rate across all validated results for this client
    const passRow    = await dbGet(`
        SELECT 
            SUM(CASE WHEN tr.pass_fail = 'Pass' THEN 1 ELSE 0 END) as passes,
            SUM(CASE WHEN tr.pass_fail = 'Fail' THEN 1 ELSE 0 END) as fails,
            COUNT(*) as total
        FROM test_results tr
        JOIN samples s ON tr.sample_id = s.id
        JOIN test_requests req ON s.test_request_id = req.id
        WHERE req.client_id = ? AND tr.status = 'validated' AND tr.pass_fail IN ('Pass','Fail')
    `, [cid]);
    const passRate = passRow.total > 0 ? Math.round((passRow.passes / passRow.total) * 100) : null;

    // Monthly request counts (last 6 months)
    const monthlyData = await dbAll(`
        SELECT 
            strftime('%Y-%m', created_at) as month,
            COUNT(*) as count
        FROM test_requests
        WHERE client_id = ? AND created_at >= date('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC
    `, [cid]);

    // Lab Performance (per active engagement)
    const labPerf = await dbAll(`
        SELECT 
            l.name as lab_name,
            l.city,
            e.sla_tat,
            COUNT(DISTINCT r.id) as total_requests,
            SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
            ROUND(AVG(
                CASE WHEN r.status = 'completed' AND r.responded_at IS NOT NULL
                THEN (julianday(r.responded_at) - julianday(r.created_at))
                ELSE NULL END
            ), 1) as avg_days,
            SUM(CASE WHEN tr.pass_fail = 'Pass' THEN 1 ELSE 0 END) as pass_count,
            SUM(CASE WHEN tr.pass_fail = 'Fail' THEN 1 ELSE 0 END) as fail_count
        FROM engagements e
        JOIN laboratories l ON e.lab_id = l.id
        LEFT JOIN test_requests r ON r.engagement_id = e.id
        LEFT JOIN samples s ON s.test_request_id = r.id
        LEFT JOIN test_results tr ON tr.sample_id = s.id AND tr.status = 'validated'
        WHERE e.client_id = ? AND e.status = 'ACCEPTED'
        GROUP BY e.id, l.name, l.city, e.sla_tat
    `, [cid]);

    // Recent Activity (last 8 actions)
    const recentActivity = await dbAll(`
        SELECT 
            a.timestamp,
            a.action as event,
            a.entity_type as scope,
            a.new_value as details
        FROM audit_logs a
        WHERE a.user_id = ?
        ORDER BY a.timestamp DESC
        LIMIT 8
    `, [req.user.id]);

    // Outstanding invoices summary
    const invoiceSummary = await dbGet(`
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'UNPAID' THEN amount ELSE 0 END), 0) as outstanding,
            COUNT(CASE WHEN status = 'UNPAID' THEN 1 END) as unpaid_count
        FROM invoices WHERE client_id = ?
    `, [cid]);

    // Live Batch Radar (Top 5 most active/recent batches)
    const activeBatches = await dbAll(`
        SELECT r.id, r.test_description, r.status, l.name as lab_name, r.created_at,
               (SELECT COUNT(*) FROM samples WHERE test_request_id = r.id) as sample_count,
               (SELECT status FROM samples WHERE test_request_id = r.id ORDER BY updated_at DESC LIMIT 1) as current_phase
        FROM test_requests r
        JOIN laboratories l ON r.lab_id = l.id
        WHERE r.client_id = ? AND r.status NOT IN ('completed', 'rejected')
        ORDER BY r.created_at DESC
        LIMIT 5
    `, [cid]);

    sendSuccess(res, {
        activeBatches,
        kpis: {
            totalRequests: total.c,
            activeRequests: active.c,
            completedRequests: completed.c,
            rejectedRequests: rejected.c,
            totalReports: reports.c,
            passRate,
            passCount: passRow.passes || 0,
            failCount: passRow.fails || 0
        },
        monthlyActivity: monthlyData,
        labPerformance: labPerf,
        recentActivity,
        invoiceSummary
    });
}));

// =======================
// PRODUCT SPECIFICATIONS (QA Library)
// =======================
app.get('/api/specs', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile not found', 404);
    const specs = await dbAll(`SELECT * FROM product_specifications WHERE client_id = ? ORDER BY product_name, parameter_name`, [client.id]);
    sendSuccess(res, specs);
}));

app.post('/api/specs', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const { product_name, parameter_name, limit_type, limit_value, unit, method_reference } = req.body;
    if (!product_name || !parameter_name || !limit_type) throw new ApiError('Missing required fields', 400);

    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile not found', 404);

    const result = await dbRun(`
        INSERT INTO product_specifications (client_id, product_name, parameter_name, limit_type, limit_value, unit, method_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [client.id, product_name, parameter_name, limit_type, limit_value, unit, method_reference]);

    sendSuccess(res, { id: result.id }, 'Specification saved to library');
}));

app.delete('/api/specs/:id', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    if (!client) throw new ApiError('Client profile not found', 404);

    await dbRun(`DELETE FROM product_specifications WHERE id = ? AND client_id = ?`, [req.params.id, client.id]);
    sendSuccess(res, null, 'Specification removed from library');
}));

// =======================
// INTERNAL PLANT LABS
// =======================
app.get('/api/lab/internal', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const lab = await dbGet(`SELECT * FROM laboratories WHERE owner_company_id = ? AND is_internal = 1`, [clientId]);
    sendSuccess(res, lab);
}));

app.post('/api/lab/internal/init', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const client = await dbGet(`SELECT company_name FROM clients WHERE id = ?`, [clientId]);
    if (!client) throw new ApiError('Client profile not found', 404);

    // Check if already exists
    const existing = await dbGet(`SELECT id FROM laboratories WHERE owner_company_id = ? AND is_internal = 1`, [clientId]);
    if (existing) throw new ApiError('Internal lab already initialized', 400);

    const result = await dbRun(`
        INSERT INTO laboratories (user_id, name, is_internal, owner_company_id, availability_status, verification_status)
        VALUES (?, ?, 1, ?, 'active', 'VERIFIED')
    `, [req.user.id, `${client.company_name} Plant Lab`, clientId]);

    sendSuccess(res, { id: result.lastID, message: 'Plant Operating System Initialized' });
}));

// =======================
// INVOICES (Billing & Procurement)
// =======================

// Lab creates invoice for a completed test request
app.post('/api/invoices', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { test_request_id, amount, currency, description, due_date, notes } = req.body;
    if (!test_request_id || !amount) throw new ApiError('test_request_id and amount are required', 400);

    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    if (!lab) throw new ApiError('Lab profile not found', 404);

    const request = await dbGet(`SELECT * FROM test_requests WHERE id = ? AND lab_id = ?`, [test_request_id, lab.id]);
    if (!request) throw new ApiError('Test request not found or access denied', 404);

    // Check for existing invoice
    const existing = await dbGet(`SELECT id FROM invoices WHERE test_request_id = ?`, [test_request_id]);
    if (existing) throw new ApiError('An invoice already exists for this test request', 400);

    const year = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice_number = `INV-${year}-${test_request_id}-${randomSuffix}`;

    const result = await dbRun(
        `INSERT INTO invoices (test_request_id, lab_id, client_id, invoice_number, po_number, amount, currency, description, due_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [test_request_id, lab.id, request.client_id, invoice_number, request.po_number, parseFloat(amount), currency || 'USD', description, due_date, notes]
    );

    // Notify client
    const clientUser = await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id]);
    if (clientUser) {
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
            [clientUser.user_id, `New invoice ${invoice_number} received for test request #${test_request_id}. Amount: ${currency || 'USD'} ${amount}`, 'billing']);
    }
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'invoice', ?)`,
        [req.user.id, 'INVOICE_CREATED', JSON.stringify({ invoice_number, amount, test_request_id })]);

    sendSuccess(res, { id: result.lastID, invoice_number, status: 'UNPAID' }, 201);
}));

// Get invoices (client or lab)
app.get('/api/invoices/my', authenticateToken, asyncHandler(async (req, res) => {
    let rows;
    if (req.user.role === 'client') {
        const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
        rows = await dbAll(`
            SELECT inv.*, r.test_description, l.name as lab_name
            FROM invoices inv
            JOIN test_requests r ON inv.test_request_id = r.id
            JOIN laboratories l ON inv.lab_id = l.id
            WHERE inv.client_id = ?
            ORDER BY inv.created_at DESC
        `, [client?.id]);
    } else if (req.user.role === 'lab') {
        const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
        rows = await dbAll(`
            SELECT inv.*, r.test_description, c.company_name
            FROM invoices inv
            JOIN test_requests r ON inv.test_request_id = r.id
            JOIN clients c ON inv.client_id = c.id
            WHERE inv.lab_id = ?
            ORDER BY inv.created_at DESC
        `, [lab?.id]);
    } else {
        throw new ApiError('Access denied', 403);
    }
    sendSuccess(res, rows);
}));

// Client marks invoice as paid
app.patch('/api/invoices/:id/pay', authenticateToken, authorize('client'), authorizeSubRole('PROCUREMENT_MANAGER'), asyncHandler(async (req, res) => {
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    const inv = await dbGet(`SELECT * FROM invoices WHERE id = ? AND client_id = ?`, [req.params.id, client.id]);
    if (!inv) throw new ApiError('Invoice not found', 404);
    if (inv.status !== 'UNPAID') throw new ApiError(`Invoice cannot be paid — current status: ${inv.status}`, 400);

    await dbRun(`UPDATE invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    // Notify lab
    const labUser = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [inv.lab_id]);
    if (labUser) {
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
            [labUser.user_id, `Invoice ${inv.invoice_number} has been marked as PAID by the client.`, 'billing']);
    }
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'invoice', ?)`,
        [req.user.id, 'INVOICE_PAID', JSON.stringify({ invoice_id: req.params.id, invoice_number: inv.invoice_number })]);
    sendSuccess(res, { id: req.params.id, status: 'PAID' });
}));

// Client disputes an invoice
app.patch('/api/invoices/:id/dispute', authenticateToken, authorize('client'), authorizeSubRole('PROCUREMENT_MANAGER'), asyncHandler(async (req, res) => {
    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    const inv = await dbGet(`SELECT * FROM invoices WHERE id = ? AND client_id = ?`, [req.params.id, client.id]);
    if (!inv) throw new ApiError('Invoice not found', 404);
    if (inv.status === 'PAID') throw new ApiError('Cannot dispute a paid invoice', 400);

    await dbRun(`UPDATE invoices SET status = 'DISPUTED' WHERE id = ?`, [req.params.id]);

    const labUser = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [inv.lab_id]);
    if (labUser) {
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
            [labUser.user_id, `Invoice ${inv.invoice_number} has been DISPUTED by the client. Please review.`, 'billing']);
    }
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'invoice', ?)`,
        [req.user.id, 'INVOICE_DISPUTED', JSON.stringify({ invoice_id: req.params.id })]);
    sendSuccess(res, { id: req.params.id, status: 'DISPUTED' });
}));

// Lab cancels an invoice
app.patch('/api/invoices/:id/cancel', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const inv = await dbGet(`SELECT * FROM invoices WHERE id = ? AND lab_id = ?`, [req.params.id, lab.id]);
    if (!inv) throw new ApiError('Invoice not found', 404);
    if (inv.status === 'PAID') throw new ApiError('Cannot cancel a paid invoice', 400);

    await dbRun(`UPDATE invoices SET status = 'CANCELLED' WHERE id = ?`, [req.params.id]);
    sendSuccess(res, { id: req.params.id, status: 'CANCELLED' });
}));

// =======================
// DISPUTES (Non-Conformance Center)
// =======================

// Client raises a dispute
app.post('/api/disputes', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const { test_request_id, report_id, dispute_type, description } = req.body;
    if (!test_request_id || !dispute_type || !description) throw new ApiError('test_request_id, dispute_type, and description are required', 400);
    const validTypes = ['RESULT_CHALLENGE', 'RETEST_REQUEST', 'DELIVERY_DELAY', 'BILLING_DISPUTE'];
    if (!validTypes.includes(dispute_type)) throw new ApiError('Invalid dispute_type', 400);

    const client = await dbGet(`SELECT id FROM clients WHERE user_id = ?`, [req.user.id]);
    const request = await dbGet(`SELECT * FROM test_requests WHERE id = ? AND client_id = ?`, [test_request_id, client.id]);
    if (!request) throw new ApiError('Test request not found or access denied', 404);

    const result = await dbRun(
        `INSERT INTO disputes (test_request_id, report_id, raised_by, dispute_type, description) VALUES (?, ?, ?, ?, ?)`,
        [test_request_id, report_id || null, req.user.id, dispute_type, description]
    );

    // Notify lab
    const labUser = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [request.lab_id]);
    if (labUser) {
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
            [labUser.user_id, `A new dispute has been raised for test request #${test_request_id}: ${dispute_type.replace(/_/g,' ')}`, 'dispute']);
    }
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'dispute', ?)`,
        [req.user.id, 'DISPUTE_RAISED', JSON.stringify({ test_request_id, dispute_type })]);

    sendSuccess(res, { id: result.lastID, status: 'OPEN' }, 201);
}));

// Client views their disputes
app.get('/api/disputes/my', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const rows = await dbAll(`
        SELECT d.*, r.test_description, l.name as lab_name,
               u.email as raised_by_email, ru.email as resolved_by_email
        FROM disputes d
        JOIN test_requests r ON d.test_request_id = r.id
        JOIN laboratories l ON r.lab_id = l.id
        JOIN users u ON d.raised_by = u.id
        LEFT JOIN users ru ON d.resolved_by = ru.id
        WHERE d.raised_by = ?
        ORDER BY d.created_at DESC
    `, [req.user.id]);
    sendSuccess(res, rows);
}));

// Lab views disputes raised against them
app.get('/api/disputes/lab', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const rows = await dbAll(`
        SELECT d.*, r.test_description, c.company_name,
               u.email as raised_by_email, ru.email as resolved_by_email
        FROM disputes d
        JOIN test_requests r ON d.test_request_id = r.id
        JOIN clients c ON r.client_id = c.id
        JOIN users u ON d.raised_by = u.id
        LEFT JOIN users ru ON d.resolved_by = ru.id
        WHERE r.lab_id = ?
        ORDER BY d.created_at DESC
    `, [lab?.id]);
    sendSuccess(res, rows);
}));

// Lab resolves a dispute
app.patch('/api/disputes/:id/resolve', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { resolution_notes, status } = req.body;
    const resolveStatus = status || 'RESOLVED';
    if (!['UNDER_REVIEW','RESOLVED','CLOSED'].includes(resolveStatus)) throw new ApiError('Invalid resolution status', 400);

    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const dispute = await dbAll(`
        SELECT d.* FROM disputes d
        JOIN test_requests r ON d.test_request_id = r.id
        WHERE d.id = ? AND r.lab_id = ?
    `, [req.params.id, lab.id]);
    if (!dispute.length) throw new ApiError('Dispute not found or access denied', 404);
    const d = dispute[0];

    await dbRun(`
        UPDATE disputes SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [resolveStatus, resolution_notes, req.user.id, req.params.id]);

    // Notify the client who raised the dispute
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [d.raised_by, `Your dispute for test request #${d.test_request_id} has been updated to: ${resolveStatus}`, 'dispute']);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'dispute', ?)`,
        [req.user.id, 'DISPUTE_RESOLVED', JSON.stringify({ dispute_id: req.params.id, status: resolveStatus })]);
    sendSuccess(res, { id: req.params.id, status: resolveStatus });
}));

// Lab can set dispute to UNDER_REVIEW
app.patch('/api/disputes/:id/review', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const dispute = await dbAll(`
        SELECT d.* FROM disputes d
        JOIN test_requests r ON d.test_request_id = r.id
        WHERE d.id = ? AND r.lab_id = ?
    `, [req.params.id, lab.id]);
    if (!dispute.length) throw new ApiError('Dispute not found or access denied', 404);
    const d = dispute[0];

    await dbRun(`UPDATE disputes SET status = 'UNDER_REVIEW' WHERE id = ?`, [req.params.id]);
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [d.raised_by, `Your dispute for test request #${d.test_request_id} is now UNDER REVIEW by the laboratory.`, 'dispute']);
    sendSuccess(res, { id: req.params.id, status: 'UNDER_REVIEW' });
}));

// =================// --- M-PESA INTEGRATION HELPERS ---
async function getMpesaAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY || "YOUR_KEY";
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || "YOUR_SECRET";
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const res = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        { headers: { Authorization: `Basic ${auth}` } }
    );
    return res.data.access_token;
}

async function markPaymentAsPaid(receipt, amount, phone, checkoutRequestId) {
    // 1. Update Payment Record
    await dbRun(
        `UPDATE payments SET status = 'PAID', mpesa_receipt = ? WHERE checkout_request_id = ?`,
        [receipt, checkoutRequestId]
    );

    // 2. Find associated payment record for context
    const payment = await dbGet(`SELECT * FROM payments WHERE checkout_request_id = ?`, [checkoutRequestId]);
    
    if (payment) {
        if (payment.payment_type === 'SUBSCRIPTION') { 
              // SUBSCRIPTION PAYMENT
              const metadata = JSON.parse(payment.metadata || '{}');
              const tier = metadata.tier || 'MONTHLY';
              const duration = tier === 'ANNUAL' ? '+1 year' : '+30 days';

              const user = await dbGet(`SELECT role FROM users WHERE id = ?`, [payment.payer_user_id]);
              let table;
              let activeStatusField = 'subscription_status';
              let activeStatusValue = 'ACTIVE';
              let verificationField = 'verification_status';
              let verificationValue;

              if (user.role === 'lab') {
                  table = 'laboratories';
                  verificationValue = 'VERIFIED';
              } else if (user.role === 'client') {
                  table = 'clients';
                  verificationValue = 'active';
              } else if (user.role === 'professional') {
                  table = 'professionals';
                  verificationField = 'certification_status';
                  verificationValue = 'approved';
              }

              if (table) {
                  await dbRun(`UPDATE ${table} SET subscription_status = 'ACTIVE', ${verificationField} = ?, subscription_expiry = date('now', ?) WHERE user_id = ?`, 
                      [verificationValue, duration, payment.payer_user_id]);
                  
                  await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                     [payment.payer_user_id, `SUCCESS: Your ${tier} subscription is now ACTIVE. Professional network visibility restored.`, 'SUBSCRIPTION']);
                  console.log(`SUBSCRIPTION ACTIVATED for ${user.role} #${payment.payer_user_id} (${tier})`);
              }
        } else if (payment.request_id === 0) {
              // LEGACY MEMBERSHIP FEE (REMAINING FOR COMPATIBILITY)
              const user = await dbGet(`SELECT role FROM users WHERE id = ?`, [payment.payer_user_id]);
              let table = user.role === 'lab' ? 'laboratories' : 'clients';
              let activeVerification = user.role === 'lab' ? 'VERIFIED' : 'active';

              await dbRun(`UPDATE ${table} SET registration_fee_paid = 1, subscription_status = 'ACTIVE', verification_status = ?, subscription_expiry = date('now', '+30 days') WHERE user_id = ?`, [activeVerification, payment.payer_user_id]);
              
              await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                 [payment.payer_user_id, `Your professional membership has been ACTIVATED. Welcome to the QualiCore Expert Network.`, 'MEMBERSHIP']);
              console.log(`MEMBERSHIP ACTIVATED for User #${payment.payer_user_id}`);
        } else {
             // TEST REQUEST PAYMENT
             console.log(`Payment SECURED for Request #${payment.request_id}. Workflow unlocked.`);
             const request = await dbGet(`SELECT client_id, lab_id FROM test_requests WHERE id = ?`, [payment.request_id]);
             if (request) {
                 await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                     [request.client_id, `Payment for Request #${payment.request_id} successful.`, 'PAYMENT']);
                 if (request.lab_id) {
                     const labUser = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [request.lab_id]);
                     await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                         [labUser.user_id, `Payment secured for Request #${payment.request_id}. Start work.`, 'PAYMENT']);
                 }
             }
        }
    }
}

// --- M-PESA ENDPOINTS ---
app.post("/api/payments/mpesa", authenticateToken, asyncHandler(async (req, res) => {
    const { phone, amount, request_id } = req.body;
    if (amount === undefined || request_id === undefined) throw new ApiError('Missing payment parameters', 400);

    let shortcode = process.env.MPESA_SHORTCODE || "174379";
    let passkey = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

    // 1. Identify Laboratory for this request (unless it's a membership payment)
    if (request_id !== 0) {
        const request = await dbGet(`SELECT lab_id FROM test_requests WHERE id = ?`, [request_id]);
        if (!request) throw new ApiError('Test request not found', 404);

        const lab = await dbGet(`SELECT mpesa_shortcode, mpesa_passkey FROM laboratories WHERE id = ?`, [request.lab_id]);
        if (lab?.mpesa_shortcode) {
            shortcode = lab.mpesa_shortcode;
            passkey = lab.mpesa_passkey;
        }
    }
    
    // 2. Select Credentials (Lab-Specific or Platform Default)
    const token = await getMpesaAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.round(amount),
            PartyA: phone,
            PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: "https://your-public-url.com/api/mpesa/callback", 
            AccountReference: request_id !== 0 ? `REQ-${request_id}` : `SUB-${req.user.id}`,
            TransactionDesc: request_id !== 0 ? `Payment for Request #${request_id}` : `QualiCore Subscription`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save PENDING payment record with reference to which shortcode was used
    await dbRun(
        `INSERT INTO payments (request_id, payer_user_id, amount, phone, checkout_request_id, status, payment_type, metadata) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [request_id || 0, req.user.id, amount, phone, response.data.CheckoutRequestID, payment_type || 'TEST_REQUEST', JSON.stringify(metadata || {})]
    );

    sendSuccess(res, response.data);
}));

app.post("/api/mpesa/callback", asyncHandler(async (req, res) => {
    const data = req.body;
    console.log("M-Pesa Callback Received:", JSON.stringify(data));

    try {
        const callback = data.Body.stkCallback;
        if (callback.ResultCode === 0) {
            const metadata = callback.CallbackMetadata.Item;
            const amount = metadata.find(i => i.Name === "Amount").Value;
            const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber").Value;
            const phone = metadata.find(i => i.Name === "PhoneNumber").Value;
            
            await markPaymentAsPaid(receipt, amount, phone, callback.CheckoutRequestID);
        } else {
            console.log("M-Pesa Payment failed or cancelled by user");
        }
        res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err) {
        console.error("M-Pesa Callback Error:", err);
        res.status(500).send("Error processing callback");
    }
}));

// --- FLUTTERWAVE INTEGRATION ---
app.post("/api/payments/flutterwave", authenticateToken, asyncHandler(async (req, res) => {
    const { amount, request_id, email, full_name } = req.body;
    if (!amount || !request_id || !email) throw new ApiError('Missing payment parameters', 400);

    // 1. Fetch Lab's Flutterwave Secret Key
    let labSecretKey = process.env.FLW_SECRET_KEY || "FLWSECK_TEST-SANDBOX-KEY";
    
    const request = await dbGet(`SELECT lab_id FROM test_requests WHERE id = ?`, [request_id]);
    if (request && request.lab_id) {
        const lab = await dbGet(`SELECT flw_secret_key FROM laboratories WHERE id = ?`, [request.lab_id]);
        if (lab && lab.flw_secret_key) {
            labSecretKey = lab.flw_secret_key;
            console.log(`Using Lab-specific Flutterwave Key for Request #${request_id}`);
        }
    }

    const tx_ref = `QUALICORE-${Date.now()}-${request_id}`;

    const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
            tx_ref: tx_ref,
            amount: amount,
            currency: "USD",
            redirect_url: `https://your-public-url.com/api/payments/flutterwave/verify`,
            meta: { request_id: request_id },
            customer: {
                email: email,
                name: full_name || "QualiCore Client",
            },
            customizations: {
                title: "QualiCore Laboratory Services",
                description: `Payment for Test Request #${request_id}`,
                logo: "https://your-logo-url.com/logo.png",
            },
        },
        { headers: { Authorization: `Bearer ${labSecretKey}` } }
    );

    // Save PENDING payment record
    await dbRun(
        `INSERT INTO payments (request_id, payer_user_id, amount, phone, checkout_request_id, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [request_id, req.user.id, amount, 'FLUTTERWAVE', tx_ref]
    );

    sendSuccess(res, response.data);
}));

app.get("/api/payments/flutterwave/verify", asyncHandler(async (req, res) => {
    const { status, tx_ref, transaction_id } = req.query;
    
    // 1. Find the payment and lab to get the secret key
    const payment = await dbGet(`SELECT request_id FROM payments WHERE checkout_request_id = ?`, [tx_ref]);
    let labSecretKey = process.env.FLW_SECRET_KEY || "FLWSECK_TEST-SANDBOX-KEY";

    if (payment && payment.request_id !== 0) {
        const request = await dbGet(`SELECT lab_id FROM test_requests WHERE id = ?`, [payment.request_id]);
        if (request && request.lab_id) {
            const lab = await dbGet(`SELECT flw_secret_key FROM laboratories WHERE id = ?`, [request.lab_id]);
            if (lab && lab.flw_secret_key) labSecretKey = lab.flw_secret_key;
        }
    }

    if (status === 'successful') {
        // Verify with Flutterwave API
        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
            { headers: { Authorization: `Bearer ${labSecretKey}` } }
        );

        const v = response.data.data;
        if (v.status === "successful" && v.amount >= 0) {
            // Update database and unlock workflow
            await markPaymentAsPaid(v.flw_ref, v.amount, v.customer.email, tx_ref);
            
            // Redirect back to frontend success page
            res.redirect(`https://your-frontend-url.com/payment-success?id=${tx_ref}`);
        } else {
            res.redirect(`https://your-frontend-url.com/payment-failed`);
        }
    } else {
        res.redirect(`https://your-frontend-url.com/payment-failed`);
    }
}));


// --- BANK TRANSFER INTEGRATION ---
app.get("/api/payments/bank-details/:request_id", authenticateToken, asyncHandler(async (req, res) => {
    if (req.params.request_id === '0') {
        // Fetch Platform Bank Details from System Settings
        const settings = await dbAll(`SELECT key, value FROM system_settings WHERE key LIKE 'platform_bank_%'`);
        const bankData = {};
        settings.forEach(s => {
            const shortKey = s.key.replace('platform_bank_', '');
            bankData[shortKey] = s.value;
        });

        return sendSuccess(res, {
            lab_name: "QualiCore Intelligence Network",
            bank_name: bankData.name || "Sovereign Central Bank",
            bank_account_name: bankData.acc_name || "QualiCore Global Membership",
            bank_account_number: bankData.acc_num || "001-987654-321",
            bank_swift_code: bankData.swift || "QUALUSNA"
        });
    }

    const request = await dbGet(`SELECT lab_id FROM test_requests WHERE id = ?`, [req.params.request_id]);
    if (!request) throw new ApiError('Request not found', 404);

    const lab = await dbGet(
        `SELECT name as lab_name, bank_name, bank_account_name, bank_account_number, bank_swift_code FROM laboratories WHERE id = ?`,
        [request.lab_id]
    );
    if (!lab?.bank_account_number) throw new ApiError('Laboratory has not configured bank details', 400);

    sendSuccess(res, lab);
}));

app.post("/api/payments/bank-transfer/submit-proof", authenticateToken, asyncHandler(async (req, res) => {
    const { request_id, amount, proof_reference } = req.body;
    if (request_id === undefined || !proof_reference) throw new ApiError('Missing transfer proof details', 400);

    // Create a payment record in AWAITING_VERIFICATION state
    const paymentId = await dbRun(
        `INSERT INTO payments (request_id, payer_user_id, amount, phone, mpesa_receipt, status) VALUES (?, ?, ?, 'BANK_TRANSFER', ?, 'AWAITING_VERIFICATION')`,
        [request_id, req.user.id, amount, proof_reference]
    );

    // Notify Authority (Lab or Admin)
    if (request_id === 0) {
        // Notify Super Admin
        const admin = await dbGet(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
            [admin.id, `New Membership Bank Transfer submitted by ${req.user.email}. Please verify funds.`, 'PAYMENT_VERIFICATION']);
    } else {
        // Notify Lab
        const request = await dbGet(`SELECT lab_id FROM test_requests WHERE id = ?`, [request_id]);
        const lab = await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [request.lab_id]);
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
            [lab.user_id, `New Bank Transfer Proof submitted for Request #${request_id}. Please verify funds.`, 'PAYMENT_VERIFICATION']);
    }

    sendSuccess(res, { payment_id: paymentId, status: 'AWAITING_VERIFICATION' });
}));

app.patch("/api/payments/:id/verify", authenticateToken, authorize('lab', 'admin'), asyncHandler(async (req, res) => {
    const payment = await dbGet(`SELECT * FROM payments WHERE id = ?`, [req.params.id]);
    if (!payment) throw new ApiError('Payment record not found', 404);

    // Permission check: Labs only verify their requests, Admin verifies everything (especially membership)
    await markPaymentAsPaid(payment.mpesa_receipt, payment.amount, 'BANK_TRANSFER', payment.checkout_request_id || payment.mpesa_receipt);
    
    sendSuccess(res, { success: true, status: 'PAID' });
}));

// --- RFQ & BIDDING MARKETPLACE ---

// 1. Create RFQ (Client Only)
app.post('/api/rfqs', authenticateToken, authorize('client'), requireActiveSubscription, asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    const { title, description, sample_type, required_standards, deadline } = req.body;
    
    if (!title || !description) throw new ApiError('Title and description are required', 400);

    const result = await dbRun(
        `INSERT INTO rfqs (company_id, title, description, sample_type, required_standards, deadline) VALUES (?, ?, ?, ?, ?, ?)`,
        [clientId, title, description, sample_type, required_standards, deadline]
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'RFQ_CREATED', 'rfq', ?)`, [req.user.id, result.lastID]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

// 2. List RFQs (Dynamic visibility + Smart Matching)
app.get('/api/rfqs', authenticateToken, requireActiveSubscription, asyncHandler(async (req, res) => {
    let sql;
    let params = [];

    if (req.user.role === 'client') {
        const clientId = await getClientId(req.user.id);
        sql = `SELECT r.*, (SELECT count(*) FROM bids WHERE rfq_id = r.id) as bid_count 
               FROM rfqs r WHERE company_id = ? ORDER BY created_at DESC`;
        params = [clientId];
    } else if (req.user.role === 'lab') {
        const lab = await dbGet(`SELECT id, specialization FROM laboratories WHERE user_id = ?`, [req.user.id]);
        
        // Smart Matching Engine: Only show RFQs matching lab's specialization
        let matchSql = "";
        let matchParams = [lab.id];
        
        if (lab.specialization) {
            // Flexible matching for specialization tags
            matchSql = `AND (r.sample_type IS NULL OR r.sample_type = '' OR LOWER(r.sample_type) LIKE ? OR LOWER(?) LIKE '%' || LOWER(r.sample_type) || '%')`;
            matchParams.push(`%${lab.specialization.toLowerCase()}%`, lab.specialization.toLowerCase());
        }

        sql = `SELECT r.*, c.company_name, 
               (SELECT status FROM bids WHERE rfq_id = r.id AND lab_id = ?) as my_bid_status
               FROM rfqs r 
               JOIN clients c ON r.company_id = c.id
               WHERE r.status = 'open' ${matchSql}
               ORDER BY created_at DESC`;
        params = matchParams;
    } else {
        sql = `SELECT * FROM rfqs ORDER BY created_at DESC`;
    }

    const rfqs = await dbAll(sql, params);
    sendSuccess(res, rfqs);
}));

// 3. Get RFQ Details
app.get('/api/rfqs/:id', authenticateToken, requireActiveSubscription, asyncHandler(async (req, res) => {
    const rfq = await dbGet(`
        SELECT r.*, c.company_name, c.city, c.country
        FROM rfqs r
        JOIN clients c ON r.company_id = c.id
        WHERE r.id = ?
    `, [req.params.id]);

    if (!rfq) throw new ApiError('RFQ not found', 404);

    // If client, include all bids. If lab, include ONLY their bid.
    let bids = [];
    if (req.user.role === 'client') {
        const clientId = await getClientId(req.user.id);
        if (rfq.company_id === clientId) {
            bids = await dbAll(`
                SELECT b.*, l.name as lab_name, l.city as lab_city, l.accreditation_status
                FROM bids b
                JOIN laboratories l ON b.lab_id = l.id
                WHERE b.rfq_id = ?
                ORDER BY b.price ASC
            `, [req.params.id]);
        }
    } else if (req.user.role === 'lab') {
        const labId = await getLabId(req.user.id);
        bids = await dbAll(`SELECT * FROM bids WHERE rfq_id = ? AND lab_id = ?`, [req.params.id, labId]);
    }

    sendSuccess(res, { rfq, bids });
}));

// 4. Submit Bid (Lab Only)
app.post('/api/rfqs/:id/bids', authenticateToken, authorize('lab'), requireActiveSubscription, asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const { price, turnaround_time, capability_statement, method_proposal } = req.body;

    if (!price || !turnaround_time) throw new ApiError('Price and turnaround time are required', 400);

    const rfq = await dbGet(`SELECT status FROM rfqs WHERE id = ?`, [req.params.id]);
    if (!rfq || rfq.status !== 'open') throw new ApiError('RFQ is no longer accepting bids', 400);

    const result = await dbRun(
        `INSERT INTO bids (rfq_id, lab_id, price, turnaround_time, capability_statement, method_proposal) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, labId, price, turnaround_time, capability_statement, method_proposal]
    );

    // Notify Company
    const company = await dbGet(`SELECT user_id FROM clients WHERE id = (SELECT company_id FROM rfqs WHERE id = ?)`, [req.params.id]);
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
        [company.user_id, `New bid received for your RFQ: ${req.params.id}.`, 'RFQ_BID']);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'BID_SUBMITTED', 'bid', ?)`, [req.user.id, result.lastID]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

// 5. Award RFQ (Client Only)
app.post('/api/bids/:id/accept', authenticateToken, authorize('client'), requireActiveSubscription, asyncHandler(async (req, res) => {
    const clientId = await getClientId(req.user.id);
    
    const bid = await dbGet(`
        SELECT b.*, r.company_id, r.id as rfq_id, l.user_id as lab_user_id
        FROM bids b
        JOIN rfqs r ON b.rfq_id = r.id
        JOIN laboratories l ON b.lab_id = l.id
        WHERE b.id = ?
    `, [req.params.id]);

    if (!bid || bid.company_id !== clientId) throw new ApiError('Bid not found or access denied', 404);

    await dbRun(`BEGIN TRANSACTION`);
    try {
        // 1. Accept this bid
        await dbRun(`UPDATE bids SET status = 'accepted' WHERE id = ?`, [req.params.id]);
        
        // 2. Reject others for this RFQ
        await dbRun(`UPDATE bids SET status = 'rejected' WHERE rfq_id = ? AND id != ?`, [bid.rfq_id, req.params.id]);
        
        // 3. Award RFQ
        await dbRun(`UPDATE rfqs SET status = 'awarded' WHERE id = ?`, [bid.rfq_id]);

        // 4. AUTOMATIC CONTRACT CREATION
        const contractRes = await dbRun(
            `INSERT INTO contracts (rfq_id, company_id, lab_id, agreed_price) VALUES (?, ?, ?, ?)`,
            [bid.rfq_id, bid.company_id, bid.lab_id, bid.price]
        );

        // 5. Create Notification
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
            [bid.lab_user_id, `CONGRATULATIONS: Your bid for RFQ #${bid.rfq_id} has been ACCEPTED. Contract #${contractRes.lastID} has been automatically generated.`, 'RFQ_AWARDED']);

        await dbRun(`COMMIT`);
        await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'RFQ_AWARDED', 'rfq', ?)`, [req.user.id, bid.rfq_id]);
        sendSuccess(res, { message: "RFQ awarded and contract generated successfully", contract_id: contractRes.lastID });
    } catch (e) {
        await dbRun(`ROLLBACK`);
        throw e;
    }
}));

app.get('/api/admin/ecosystem-stats', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const stats = await dbGet(`
        SELECT 
            (SELECT COUNT(*) FROM laboratories) as total_labs,
            (SELECT COUNT(*) FROM clients) as total_clients,
            (SELECT COUNT(*) FROM test_requests) as total_requests,
            (SELECT COUNT(*) FROM samples) as total_samples,
            (SELECT COUNT(*) FROM test_results WHERE status = 'validated') as total_results,
            (SELECT COUNT(*) FROM test_results WHERE status = 'rejected') as quality_events,
            (SELECT COUNT(*) FROM engagements WHERE status = 'ACCEPTED') as active_partnerships
    `);
    const revenue = await dbGet(`SELECT SUM(amount) as total FROM invoices WHERE status = 'PAID'`);
    stats.total_revenue = revenue.total || 0;

    // Monthly Volume (Last 6 Months)
    stats.volume_trend = await dbAll(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count 
        FROM test_results 
        GROUP BY month ORDER BY month DESC LIMIT 6
    `);

    // Top Failing Parameters (National Hot Spots)
    stats.failing_parameters = await dbAll(`
        SELECT parameter_name, COUNT(*) as failure_count
        FROM test_results
        WHERE status = 'rejected'
        GROUP BY parameter_name
        ORDER BY failure_count DESC
        LIMIT 5
    `);

    sendSuccess(res, stats);
}));


// --- Laboratory Verification & Onboarding Terminal ---
app.get('/api/admin/labs/pending', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const labs = await dbAll(`
        SELECT id, name, city, country, accreditation_status, accreditation_number, specialization, verification_status
        FROM laboratories
        WHERE verification_status = 'PENDING_REVIEW'
        ORDER BY created_at DESC
    `);
    sendSuccess(res, labs);
}));

app.put('/api/admin/labs/:id/verify', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const validStatuses = ['VERIFIED', 'REJECTED', 'TRIAL_ACTIVE', 'SUSPENDED'];
    
    if (!validStatuses.includes(status)) {
        throw new ApiError('Invalid verification status', 400);
    }

    await dbRun(
        `UPDATE laboratories SET verification_status = ?, admin_notes = ? WHERE id = ?`,
        [status, notes, req.params.id]
    );

    // If activated, we can also trigger a notification
    const lab = await dbGet(`SELECT user_id, name FROM laboratories WHERE id = ?`, [req.params.id]);
    if (lab) {
        await dbRun(
            `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'ACCOUNT_VERIFIED')`,
            [lab.user_id, `Your laboratory (${lab.name}) has been officially ${status.toLowerCase().replace('_', ' ')} by the Sovereign Authority.`]
        );

        await dbRun(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, 'LAB_VERIFICATION', 'LABORATORIES', ?, ?)`,
            [req.user.id, req.params.id, JSON.stringify({ status, notes })]
        );
    }

    sendSuccess(res, { success: true });
}));

// --- Professional Accreditation Authority ---
app.get('/api/admin/professionals/pending', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const data = await dbAll(`
        SELECT id, user_id, name, specialization, certification_status 
        FROM professionals 
        WHERE certification_status = 'pending' OR certification_status IS NULL
        ORDER BY created_at DESC
    `);
    sendSuccess(res, data);
}));

app.put('/api/admin/professionals/:id/approve', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { status, badge } = req.body;
    await dbRun(
        `UPDATE professionals SET certification_status = ?, specialty_badge = ? WHERE id = ?`,
        [status, badge, req.params.id]
    );
    
    const pro = await dbGet(`SELECT user_id, name FROM professionals WHERE id = ?`, [req.params.id]);
    if (pro) {
        await dbRun(
            `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'PROFESSIONAL_CERTIFIED')`,
            [pro.user_id, `Congratulations ${pro.name}! You have been badged as a '${badge}' by the Authority.`, 'success']
        );
    }
    sendSuccess(res, { success: true });
}));

// --- Laboratory HR & Job Broadcasting ---
app.post('/api/lab/jobs', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { title, content, type, expiration_days } = req.body;
    const result = await dbRun(
        `INSERT INTO broadcast_messages (sender_id, title, content, type, expires_at) 
         VALUES (?, ?, ?, ?, date('now', '+${expiration_days || 30} days'))`,
        [req.user.id, title, content, type || 'JOB_OPENING']
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.get('/api/pro/jobs', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const pro = await dbGet(`SELECT certification_status FROM professionals WHERE user_id = ?`, [req.user.id]);
    if (!pro || pro.certification_status !== 'approved') {
        return sendSuccess(res, [], 200, "Accreditation Required to View Marketplace");
    }

    const jobs = await dbAll(`
        SELECT b.*, l.name as lab_name
        FROM broadcast_messages b
        JOIN users u ON b.sender_id = u.id
        JOIN laboratories l ON u.id = l.user_id
        WHERE b.type = 'JOB_OPENING' AND b.expires_at > date('now')
        ORDER BY b.created_at DESC
    `);
    sendSuccess(res, jobs);
}));

app.post('/api/pro/jobs/:id/apply', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const pro = await dbGet(`SELECT id FROM professionals WHERE user_id = ?`, [req.user.id]);
    await dbRun(
        `INSERT INTO broadcast_applications (broadcast_id, professional_id, status) VALUES (?, ?, 'PENDING')`,
        [req.params.id, pro.id]
    );
    sendSuccess(res, { success: true }, 201);
}));

app.get('/api/lab/jobs/:id/applications', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const apps = await dbAll(`
        SELECT a.*, p.name as pro_name, p.specialization, p.specialty_badge
        FROM broadcast_applications a
        JOIN professionals p ON a.professional_id = p.id
        WHERE a.broadcast_id = ?
    `, [req.params.id]);
    sendSuccess(res, apps);
}));

app.put('/api/lab/applications/:id/hire', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    await dbRun(`UPDATE broadcast_applications SET status = 'HIRED' WHERE id = ?`, [req.params.id]);
    sendSuccess(res, { success: true });
}));

// --- Accreditation Authority ---
app.get('/api/admin/accreditations', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const data = await dbAll(`
        SELECT a.*, l.name as lab_name, l.contact_email
        FROM lab_accreditations a
        JOIN laboratories l ON a.lab_id = l.id
        ORDER BY a.created_at DESC
    `);
    sendSuccess(res, data);
}));

app.patch('/api/admin/accreditations/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    await dbRun(
        `UPDATE lab_accreditations SET status = ?, verified_at = ? WHERE id = ?`,
        [status, status === 'VERIFIED' ? new Date().toISOString() : null, req.params.id]
    );
    sendSuccess(res, { success: true });
}));

// Lab Side: Submit accreditation
app.post('/api/lab/accreditations', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { accreditation_type, certificate_number, expiry_date, certificate_url } = req.body;
    const labId = await getLabId(req.user.id);
    const result = await dbRun(
        `INSERT INTO lab_accreditations (lab_id, accreditation_type, certificate_number, expiry_date, certificate_url)
         VALUES (?, ?, ?, ?, ?)`,
        [labId, accreditation_type, certificate_number, expiry_date, certificate_url]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.get('/api/lab/accreditations', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const data = await dbAll(`SELECT * FROM lab_accreditations WHERE lab_id = ?`, [labId]);
    sendSuccess(res, data);
}));

app.get('/api/admin/entities', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const labs = await dbAll(`SELECT id, name as company_name, 'lab' as type, verification_status, subscription_status, created_at, accreditation_status as extra_info FROM laboratories ORDER BY created_at DESC`);
    const clients = await dbAll(`SELECT id, company_name, 'client' as type, verification_status, subscription_status, created_at, industry_type as extra_info FROM clients ORDER BY created_at DESC`);
    const pros = await dbAll(`SELECT id, full_name as company_name, 'professional' as type, certification_status as verification_status, subscription_status, created_at, specialty as extra_info FROM professionals ORDER BY created_at DESC`);
    sendSuccess(res, [...labs, ...clients, ...pros].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
}));

app.put('/api/admin/verify', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { id, type, status, notes } = req.body; // status: 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INFO_REQUESTED', 'TRIAL_ACTIVE'
    const validStatuses = ['VERIFIED', 'REJECTED', 'SUSPENDED', 'UNVERIFIED', 'INFO_REQUESTED', 'TRIAL_ACTIVE'];
    if (!validStatuses.includes(status)) throw new ApiError('Invalid status', 400);
    
    const table = type === 'lab' ? 'laboratories' : 'clients';
    
    // Normalize status for trial check
    const isTrial = status.toUpperCase() === 'TRIAL_ACTIVE';
    
    if (isTrial) {
        await dbRun(`UPDATE ${table} SET verification_status = ?, admin_notes = ?, trial_started_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, notes, id]);
    } else {
        await dbRun(`UPDATE ${table} SET verification_status = ?, admin_notes = ? WHERE id = ?`, [status, notes, id]);
    }
    
    // Notify the user
    const user = await dbGet(`SELECT user_id FROM ${table} WHERE id = ?`, [id]);
    if (user) {
        let message;
        if (status === 'INFO_REQUESTED') {
            message = `Action Required: Administrator has requested more information. Notes: ${notes}`;
        } else if (status.toUpperCase() === 'TRIAL_ACTIVE') {
            message = `🚀 Welcome to the Network! Your 30-day full access trial has been activated. Start building your technical reputation today.`;
        } else {
            message = `Your account status has been updated to: ${status}. ${notes ? 'Notes: ' + notes : ''}`;
        }
            
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, [user.user_id, message, 'system']);
    }
    
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, ?, ?, ?)`, [req.user.id, `ENTITY_${status}`, type, id, JSON.stringify({ status, notes })]);
    sendSuccess(res, { id, status });
}));

app.get('/api/admin/audit-logs', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const sql = `
        SELECT a.id, a.timestamp, u.email as actor, a.action as event, a.entity_type as scope, a.new_value as details
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id

        UNION ALL

        SELECT s.id, s.timestamp, u.email as actor, 'SAMPLE_' || UPPER(s.action) as event, 'sample' as scope, json_object('sample_id', s.sample_id, 'notes', s.notes) as details
        FROM sample_custody_logs s
        LEFT JOIN users u ON s.performed_by = u.id

        UNION ALL

        SELECT r.id, r.timestamp, u.email as actor, 'RESULT_' || UPPER(r.action) as event, 'result' as scope, json_object('result_id', r.result_id, 'new_value', r.new_value) as details
        FROM result_audit_logs r
        LEFT JOIN users u ON r.performed_by = u.id

        UNION ALL

        SELECT rp.id, rp.timestamp, u.email as actor, 'REPORT_' || UPPER(rp.action) as event, 'report' as scope, rp.metadata as details
        FROM report_audit_logs rp
        LEFT JOIN users u ON rp.performed_by = u.id

        ORDER BY timestamp DESC
        LIMIT 100
    `;
    const logs = await dbAll(sql);
    sendSuccess(res, logs);
}));

app.get('/api/admin/entities/:type/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const table = type === 'lab' ? 'laboratories' : 'clients';
    const entity = await dbGet(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!entity) throw new ApiError('Entity not found', 404);
    sendSuccess(res, entity);
}));

// --- Subscription Lifecycle Management ---
app.get('/api/admin/subscriptions', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const labs = await dbAll(`SELECT id, name as company_name, 'lab' as type, subscription_tier, subscription_expiry, subscription_status, created_at FROM laboratories`);
    const clients = await dbAll(`SELECT id, company_name, 'client' as type, subscription_tier, subscription_expiry, subscription_status, created_at FROM clients`);
    sendSuccess(res, [...labs, ...clients].sort((a, b) => new Date(a.subscription_expiry) - new Date(b.subscription_expiry)));
}));

app.patch('/api/admin/subscriptions/:type/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { tier, expiry, status } = req.body;
    const table = type === 'lab' ? 'laboratories' : 'clients';
    
    await dbRun(
        `UPDATE ${table} SET subscription_tier = ?, subscription_expiry = ?, subscription_status = ? WHERE id = ?`,
        [tier, expiry, status, id]
    );
    sendSuccess(res, { success: true });
}));

// --- MEMBERSHIP AUTHORITY ENDPOINTS ---
app.post("/api/admin/membership/approve", authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { id, type, fee_amount } = req.body; 
    let table;
    let statusColumn;
    
    if (type === 'lab') { table = 'laboratories'; statusColumn = 'verification_status'; }
    else if (type === 'client') { table = 'clients'; statusColumn = 'verification_status'; }
    else if (type === 'professional') { table = 'professionals'; statusColumn = 'certification_status'; }
    
    // 1. Verify Entity
    await dbRun(`UPDATE ${table} SET ${statusColumn} = 'VERIFIED', subscription_status = 'AWAITING_PAYMENT' WHERE id = ?`, [id]);
    
    // 2. Fetch User ID
    const entity = await dbGet(`SELECT user_id FROM ${table} WHERE id = ?`, [id]);
    
    // 3. Notify User to Pay Onboarding Fee
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
        [entity.user_id, `Your professional membership has been APPROVED. Please pay the registration fee of ${fee_amount} USD to activate your certified status.`, 'MEMBERSHIP_FEE']);
    
    // SYNC TO PUBLIC TRUST PORTAL
    if (type === 'lab') await TrustSnapshotService.syncLaboratory(id).catch(e => console.error(e));
    if (type === 'client') await TrustSnapshotService.syncCompany(id).catch(e => console.error(e));
    await TrustSnapshotService.refreshGlobalStats().catch(e => console.error(e));

    sendSuccess(res, { success: true });
}));

app.get("/api/membership/status", authenticateToken, asyncHandler(async (req, res) => {
    let table;
    if (req.user.role === 'lab') table = 'laboratories';
    else if (req.user.role === 'client') table = 'clients';
    else if (req.user.role === 'professional') table = 'professionals';
    
    const data = await dbGet(`SELECT verification_status, trial_started_at, registration_fee_paid, subscription_status, subscription_expiry, subscription_tier FROM ${table} WHERE user_id = ?`, [req.user.id]);
    sendSuccess(res, data);
}));

app.post("/api/membership/subscribe", authenticateToken, asyncHandler(async (req, res) => {
    const { tier, durationMonths = 12 } = req.body;
    let table = req.user.role === 'lab' ? 'laboratories' : 'clients';
    
    // Calculate expiry
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + durationMonths);
    const expiryStr = expiry.toISOString().split('T')[0];
    
    await dbRun(
        `UPDATE ${table} SET subscription_tier = ?, subscription_status = 'ACTIVE', subscription_expiry = ?, registration_fee_paid = 1 WHERE user_id = ?`,
        [tier, expiryStr, req.user.id]
    );
    
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, ?, ?)`, 
        [req.user.id, 'SUBSCRIPTION_ACTIVATED', req.user.role, JSON.stringify({ tier, expiry: expiryStr })]);
        
    sendSuccess(res, { success: true, expiry: expiryStr });
}));

app.get('/api/admin/professionals/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const profile = await dbGet(`SELECT p.*, u.email FROM professionals p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [id]);
    if (!profile) throw new ApiError('Professional not found', 404);

    const [certs, experience, skills, docs] = await Promise.all([
        dbAll(`SELECT * FROM professional_certifications WHERE professional_id = ?`, [id]),
        dbAll(`SELECT * FROM professional_experience WHERE professional_id = ? ORDER BY start_date DESC`, [id]),
        dbAll(`SELECT * FROM professional_skills WHERE professional_id = ?`, [id]),
        dbAll(`SELECT * FROM professional_documents WHERE professional_id = ?`, [id])
    ]);
    
    sendSuccess(res, { ...profile, certifications: certs, experience, skills, documents: docs });
}));

app.patch('/api/admin/professionals/:id/verify', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { status, notes, tier } = req.body;
    
    // Map UI statuses to DB constraints
    let dbStatus = status;
    if (status === 'VERIFIED') dbStatus = 'approved';
    if (status === 'REJECTED') dbStatus = 'rejected';
    if (status === 'PENDING') dbStatus = 'pending_review';

    await dbRun(
        `UPDATE professionals SET certification_status = ?, admin_notes = ?, specialty_tier = ? WHERE id = ?`, 
        [dbStatus, notes, tier, req.params.id]
    );

    // Notify Professional
    const profile = await dbGet(`SELECT user_id, full_name FROM professionals WHERE id = ?`, [req.params.id]);
    const message = dbStatus === 'approved' 
        ? `Congratulations ${profile.full_name}! Your expert certification has been APPROVED at the ${tier} level.`
        : `Update on your certification: ${dbStatus.toUpperCase()}. Notes: ${notes}`;
    
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
        [profile.user_id, message, dbStatus === 'approved' ? 'SUCCESS' : 'SYSTEM']);

    // Audit Log
    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'professional', ?, ?)`,
        [req.user.id, `PROFESSIONAL_CERT_${dbStatus.toUpperCase()}`, req.params.id, JSON.stringify({ tier, notes })]);

    sendSuccess(res, { success: true });
}));

app.get('/api/admin/placements', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const data = await dbAll(`
        SELECT pr.*, p.full_name as professional_name, p.specialty
        FROM placement_requests pr
        JOIN professionals p ON pr.professional_id = p.id
        ORDER BY pr.created_at DESC
    `);
    sendSuccess(res, data);
}));

app.post('/api/admin/broadcast', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { subject, content, type, target_specialty } = req.body;
    if (!subject || !content) throw new ApiError('Subject and content are required', 400);

    const result = await dbRun(
        `INSERT INTO broadcast_messages (sender_id, subject, content, type) VALUES (?, ?, ?, ?)`,
        [req.user.id, subject, content, type || 'ANNOUNCEMENT']
    );

    // Filter recipients by specialty if provided
    let query = `SELECT user_id FROM professionals`;
    let params = [];
    if (target_specialty && target_specialty !== 'ALL') {
        query += ` WHERE specialty = ?`;
        params.push(target_specialty);
    }
    
    const recipients = await dbAll(query, params);
    for (const pro of recipients) {
        await dbRun(
            `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
            [pro.user_id, `[${type || 'NOTICE'}] ${subject}`, 'BROADCAST']
        );
    }

    sendSuccess(res, { id: result.lastID, sent_count: recipients.length });
}));

app.get('/api/professional/broadcasts', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const pro = await dbGet(`SELECT certification_status FROM professionals WHERE user_id = ?`, [req.user.id]);
    const isCertified = pro?.certification_status === 'approved';

    const data = await dbAll(`
        SELECT b.*, 
        COALESCE(ubs.is_read, 0) as is_read,
        (SELECT status FROM broadcast_applications WHERE broadcast_id = b.id AND professional_id = (SELECT id FROM professionals WHERE user_id = ?)) as application_status
        FROM broadcast_messages b
        LEFT JOIN user_broadcast_status ubs ON b.id = ubs.broadcast_id AND ubs.user_id = ?
        ORDER BY b.created_at DESC
    `, [req.user.id, req.user.id]);

    // 2. JOB VISIBILITY CONTROL (Hybrid)
    const processedData = data.map(job => {
        if (!isCertified) {
            return {
                ...job,
                content: job.content.substring(0, 100) + "...", // Limited visibility
                is_restricted: true
            };
        }
        return { ...job, is_restricted: false };
    });

    sendSuccess(res, processedData);
}));

app.post('/api/professional/broadcasts/read-all', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const broadcasts = await dbAll(`SELECT id FROM broadcast_messages`);
    for (const b of broadcasts) {
        await dbRun(`
            INSERT INTO user_broadcast_status (user_id, broadcast_id, is_read, read_at) 
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, broadcast_id) DO UPDATE SET is_read=1, read_at=CURRENT_TIMESTAMP
        `, [req.user.id, b.id]);
    }
    sendSuccess(res, { success: true });
}));

app.post('/api/professional/broadcasts/:id/apply', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const pro = await dbGet(`SELECT id, certification_status FROM professionals WHERE user_id = ?`, [req.user.id]);
    if (!pro) throw new ApiError('Professional profile required to apply', 403);

    // ⚠️ HARD RULE (ENFORCEMENT)
    if (pro.certification_status !== 'approved') {
        throw new ApiError('Only certified professionals can apply. Please complete your verification dossier.', 403);
    }

    await dbRun(
        `INSERT INTO broadcast_applications (broadcast_id, professional_id) VALUES (?, ?)`,
        [req.params.id, pro.id]
    );

    sendSuccess(res, { status: 'PENDING' });
}));

app.delete('/api/professional/broadcasts/:id/withdraw', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const pro = await dbGet(`SELECT id FROM professionals WHERE user_id = ?`, [req.user.id]);
    if (!pro) throw new ApiError('Professional profile required', 403);

    await dbRun(
        `DELETE FROM broadcast_applications WHERE broadcast_id = ? AND professional_id = ?`,
        [req.params.id, pro.id]
    );

    sendSuccess(res, { success: true });
}));

app.get('/api/admin/broadcasts', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const data = await dbAll(`
        SELECT b.*, 
        (SELECT COUNT(*) FROM broadcast_applications WHERE broadcast_id = b.id) as app_count
        FROM broadcast_messages b
        ORDER BY b.created_at DESC
    `);
    sendSuccess(res, data);
}));

app.get('/api/admin/broadcasts/:id/applications', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const data = await dbAll(`
        SELECT ba.*, p.full_name, p.specialty, p.experience_years
        FROM broadcast_applications ba
        JOIN professionals p ON ba.professional_id = p.id
        WHERE ba.broadcast_id = ?
        ORDER BY ba.created_at DESC
    `, [req.params.id]);
    sendSuccess(res, data);
}));

// --- Talent Marketplace (For Labs/Clients) ---
app.get('/api/talent/search', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const data = await dbAll(`
        SELECT id, full_name, specialty, experience_years, location, bio, certification_status
        FROM professionals
        WHERE certification_status = 'VERIFIED' AND is_available = 1
        ORDER BY experience_years DESC
    `);
    sendSuccess(res, data);
}));

app.get('/api/talent/:id', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const profile = await dbGet(`SELECT id, full_name, specialty, experience_years, location, bio, certification_status FROM professionals WHERE id = ? AND certification_status = 'VERIFIED'`, [id]);
    if (!profile) throw new ApiError('Professional not found or not certified', 404);

    const [certs, experience, skills] = await Promise.all([
        dbAll(`SELECT cert_name, issuing_body, expiry_date FROM professional_certifications WHERE professional_id = ? AND status = 'VERIFIED'`, [id]),
        dbAll(`SELECT organization_name, role_title, start_date, end_date, responsibilities, is_current FROM professional_experience WHERE professional_id = ? ORDER BY start_date DESC`, [id]),
        dbAll(`SELECT skill_name, category, proficiency FROM professional_skills WHERE professional_id = ?`, [id])
    ]);
    
    sendSuccess(res, { ...profile, certifications: certs, experience, skills });
}));

app.post('/api/talent/hire', authenticateToken, authorize('lab', 'client'), asyncHandler(async (req, res) => {
    const { professional_id } = req.body;
    let requesterId;
    if (req.user.role === 'lab') requesterId = await getLabId(req.user.id);
    else requesterId = await getClientId(req.user.id);

    const result = await dbRun(
        `INSERT INTO placement_requests (requester_id, requester_type, professional_id)
         VALUES (?, ?, ?)`,
        [requesterId, req.user.role, professional_id]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

// --- Professional Profile (For Individual Experts) ---
app.get('/api/professional/profile', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const profile = await dbGet(`SELECT * FROM professionals WHERE user_id = ?`, [req.user.id]);
    if (!profile) return sendSuccess(res, null);
    
    const [certs, experience, skills, documents] = await Promise.all([
        dbAll(`SELECT * FROM professional_certifications WHERE professional_id = ?`, [profile.id]),
        dbAll(`SELECT * FROM professional_experience WHERE professional_id = ? ORDER BY start_date DESC`, [profile.id]),
        dbAll(`SELECT * FROM professional_skills WHERE professional_id = ?`, [profile.id]),
        dbAll(`SELECT * FROM professional_documents WHERE professional_id = ?`, [profile.id])
    ]);
    
    sendSuccess(res, { ...profile, certifications: certs, experience, skills, documents });
}));

app.post('/api/professional/profile', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const { full_name, specialty, experience_years, bio, location, contact_phone } = req.body;
    const result = await dbRun(
        `INSERT INTO professionals (user_id, full_name, specialty, experience_years, bio, location, contact_phone, certification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT')
         ON CONFLICT(user_id) DO UPDATE SET 
            full_name=excluded.full_name, specialty=excluded.specialty, 
            experience_years=excluded.experience_years, bio=excluded.bio, 
            location=excluded.location, contact_phone=excluded.contact_phone`,
        [req.user.id, full_name, specialty, experience_years, bio, location, contact_phone]
    );
    sendSuccess(res, { id: result.lastID });
}));

app.post('/api/professional/documents', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const { document_type, file_url, file_name } = req.body;
    const profile = await dbGet(`SELECT id FROM professionals WHERE user_id = ?`, [req.user.id]);
    if (!profile) throw new ApiError('Create profile first', 400);

    const result = await dbRun(
        `INSERT INTO professional_documents (professional_id, document_type, file_url, file_name)
         VALUES (?, ?, ?, ?)`,
        [profile.id, document_type, file_url, file_name]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.post('/api/professional/submit', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const profile = await dbGet(`SELECT * FROM professionals WHERE user_id = ?`, [req.user.id]);
    if (!profile) throw new ApiError('Profile not found', 404);

    // 🔐 BACKEND VALIDATION RULES
    const requiredFields = ['full_name', 'contact_phone', 'specialty', 'experience_years', 'location', 'bio'];
    const missing = requiredFields.filter(f => !profile[f]);
    if (missing.length > 0) {
        throw new ApiError(`Profile incomplete. Required fields missing: ${missing.join(', ')}`, 400);
    }

    const docs = await dbGet(`SELECT count(*) as count FROM professional_documents WHERE professional_id = ?`, [profile.id]);
    if (docs.count === 0) throw new ApiError('At least one document must be uploaded', 400);

    // MOVE TO PAYMENT_PENDING
    await dbRun(
        `UPDATE professionals SET certification_status = 'payment_pending' WHERE id = ?`,
        [profile.id]
    );

    sendSuccess(res, { status: 'payment_pending' });
}));

app.post('/api/payments/verification/mpesa', authenticateToken, authorize('professional'), asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const profile = await dbGet(`SELECT id, certification_status FROM professionals WHERE user_id = ?`, [req.user.id]);
    
    if (!profile) throw new ApiError('Professional profile not found', 404);
    
    // ✔ PREVENT ABUSE: Check for existing paid application or active payment
    if (profile.certification_status === 'approved' || profile.certification_status === 'pending_review') {
        throw new ApiError('You already have an active or approved application.', 400);
    }

    const activePayment = await dbGet(`SELECT id FROM verification_payments WHERE professional_id = ? AND status = 'pending'`, [profile.id]);
    if (activePayment) {
        // Instead of error, we can just reuse or let them know
        console.log("Reusing existing pending payment for professional", profile.id);
    }

    // 1. Create verification_payment (pending)
    const result = await dbRun(`
        INSERT INTO verification_payments (professional_id, amount, currency, status)
        VALUES (?, 1000.00, 'KES', 'pending')
    `, [profile.id]);
    const paymentId = result.lastID;

    // 2. Trigger M-Pesa STK push (Simulator)
    console.log(`STK PUSH TRIGGERED: 1000 KES to ${phone} for Professional ${profile.id}`);

    // 3. Callback Simulation (Success after 2 seconds)
    // Random failure chance (10%) for testing
    const willFail = Math.random() < 0.1;

    setTimeout(async () => {
        if (willFail) {
            await dbRun(`UPDATE verification_payments SET status = 'failed' WHERE id = ?`, [paymentId]);
            await dbRun(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, 
                [req.user.id, "Payment Failed", "M-Pesa transaction failed. Please try again or use another number.", "ERROR"]);
            return;
        }

        await dbRun(`UPDATE verification_payments SET status = 'paid', mpesa_receipt = 'RCPT-${Date.now()}' WHERE id = ?`, [paymentId]);
        await dbRun(`
            UPDATE professionals 
            SET verification_paid = 1, 
                verification_paid_at = CURRENT_TIMESTAMP,
                certification_status = 'pending_review',
                submitted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [profile.id]);

        // 🔔 NOTIFICATIONS
        // 1. Professional -> "Verification payment successful"
        await dbRun(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, 
            [req.user.id, "Verification Payment Successful", "We have received your KES 1,000 fee. Audit initiated.", "SUCCESS"]);
        
        // 2. Admin -> "New paid application ready for review"
        const admins = await dbAll(`SELECT id FROM users WHERE role = 'admin'`);
        for (const admin of admins) {
            await dbRun(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, 
                [admin.id, "New Paid Application", `Expert dossier for professional #${profile.id} is ready for review.`, "ACTION_REQUIRED"]);
        }

        // ✔ AUDIT LOG
        await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'PROFESSIONAL_VERIFICATION_PAID', 'payment', ?)`, 
            [req.user.id, paymentId]);

    }, 2000);

    sendSuccess(res, { message: "STK push initiated", payment_id: paymentId });
}));

// --- Marketplace Discovery (For Clients) ---
app.get('/api/marketplace/labs', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    // Only return VERIFIED + ACTIVE labs or TRIAL labs
    const labs = await dbAll(`
        SELECT 
            l.id, l.name, l.organization_type, l.country, l.city, 
            l.accreditation_status, l.turnaround_time, l.sample_pickup,
            l.verification_status, l.subscription_status, l.subscription_tier,
            (SELECT GROUP_CONCAT(test_name) FROM lab_capabilities WHERE lab_id = l.id) as capability_list,
            (
                SELECT GROUP_CONCAT(accreditation_type || '|' || certificate_number || '|' || expiry_date) 
                FROM lab_accreditations 
                WHERE lab_id = l.id AND status = 'VERIFIED'
            ) as detailed_accreditations
        FROM laboratories l
        WHERE (l.verification_status = 'VERIFIED' AND l.subscription_status = 'ACTIVE')
           OR (l.verification_status = 'TRIAL_ACTIVE')
        ORDER BY 
            CASE WHEN l.subscription_tier = 'ENTERPRISE' THEN 1
                 WHEN l.subscription_tier = 'PROFESSIONAL' THEN 2
                 ELSE 3 END,
            l.name ASC
    `);
    
    // Parse the detailed_accreditations string into an array of objects
    const formattedLabs = labs.map(lab => {
        const accs = lab.detailed_accreditations ? lab.detailed_accreditations.split(',').map(str => {
            const [type, cert, expiry] = str.split('|');
            return { type, cert, expiry };
        }) : [];
        return { ...lab, accreditations: accs };
    });

    sendSuccess(res, formattedLabs);
}));

// --- ADMINISTRATIVE COMMUNICATION ---
app.post("/api/admin/notify-user", authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { user_id, message, type = 'ADMIN_UPDATE' } = req.body;
    if (!user_id || !message) throw new ApiError('Target user and message required', 400);

    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
        [user_id, message, type]);

    sendSuccess(res, { success: true });
}));

app.get('/api/requests/lab', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const u = await dbGet(`SELECT sub_role FROM users WHERE id = ?`, [req.user.id]);
    
    let query = `
        SELECT r.*, c.company_name, c.email as client_email,
               p.status as payment_status, p.id as payment_id, p.amount as paid_amount,
               rep.id as report_id, rep.report_number, rep.status as report_status,
               u_assign.email as assigned_technician_email,
               (SELECT status FROM invoices WHERE test_request_id = r.id ORDER BY created_at DESC LIMIT 1) as latest_invoice_status
        FROM test_requests r
        JOIN clients c ON r.client_id = c.id
        LEFT JOIN payments p ON r.id = p.request_id
        LEFT JOIN reports rep ON r.id = rep.test_request_id
        LEFT JOIN users u_assign ON r.assigned_technician_id = u_assign.id
        WHERE r.lab_id = ?
    `;

    // Strict Role Separation Logic
    const params = [labId];
    if (u && u.sub_role === 'TECHNICIAN') {
        query += ` AND r.assigned_technician_id = ? AND r.status IN ('RELEASED', 'in_progress', 'REVIEW_PENDING', 'completed')`;
        params.push(req.user.id);
    } else if (u && u.sub_role === 'REGISTRAR') {
        query += ` AND r.status IN ('pending', 'TECHNICAL_REVIEW', 'RELEASED')`;
    } else if (u && u.sub_role === 'ACCOUNTANT') {
        query += ` AND r.status != 'rejected'`;
    }

    query += ` ORDER BY r.created_at DESC`;
    
    const requests = await dbAll(query, params);
    sendSuccess(res, requests);
}));

app.patch('/api/requests/:id/assign', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const { technician_id, notes } = req.body;
    if (!technician_id) throw new ApiError('Technician assignment is required', 400);

    const labId = await getLabId(req.user.id);
    
    // Verify technician belongs to this lab
    const tech = await dbGet(`SELECT id FROM users WHERE id = ? AND parent_lab_id = ? AND sub_role = 'LAB_TECHNICIAN'`, [technician_id, labId]);
    if (!tech) throw new ApiError('Invalid technician for this laboratory', 404);

    await dbRun(`
        UPDATE test_requests 
        SET assigned_technician_id = ?, assignment_notes = ?, status = 'RELEASED', responded_at = CURRENT_TIMESTAMP
        WHERE id = ? AND lab_id = ?
    `, [technician_id, notes, req.params.id, labId]);

    // Notify technician
    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
        [technician_id, `New work order #${req.params.id} has been assigned to you.`, 'WORK_ASSIGNMENT']);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'test_request', ?, ?)`,
        [req.user.id, 'ORDER_ASSIGNED', req.params.id, JSON.stringify({ technician_id, notes })]);

    sendSuccess(res, { status: 'RELEASED', assigned_to: technician_id });
}));

// Technician: Submit whole work order for review
app.patch('/api/requests/:id/submit-review', authenticateToken, authorize('lab'), authorizeSubRole('LAB_TECHNICIAN'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    
    // Ensure technician owns this request
    const request = await dbGet(`SELECT id FROM test_requests WHERE id = ? AND assigned_technician_id = ?`, [req.params.id, req.user.id]);
    if (!request) throw new ApiError('Work order not found or not assigned to you', 404);

    await dbRun(`UPDATE test_requests SET status = 'REVIEW_PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    // Notify Manager
    const manager = await dbGet(`SELECT id FROM users WHERE parent_lab_id = ? AND sub_role = 'LAB_MANAGER' LIMIT 1`, [labId]);
    if (manager) {
        await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
            [manager.id, `Analyst has submitted Work Order #${req.params.id} for your final review and CoA generation.`, 'REVIEW_ALERT']);
    }

    sendSuccess(res, { success: true, status: 'REVIEW_PENDING' });
}));

// Manager: Get full technical summary for review
app.get('/api/requests/:id/review-summary', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    
    const request = await dbGet(`
        SELECT r.*, c.company_name, c.email as client_email,
               u_assign.email as technician_email
        FROM test_requests r
        JOIN clients c ON r.client_id = c.id
        LEFT JOIN users u_assign ON r.assigned_technician_id = u_assign.id
        WHERE r.id = ? AND r.lab_id = ?
    `, [req.params.id, labId]);

    if (!request) throw new ApiError('Work order not found', 404);

    const samples = await dbAll(`
        SELECT s.*, 
               (SELECT COUNT(*) FROM test_results WHERE sample_id = s.id) as result_count
        FROM samples s
        WHERE s.test_request_id = ?
    `, [req.params.id]);

    for (let sample of samples) {
        sample.results = await dbAll(`
            SELECT tr.*, u.email as entered_by_email
            FROM test_results tr
            JOIN users u ON tr.entered_by = u.id
            WHERE tr.sample_id = ?
            ORDER BY tr.created_at ASC
        `, [sample.id]);
    }

    sendSuccess(res, { request, samples });
}));

app.patch('/api/requests/:id/approve-results', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    
    // Check if results are all entered and no self-validation conflict
    const results = await dbAll(`
        SELECT tr.* 
        FROM test_results tr
        JOIN samples s ON tr.sample_id = s.id
        WHERE s.test_request_id = ?
    `, [req.params.id]);

    if (results.some(r => r.entered_by === req.user.id)) {
        throw new ApiError('Maker-Checker Conflict: You entered some of these results and cannot perform the final manager approval. Another authorized user must review.', 403);
    }

    // Validate all results
    await dbRun(`
        UPDATE test_results 
        SET status = 'validated', validated_by = ?, validated_at = CURRENT_TIMESTAMP
        WHERE sample_id IN (SELECT id FROM samples WHERE test_request_id = ?)
        AND status IN ('draft', 'rejected')
    `, [req.user.id, req.params.id]);

    // Complete the request
    await dbRun(`UPDATE test_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, 'test_request', ?)`,
        [req.user.id, 'WORK_ORDER_APPROVED', req.params.id]);

    sendSuccess(res, { success: true, status: 'completed' });
}));

// Technical Traceability API (End-to-End Journey)
app.get('/api/requests/:id/trace', authenticateToken, asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    
    // 1. Basic Request Info
    const request = await dbGet(`
        SELECT r.*, l.name as lab_name, c.company_name as client_name
        FROM test_requests r
        JOIN laboratories l ON r.lab_id = l.id
        JOIN clients c ON r.client_id = c.id
        WHERE r.id = ?
    `, [requestId]);

    if (!request) throw new ApiError('Request not found', 404);

    // 2. Build Timeline from Audit Logs and Status Changes
    const auditLogs = await dbAll(`
        SELECT al.*, u.email as user_email, u.sub_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_id = ? AND al.entity_type = 'test_request'
        ORDER BY al.timestamp ASC
    `, [requestId]);

    const timeline = [];

    // Stage 1: Submission
    timeline.push({
        stage: 'SUBMITTED',
        label: 'Order Initiated',
        description: `Work order submitted by ${request.client_name}`,
        timestamp: request.created_at,
        status: 'complete',
        icon: '📝'
    });

    // Stage 2: Registrar Review
    const registrarLog = auditLogs.find(l => l.action === 'ORDER_RESPONDED' || l.new_value?.includes('TECHNICAL_REVIEW'));
    timeline.push({
        stage: 'REGISTRAR_REVIEW',
        label: 'Registrar Triage',
        description: registrarLog ? `Accepted for technical review by ${registrarLog.user_email}` : 'Awaiting registrar review',
        timestamp: registrarLog?.timestamp || request.responded_at,
        status: registrarLog || request.responded_at ? 'complete' : 'pending',
        icon: '📥'
    });

    // NEW Stage 2.5: Logistics Dispatch
    const dispatchLog = auditLogs.find(l => l.action === 'ORDER_DISPATCHED');
    timeline.push({
        stage: 'LOGISTICS_DISPATCH',
        label: 'Sample Dispatch',
        description: dispatchLog ? `Sample dispatched by client (Track: ${JSON.parse(dispatchLog.new_value).tracking_number})` : 'Awaiting physical dispatch',
        timestamp: dispatchLog?.timestamp,
        status: dispatchLog ? 'complete' : (request.status === 'TECHNICAL_REVIEW' ? 'current' : 'pending'),
        icon: '🚚'
    });

    // NEW Stage 2.6: Lab Reception
    const receiveLog = auditLogs.find(l => l.action === 'SAMPLE_RECEIVED');
    timeline.push({
        stage: 'LAB_RECEPTION',
        label: 'Physical Receipt',
        description: receiveLog ? `Sample physically received at lab intake` : 'Awaiting arrival at lab',
        timestamp: receiveLog?.timestamp,
        status: receiveLog ? 'complete' : (request.status === 'DISPATCHED' ? 'current' : 'pending'),
        icon: '🏬'
    });

    // Stage 3: Technical Assignment
    const assignLog = auditLogs.find(l => l.action === 'ORDER_ASSIGNED');
    timeline.push({
        stage: 'TECHNICAL_TRIAGE',
        label: 'Technical Assignment',
        description: assignLog ? `Assigned to Technical Bench by Lab Manager` : 'Awaiting technical triage',
        timestamp: assignLog?.timestamp,
        status: assignLog ? 'complete' : (request.status === 'RECEIVED' ? 'current' : 'pending'),
        icon: '🔬'
    });

    // Stage 4: Testing Bench
    const testingLog = auditLogs.find(l => l.action === 'STATUS_UPDATED' && l.new_value?.includes('in_progress'));
    timeline.push({
        stage: 'TESTING',
        label: 'Laboratory Analysis',
        description: testingLog ? 'Testing in progress at technical bench' : 'Waiting for analyst to start',
        timestamp: testingLog?.timestamp,
        status: testingLog ? 'complete' : (request.status === 'RELEASED' ? 'current' : 'pending'),
        icon: '🧪'
    });

    // Stage 5: Quality Review
    const reviewLog = auditLogs.find(l => l.action === 'STATUS_UPDATED' && l.new_value?.includes('REVIEW_PENDING'));
    timeline.push({
        stage: 'QUALITY_REVIEW',
        label: 'Quality Oversight',
        description: reviewLog ? 'Submitted for final manager approval' : 'Awaiting QC submission',
        timestamp: reviewLog?.timestamp,
        status: reviewLog ? 'complete' : (request.status === 'in_progress' ? 'current' : 'pending'),
        icon: '⚖️'
    });

    // Stage 6: Finalization
    const finalizeLog = auditLogs.find(l => l.action === 'WORK_ORDER_APPROVED' || (l.action === 'report' && l.entity_type === 'report'));
    timeline.push({
        stage: 'FINALIZED',
        label: 'CoA Issued',
        description: finalizeLog ? 'Official Certificate of Analysis issued' : 'Awaiting final sign-off',
        timestamp: finalizeLog?.timestamp,
        status: finalizeLog ? 'complete' : (request.status === 'REVIEW_PENDING' ? 'current' : 'pending'),
        icon: '📜'
    });

    sendSuccess(res, { request, timeline });
}));

// Logistics: Client Dispatches Sample
app.post('/api/requests/:id/dispatch', authenticateToken, authorize('client'), asyncHandler(async (req, res) => {
    const { tracking_number, notes } = req.body;
    if (!tracking_number) throw new ApiError('Shipping tracking number is required', 400);

    const clientId = await getClientId(req.user.id);
    
    await dbRun(`
        UPDATE test_requests 
        SET status = 'DISPATCHED', 
            shipping_tracking_number = ?, 
            dispatch_notes = ?, 
            dispatched_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND client_id = ?
    `, [tracking_number, notes, req.params.id, clientId]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'test_request', ?, ?)`,
        [req.user.id, 'ORDER_DISPATCHED', req.params.id, JSON.stringify({ tracking_number, notes })]);

    sendSuccess(res, { success: true, status: 'DISPATCHED' });
}));

// Logistics: Lab Receives Physical Sample
app.post('/api/requests/:id/receive', authenticateToken, authorize('lab'), authorizeSubRole('REGISTRAR'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    
    await dbRun(`
        UPDATE test_requests 
        SET status = 'RECEIVED', 
            received_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND lab_id = ?
    `, [req.params.id, labId]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'test_request', ?, ?)`,
        [req.user.id, 'SAMPLE_RECEIVED', req.params.id, JSON.stringify({ received_at: new Date().toISOString() })]);

    sendSuccess(res, { success: true, status: 'RECEIVED' });
}));

// Logistics: Generate CoC Dispatch Label
app.get('/api/requests/:id/dispatch-label', authenticateToken, asyncHandler(async (req, res) => {
    const request = await dbGet(`
        SELECT r.*, l.name as lab_name, l.address as lab_address, l.city as lab_city, l.country as lab_country,
               c.company_name as client_name, c.address as client_address
        FROM test_requests r
        JOIN laboratories l ON r.lab_id = l.id
        JOIN clients c ON r.client_id = c.id
        WHERE r.id = ?
    `, [req.params.id]);

    if (!request) throw new ApiError('Request not found', 404);

    const doc = new PDFDocument({ margin: 50, size: 'A5' });
    const filename = `dispatch_label_${request.id}.pdf`;
    const filePath = path.join(storageDir, filename);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('SHIPMENT DISPATCH LABEL', { align: 'center', underline: true });
    doc.moveDown();

    // QR Code for Lab Reception
    const qrData = JSON.stringify({ type: 'LAB_RECEPTION', id: request.id, code: request.shipping_tracking_number });
    const qrImage = await QRCode.toDataURL(qrData);
    doc.image(qrImage, (doc.page.width - 150) / 2, doc.y, { width: 150 });
    doc.moveDown(10);

    // Details
    doc.fontSize(10).font('Helvetica-Bold').text('DESTINATION LABORATORY:');
    doc.font('Helvetica').text(request.lab_name);
    doc.text(`${request.lab_address}, ${request.lab_city}, ${request.lab_country}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('SENDER:');
    doc.font('Helvetica').text(request.client_name);
    doc.text(request.client_address || '');
    doc.moveDown();

    doc.rect(50, doc.y, doc.page.width - 100, 80).stroke();
    doc.moveDown();
    doc.fontSize(14).text(`ORDER ID: #${request.id}`, { align: 'center' });
    doc.fontSize(10).text(`TRACKING: ${request.shipping_tracking_number || 'PENDING'}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(8).text('INSTRUCTIONS FOR COURIER: Handle with care. Maintain specified storage conditions.', { align: 'center', color: 'gray' });

    doc.end();

    stream.on('finish', () => {
        sendSuccess(res, { file_url: `/reports/${filename}` });
    });
}));

// --- HR & Talent Acquisition API ---

// HR: Submit Talent Requisition
app.post('/api/hr/requisitions', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    // Only users with HR sub-role or Lab Managers can hire
    if (req.user.sub_role !== 'HR_MANAGER' && req.user.sub_role !== 'LAB_MANAGER') {
        throw new ApiError('Only HR Managers or Lab Managers can initiate talent requisitions', 403);
    }

    const { job_title, department, position_type, required_competencies, urgency, salary_range } = req.body;
    if (!job_title) throw new ApiError('Job title is required', 400);

    const labId = await getLabId(req.user.id);

    const result = await dbRun(`
        INSERT INTO hr_requisitions (lab_id, requester_id, job_title, department, position_type, required_competencies, urgency, salary_range)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [labId, req.user.id, job_title, department, position_type, required_competencies, urgency, salary_range]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'hr_requisition', ?, ?)`,
        [req.user.id, 'TALENT_REQUEST_CREATED', result.lastID, JSON.stringify({ job_title, urgency })]);

    sendSuccess(res, { id: result.lastID, status: 'PENDING_ADMIN_REVIEW' });
}));

// HR: Get Lab's Requisitions
app.get('/api/hr/requisitions', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const requisitions = await dbAll(`
        SELECT r.*, u.email as requester_email
        FROM hr_requisitions r
        JOIN users u ON r.requester_id = u.id
        WHERE r.lab_id = ?
        ORDER BY r.created_at DESC
    `, [labId]);
    sendSuccess(res, requisitions);
}));

// HR: Get Global Talent Pool (Verified Experts)
app.get('/api/hr/talent-pool', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const pros = await dbAll(`
        SELECT id, full_name, specialty, experience_years, location, bio, certification_status
        FROM professionals
        WHERE certification_status = 'approved'
        ORDER BY experience_years DESC
    `);
    sendSuccess(res, pros);
}));

// HR: Get Applications for Lab's Requisitions
app.get('/api/hr/applications', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const applications = await dbAll(`
        SELECT ba.*, p.full_name, p.specialty, p.experience_years, bm.subject as job_title
        FROM broadcast_applications ba
        JOIN professionals p ON ba.professional_id = p.id
        JOIN broadcast_messages bm ON ba.broadcast_id = bm.id
        WHERE bm.sender_id = ? OR bm.id IN (SELECT id FROM hr_requisitions WHERE lab_id = ?)
        ORDER BY ba.created_at DESC
    `, [req.user.id, labId]);
    sendSuccess(res, applications);
}));

// HR: Get Lab Staff
app.get('/api/hr/staff', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const staff = await dbAll(`
        SELECT u.id, u.email, u.sub_role, u.is_active, u.created_at
        FROM users u
        WHERE u.role = 'lab' AND u.id IN (
            SELECT user_id FROM laboratories WHERE id = ?
            UNION
            SELECT user_id FROM users WHERE id = u.id -- This is a simplification, in real app we'd have a lab_staff table
        )
    `, [labId]);
    sendSuccess(res, staff);
}));

// HR: Post a Job Opportunity
app.post('/api/hr/jobs', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { title, department, expertise, experience, location, employment_type, certification_enforced, description } = req.body;
    
    if (!title || !description) throw new ApiError('Title and description are required', 400);

    const metadata = JSON.stringify({
        department,
        expertise,
        experience,
        location,
        employment_type,
        certification_enforced: certification_enforced || true
    });

    const result = await dbRun(`
        INSERT INTO broadcast_messages (sender_id, subject, content, type, metadata)
        VALUES (?, ?, ?, 'JOB_ALERT', ?)
    `, [req.user.id, title, description, metadata]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'JOB_POSTED', 'job', ?)`, [req.user.id, result.lastID]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

// HR: Get Lab's Job Postings
app.get('/api/hr/jobs', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const jobs = await dbAll(`
        SELECT * FROM broadcast_messages 
        WHERE sender_id = ? AND type = 'JOB_ALERT'
        ORDER BY created_at DESC
    `, [req.user.id]);
    
    const jobsWithMetadata = jobs.map(j => ({
        ...j,
        metadata: JSON.parse(j.metadata || '{}')
    }));

    sendSuccess(res, jobsWithMetadata);
}));

// Admin: Get All Talent Requisitions
app.get('/api/admin/hr/requisitions', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const requisitions = await dbAll(`
                ELSE 4 
            END,
            r.created_at DESC
    `);
    sendSuccess(res, requisitions);
}));

// Admin: Respond to Requisition
app.put('/api/admin/hr/requisitions/:id/respond', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { status, feedback } = req.body;
    if (!status) throw new ApiError('Status is required', 400);

    await dbRun(`
        UPDATE hr_requisitions 
        SET status = ?, admin_feedback = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [status, feedback, req.params.id]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'hr_requisition', ?, ?)`,
        [req.user.id, 'TALENT_REQUEST_RESPONDED', req.params.id, JSON.stringify({ status, feedback })]);

    sendSuccess(res, { success: true });
}));

app.use('/reports', express.static(storageDir));

// Centralized Error Middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// --- SUBSCRIPTION OVERSIGHT ENGINE ---
async function runSubscriptionOversight() {
    console.log("SUBSCRIPTION OVERSIGHT: Commencing forensic audit of network memberships...");
    const now = new Date().toISOString().split('T')[0];
    
    const entities = [
        { table: 'laboratories', label: 'Laboratory' },
        { table: 'clients', label: 'Client Firm' },
        { table: 'professionals', label: 'Certified Expert' }
    ];

    for (const entity of entities) {
        // 1. Find Expired Memberships (Status is ACTIVE but expiry is in the past)
        const expired = await dbAll(`SELECT id, user_id FROM ${entity.table} WHERE subscription_status = 'ACTIVE' AND subscription_expiry < ?`, [now]);
        
        for (const item of expired) {
            console.log(`[!] SUSPENDING ${entity.label} #${item.id} (User #${item.user_id}) - Subscription Expired.`);
            
            // 2. Flip Status to EXPIRED
            await dbRun(`UPDATE ${entity.table} SET subscription_status = 'EXPIRED' WHERE id = ?`, [item.id]);
            
            // 3. Notify User
            await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                [item.user_id, `CRITICAL: Your ${entity.label} membership has EXPIRED. Your professional access has been restricted. Please renew to continue.`, 'MEMBERSHIP_EXPIRY']);
        }

        // 4. Find Expired Trials
        if (entity.table === 'laboratories') {
            const expiredTrials = await dbAll(`SELECT id, user_id FROM laboratories WHERE verification_status = 'TRIAL_ACTIVE' AND trial_started_at < date('now', '-30 days')`);
            for (const item of expiredTrials) {
                console.log(`[!] EXPIRED TRIAL: Lab #${item.id} - Moving to PENDING_REVIEW.`);
                await dbRun(`UPDATE laboratories SET verification_status = 'PENDING_REVIEW', subscription_status = 'AWAITING_PAYMENT' WHERE id = ?`, [item.id]);
                await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                    [item.user_id, `Your 30-day trial period has ended. Access to the network has been restricted. Please select a subscription plan to restore full verified status.`, 'TRIAL_EXPIRED']);
            }
        } else if (entity.table === 'clients') {
            const expiredTrials = await dbAll(`SELECT id, user_id FROM clients WHERE verification_status = 'trial_active' AND trial_started_at < date('now', '-30 days')`);
            for (const item of expiredTrials) {
                console.log(`[!] EXPIRED TRIAL: Client #${item.id} - Moving to payment_required.`);
                await dbRun(`UPDATE clients SET verification_status = 'payment_required', subscription_status = 'AWAITING_PAYMENT' WHERE id = ?`, [item.id]);
                await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, 
                    [item.user_id, `Your 30-day trial period has ended. Access to your procurement and analytics tools has been restricted. Please select a corporate subscription to continue.`, 'TRIAL_EXPIRED']);
            }
        }

        // 5. Find Trials ending in 7 days
        if (entity.table !== 'professionals') {
            const trialStatus = entity.table === 'laboratories' ? 'TRIAL_ACTIVE' : 'trial_active';
            const warningTrials = await dbAll(`SELECT id, user_id FROM ${entity.table} WHERE verification_status = ? AND trial_started_at BETWEEN date('now', '-24 days', '-1 day') AND date('now', '-23 days')`, [trialStatus]);
            for (const item of warningTrials) {
                const warningMsg = entity.table === 'laboratories'
                    ? `⚠️ 7 DAYS REMAINING: Your laboratory's network trial is ending soon. Subscribe now to ensure uninterrupted access to RFQs and test requests.`
                    : `⚠️ 7 DAYS REMAINING: Your corporate trial is ending soon. Secure your access to verified laboratories and analytical reports by activating your subscription.`;
                
                // Check if warning already sent today to avoid spamming
                const alreadySent = await dbGet(`SELECT id FROM notifications WHERE user_id = ? AND message LIKE '⚠️ 7 DAYS REMAINING%' AND date(created_at) = date('now')`, [item.user_id]);
                if (!alreadySent) {
                    await dbRun(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, [item.user_id, warningMsg, 'TRIAL_WARNING']);
                }
            }
        }
    }
    console.log("SUBSCRIPTION OVERSIGHT: Audit complete.");
}

// Start Oversight Engine (Runs on startup + every 12 hours)
runSubscriptionOversight();
setInterval(runSubscriptionOversight, 12 * 60 * 60 * 1000);

// --- SOVEREIGN RECEIPT ENGINE ---
app.get("/api/payments/:id/receipt", authenticateToken, asyncHandler(async (req, res) => {
    const payment = await dbGet(`
        SELECT p.*, u.email as payer_email,
        (SELECT company_name FROM clients WHERE user_id = p.payer_user_id) as client_name,
        (SELECT full_name FROM professionals WHERE user_id = p.payer_user_id) as pro_name
        FROM payments p 
        JOIN users u ON p.payer_user_id = u.id
        WHERE p.id = ?`, [req.params.id]);

    if (!payment) throw new ApiError('Receipt not found', 404);
    if (payment.status !== 'PAID') throw new ApiError('Receipt only available for settled payments', 400);

    // Fetch Recipient Details
    let recipientName = "QualiCore Intelligence Network";
    let recipientBank = "Sovereign Central Bank";
    
    if (payment.request_id !== 0) {
        const lab = await dbGet(`
            SELECT l.name, l.bank_name 
            FROM test_requests r 
            JOIN laboratories l ON r.lab_id = l.id 
            WHERE r.id = ?`, [payment.request_id]);
        if (lab) {
            recipientName = lab.name;
            recipientBank = lab.bank_name;
        }
    }

    const payerName = payment.client_name || payment.pro_name || payment.payer_email;
    const description = payment.request_id === 0 ? "Membership & Certification Fee" : `Test Request Settlement #${payment.request_id}`;

    // Professional HTML Template
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; background: #f8fafc; }
            .receipt-card { max-width: 800px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; }
            .header { background: #1e293b; color: white; padding: 40px; display: flex; justify-content: space-between; align-items: center; }
            .content { padding: 40px; }
            .badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .grid { display: grid; grid-cols: 2; gap: 40px; }
            .label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-size: 16px; font-weight: 600; }
            .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            .table th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 12px; font-size: 12px; color: #64748b; }
            .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            .brand { font-size: 24px; font-weight: 900; letter-spacing: -1px; }
        </style>
    </head>
    <body>
        <div class="receipt-card">
            <div class="header">
                <div>
                    <div class="brand">QualiCore</div>
                    <div style="font-size: 12px; opacity: 0.7;">Intelligence & Compliance Ledger</div>
                </div>
                <div style="text-align: right">
                    <div class="badge">Officially Settled</div>
                    <div style="margin-top: 10px; font-size: 14px; opacity: 0.8;">Receipt #${payment.id}</div>
                </div>
            </div>
            <div class="content">
                <div style="display: flex; gap: 100px; margin-bottom: 60px;">
                    <div>
                        <div class="label">Payer Entity</div>
                        <div class="value">${payerName}</div>
                        <div style="font-size: 12px; color: #64748b;">${payment.payer_email}</div>
                    </div>
                    <div>
                        <div class="label">Settlement Recipient</div>
                        <div class="value">${recipientName}</div>
                        <div style="font-size: 12px; color: #64748b;">${recipientBank}</div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Payment Channel</th>
                            <th>Reference Number</th>
                            <th style="text-align: right">Amount (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="value">${description}</td>
                            <td>${payment.phone === 'BANK_TRANSFER' ? 'Direct Bank Wire' : 'M-Pesa / Card'}</td>
                            <td style="font-family: monospace;">${payment.mpesa_receipt}</td>
                            <td class="value" style="text-align: right">$${payment.amount.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 60px; display: flex; justify-content: flex-end;">
                    <div style="text-align: right">
                        <div class="label">Total Amount Settled</div>
                        <div style="font-size: 32px; font-weight: 900; color: #1e293b;">$${payment.amount.toLocaleString()}</div>
                        <div style="font-size: 12px; color: #10b981; font-weight: bold; margin-top: 4px;">✓ Funds Verified</div>
                    </div>
                </div>
            </div>
            <div class="footer">
                This is a digitally generated forensic receipt from the QualiCore Laboratory Intelligence Platform.<br>
                Date Generated: ${new Date().toLocaleString()} · Transaction Integrity Guaranteed by Blockchain Verification.
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(html);
}));

// 2. Validate Result (Manager Only)
app.put('/api/results/:id/validate', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const { status, notes, category } = req.body; // status: validated or rejected
    const labId = await getLabId(req.user.id);
    
    // Check ownership
    const result = await dbGet(`
        SELECT tr.* FROM test_results tr
        JOIN samples s ON tr.sample_id = s.id
        JOIN test_requests r ON s.test_request_id = r.id
        WHERE tr.id = ? AND r.lab_id = ?
    `, [req.params.id, labId]);
    if (!result) throw new ApiError('Result not found', 404);

    await dbRun(`
        UPDATE test_results 
        SET status = ?, validated_by = ?, validated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [status, req.user.id, req.params.id]);

    // If rejected, create a formal Non-Conformance (NC) record
    if (status === 'rejected') {
        await dbRun(`
            INSERT INTO non_conformances (lab_id, entity_type, entity_id, category, description, reported_by)
            VALUES (?, 'result', ?, ?, ?, ?)
        `, [labId, req.params.id, category || 'Technical Failure', notes || 'No specific notes provided', req.user.id]);
    }

    await dbRun(`INSERT INTO result_audit_logs (result_id, action, performed_by, notes) VALUES (?, ?, ?, ?)`, [req.params.id, status === 'validated' ? 'validated' : 'rejected', req.user.id, notes]);

    sendSuccess(res, { message: `Result ${status} and NC logged if applicable.` });
}));

// 3. Quality Queue (Results awaiting validation)
app.get('/api/quality/queue', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const queue = await dbAll(`
        SELECT tr.*, s.sample_code, r.company_name, u.email as technician_email
        FROM test_results tr
        JOIN samples s ON tr.sample_id = s.id
        JOIN test_requests r ON s.test_request_id = r.id
        JOIN users u ON tr.entered_by = u.id
        WHERE r.lab_id = ? AND tr.status = 'draft'
        ORDER BY tr.created_at ASC
    `, [labId]);
    sendSuccess(res, queue);
}));

// 1. Accountant Dashboard Stats
app.get('/api/accountant/stats', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const stats = await dbGet(`
        SELECT 
            SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as total_collected,
            SUM(CASE WHEN status = 'UNPAID' THEN amount ELSE 0 END) as total_receivable,
            COUNT(CASE WHEN status = 'UNPAID' THEN 1 END) as pending_invoices
        FROM invoices
        WHERE lab_id = ?
    `, [labId]);

    const unbilled = await dbGet(`
        SELECT COUNT(*) as count FROM test_requests 
        WHERE lab_id = ? AND status != 'pending' 
        AND id NOT IN (SELECT test_request_id FROM invoices)
    `, [labId]);

    sendSuccess(res, { 
        total_collected: stats?.total_collected || 0, 
        total_receivable: stats?.total_receivable || 0, 
        pending_invoices: stats?.pending_invoices || 0,
        unbilled_requests: unbilled.count 
    });
}));

// 2. The Unbilled Queue
app.get('/api/accountant/unbilled', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const unbilled = await dbAll(`
        SELECT r.*, c.company_name 
        FROM test_requests r
        JOIN clients c ON r.client_id = c.id
        WHERE r.lab_id = ? AND r.status != 'pending'
        AND r.id NOT IN (SELECT test_request_id FROM invoices)
        ORDER BY r.created_at DESC
    `, [labId]);
    sendSuccess(res, unbilled);
}));

// 3. Generate Invoice
app.post('/api/accountant/invoices', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const { test_request_id, amount, due_date, notes } = req.body;
    const labId = await getLabId(req.user.id);
    
    const request = await dbGet(`SELECT client_id FROM test_requests WHERE id = ? AND lab_id = ?`, [test_request_id, labId]);
    if (!request) throw new ApiError('Test request not found or unauthorized', 404);

    const invNum = `INV-${Date.now()}-${test_request_id}`;
    
    const result = await dbRun(`
        INSERT INTO invoices (test_request_id, lab_id, client_id, invoice_number, amount, due_date, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'UNPAID')
    `, [test_request_id, labId, request.client_id, invNum, amount, due_date, notes]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'INVOICE_GENERATED', 'invoice', ?)`, [req.user.id, result.lastID]);
    
    sendSuccess(res, { id: result.lastID, invoice_number: invNum });
}));

// 4. All Invoices (Ledger)
app.get('/api/accountant/invoices', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const invoices = await dbAll(`
        SELECT i.*, c.company_name, r.test_description
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        JOIN test_requests r ON i.test_request_id = r.id
        WHERE i.lab_id = ?
        ORDER BY i.created_at DESC
    `, [labId]);
    sendSuccess(res, invoices);
}));

// 5. Settle Invoice (Reconciliation)
app.patch('/api/accountant/invoices/:id/settle', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    await dbRun(`UPDATE invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ? AND lab_id = ?`, [req.params.id, labId]);
    sendSuccess(res, { message: 'Invoice settled' });
}));

// 6. Pro-forma Invoice Support
app.post('/api/accountant/pro-forma', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const { test_request_id, amount, notes } = req.body;
    const labId = await getLabId(req.user.id);
    
    const invNum = `PRO-${Date.now()}-${test_request_id}`;
    const result = await dbRun(`
        INSERT INTO invoices (test_request_id, lab_id, client_id, invoice_number, amount, notes, status)
        SELECT id, lab_id, client_id, ?, ?, ?, 'UNPAID' FROM test_requests WHERE id = ? AND lab_id = ?
    `, [invNum, amount, notes, test_request_id, labId]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'PROFORMA_ISSUED', 'invoice', ?)`, [req.user.id, result.lastID]);
    sendSuccess(res, { invoice_number: invNum });
}));

// 7. Internal Chain of Custody (Handover)
app.post('/api/samples/:id/custody', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { action, notes, pin } = req.body; 
    // In a real 'top-tier' system, we would verify a PIN here.
    // For this implementation, we will use the authenticated user.
    
    const sampleId = req.params.id;
    const userId = req.user.id;
    const labId = await getLabId(userId);

    // Verify sample belongs to this lab
    const sample = await dbGet(`
        SELECT s.id, s.sample_code, r.lab_id 
        FROM samples s
        JOIN test_requests r ON s.test_request_id = r.id
        WHERE s.id = ? AND r.lab_id = ?
    `, [sampleId, labId]);
    if (!sample) throw new ApiError('Sample not found or unauthorized', 404);

    // Record the handover
    await dbRun(`
        UPDATE samples 
        SET custody_status = ?, current_custodian_id = ? 
        WHERE id = ?
    `, [action === 'accept' ? 'IN_TESTING' : 'IN_STORAGE', action === 'accept' ? userId : null, sampleId]);

    await dbRun(`
        INSERT INTO sample_custody_logs (sample_id, action, performed_by, notes)
        VALUES (?, ?, ?, ?)
    `, [sampleId, action === 'accept' ? 'transferred' : 'stored', userId, notes || 'Physical handover accepted via digital sign-off.']);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, 'sample', ?)`, [userId, `SAMPLE_CUSTODY_${action.toUpperCase()}`, sampleId]);

    sendSuccess(res, { message: `Custody ${action}ed successfully` });
}));

// 8. Order Clarifications (Communication Thread)
app.get('/api/requests/:id/clarifications', authenticateToken, asyncHandler(async (req, res) => {
    const clarifications = await dbAll(`
        SELECT c.*, u.email as sender_email, u.role as sender_role
        FROM order_clarifications c
        JOIN users u ON c.sender_id = u.id
        WHERE c.request_id = ?
        ORDER BY c.created_at ASC
    `, [req.params.id]);
    sendSuccess(res, clarifications);
}));

app.post('/api/requests/:id/clarifications', authenticateToken, asyncHandler(async (req, res) => {
    const { message } = req.body;
    const requestId = req.params.id;
    const userId = req.user.id;

    // Verify access (must be lab or client associated with request)
    const request = await dbGet(`SELECT client_id, lab_id FROM test_requests WHERE id = ?`, [requestId]);
    if (!request) throw new ApiError('Request not found', 404);

    await dbRun(`
        INSERT INTO order_clarifications (request_id, sender_id, message)
        VALUES (?, ?, ?)
    `, [requestId, userId, message]);

    // Create notifications for the OTHER party
    const targetUserId = req.user.role === 'lab' 
        ? (await dbGet(`SELECT user_id FROM clients WHERE id = ?`, [request.client_id])).user_id
        : (await dbGet(`SELECT user_id FROM laboratories WHERE id = ?`, [request.lab_id])).user_id;

    await dbRun(`
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, 'clarification')
    `, [targetUserId, `New clarification message for Order #${requestId}`, 'order']);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'CLARIFICATION_POSTED', 'request', ?)`, [userId, requestId]);

    sendSuccess(res, { message: 'Clarification sent' }, 201);
}));

// 9. Procurement & Requisitions (Acquisition)
app.get('/api/procurement', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const requisitions = await dbAll(`
        SELECT r.*, u.email as requester_email 
        FROM requisitions r
        JOIN users u ON r.requester_id = u.id
        WHERE r.lab_id = ?
        ORDER BY r.created_at DESC
    `, [labId]);
    sendSuccess(res, requisitions);
}));

app.post('/api/procurement', authenticateToken, authorize('lab'), authorizeSubRole('TECHNICIAN'), asyncHandler(async (req, res) => {
    const { item_name, quantity, unit, estimated_cost, priority } = req.body;
    const labId = await getLabId(req.user.id);

    const result = await dbRun(`
        INSERT INTO requisitions (lab_id, requester_id, item_name, quantity, unit, estimated_cost, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [labId, req.user.id, item_name, quantity, unit, estimated_cost, priority]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'REQUISITION_CREATED', 'requisition', ?)`, [req.user.id, result.lastID]);
    sendSuccess(res, { id: result.lastID }, 201);
}));

app.patch('/api/procurement/:id/approve', authenticateToken, authorize('lab'), authorizeSubRole('LAB_MANAGER'), asyncHandler(async (req, res) => {
    const { notes } = req.body;
    const labId = await getLabId(req.user.id);

    await dbRun(`
        UPDATE requisitions 
        SET status = 'PENDING_FINANCE', manager_notes = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND lab_id = ?
    `, [notes, req.params.id, labId]);

    sendSuccess(res, { message: 'Requisition approved technically, forwarded to Finance' });
}));

app.patch('/api/procurement/:id/commit', authenticateToken, authorize('lab'), authorizeSubRole('ACCOUNTANT'), asyncHandler(async (req, res) => {
    const { notes, action } = req.body; // action: 'APPROVED' or 'REJECTED'
    const labId = await getLabId(req.user.id);

    await dbRun(`
        UPDATE requisitions 
        SET status = ?, accountant_notes = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND lab_id = ?
    `, [action, notes, req.params.id, labId]);

    sendSuccess(res, { message: `Requisition ${action} by Finance` });
}));

app.patch('/api/procurement/:id/receive', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const labId = await getLabId(req.user.id);
    const reqItem = await dbGet(`SELECT * FROM requisitions WHERE id = ? AND lab_id = ?`, [req.params.id, labId]);
    if (!reqItem) throw new ApiError('Requisition not found', 404);

    await dbRun(`UPDATE requisitions SET status = 'RECEIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    // Logic to auto-increment lab_reagents could be added here if the item exists
    await dbRun(`
        INSERT INTO lab_reagents (lab_id, name, current_stock, unit, status)
        VALUES (?, ?, ?, ?, 'Active')
        ON CONFLICT(lab_id, name) DO UPDATE SET current_stock = current_stock + ?
    `, [labId, reqItem.item_name, reqItem.quantity, reqItem.unit, reqItem.quantity]);

    sendSuccess(res, { message: 'Items received and inventory updated' });
}));

// --- Lab Financial & Treasury Configuration ---

// Get Treasury Config
app.get('/api/lab/treasury-config', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    // Only Director can see full config
    if (req.user.sub_role) {
        throw new ApiError('Only the Lab Director holds sovereign treasury authority.', 403);
    }
    const lab = await dbGet(`SELECT mpesa_shortcode, mpesa_passkey, bank_name, bank_account_name, bank_account_number, bank_swift_code, flw_public_key, flw_secret_key FROM laboratories WHERE user_id = ?`, [req.user.id]);
    sendSuccess(res, lab);
}));

// Update Treasury Config
app.put('/api/lab/treasury-config', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    if (req.user.sub_role) {
        throw new ApiError('Unauthorized: Financial sovereignty is reserved for the Lab Director.', 403);
    }
    const { mpesa_shortcode, mpesa_passkey, bank_name, bank_account_name, bank_account_number, bank_swift_code, flw_public_key, flw_secret_key } = req.body;
    
    await dbRun(`
        UPDATE laboratories 
        SET mpesa_shortcode = ?, 
            mpesa_passkey = ?, 
            bank_name = ?, 
            bank_account_name = ?, 
            bank_account_number = ?, 
            bank_swift_code = ?,
            flw_public_key = ?,
            flw_secret_key = ?
        WHERE user_id = ?
    `, [mpesa_shortcode, mpesa_passkey, bank_name, bank_account_name, bank_account_number, bank_swift_code, flw_public_key, flw_secret_key, req.user.id]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'lab_treasury', ?, ?)`,
        [req.user.id, 'TREASURY_CONFIG_UPDATED', req.user.id, JSON.stringify({ mpesa_shortcode: '***', bank_name, flw_enabled: !!flw_public_key })]);

    sendSuccess(res, { success: true });
}));

// --- Enterprise HR Management & Talent Sourcing ---

// HR: Get Applications for Lab's Jobs
app.get('/api/hr/applications', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const apps = await dbAll(`
        SELECT a.*, p.full_name, p.specialty, p.experience_years, p.certification_status,
               b.subject as job_title, b.metadata as job_metadata
        FROM broadcast_applications a
        JOIN professionals p ON a.professional_id = p.id
        JOIN broadcast_messages b ON a.broadcast_id = b.id
        WHERE b.sender_id = ?
        ORDER BY a.created_at DESC
    `, [req.user.id]);
    
    sendSuccess(res, apps);
}));

// HR: Update Application Status
app.patch('/api/hr/applications/:id', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['SHORTLISTED', 'REJECTED', 'HIRED'].includes(status)) throw new ApiError('Invalid status', 400);

    const app = await dbGet(`
        SELECT a.id, b.sender_id, a.professional_id, p.user_id as pro_user_id
        FROM broadcast_applications a
        JOIN broadcast_messages b ON a.broadcast_id = b.id
        JOIN professionals p ON a.professional_id = p.id
        WHERE a.id = ?
    `, [req.params.id]);

    if (!app || app.sender_id !== req.user.id) throw new ApiError('Unauthorized to manage this application', 403);

    await dbRun(`UPDATE broadcast_applications SET status = ? WHERE id = ?`, [status, req.params.id]);

    await dbRun(`
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, 'JOB_STATUS')
    `, [app.pro_user_id, `Your job application status has been updated to: ${status}`, 'job']);

    if (status === 'HIRED') {
        const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
        await dbRun(`
            INSERT OR IGNORE INTO staff (organization_id, user_id, role)
            VALUES (?, ?, ?)
        `, [lab.id, app.pro_user_id, 'Technician']);
        
        await dbRun(`UPDATE users SET parent_lab_id = ? WHERE id = ?`, [lab.id, app.pro_user_id]);
    }

    sendSuccess(res, { success: true });
}));

// HR: Talent Pool Search
app.get('/api/hr/talent-pool', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { specialty, min_experience, location, method_expertise } = req.query;
    
    let query = `
        SELECT p.*, u.email 
        FROM professionals p
        JOIN users u ON p.user_id = u.id
        WHERE p.certification_status = 'approved'
    `;
    let params = [];

    if (specialty) { query += ` AND p.specialty = ?`; params.push(specialty); }
    if (min_experience) { query += ` AND p.experience_years >= ?`; params.push(min_experience); }
    if (location) { query += ` AND p.location LIKE ?`; params.push(`%${location}%`); }
    if (method_expertise) {
        query += ` AND EXISTS (SELECT 1 FROM professional_skills WHERE professional_id = p.id AND skill_name LIKE ?)`;
        params.push(`%${method_expertise}%`);
    }

    const pool = await dbAll(query, params);
    sendSuccess(res, pool);
}));

// HR: Invite Professional
app.post('/api/hr/invitations', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { professional_id, broadcast_id, message } = req.body;
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    
    const result = await dbRun(`
        INSERT INTO job_invitations (lab_id, professional_id, broadcast_id, message)
        VALUES (?, ?, ?, ?)
    `, [lab.id, professional_id, broadcast_id, message]);

    const pro = await dbGet(`SELECT user_id FROM professionals WHERE id = ?`, [professional_id]);
    await dbRun(`
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, 'JOB_INVITATION')
    `, [pro.user_id, `You have been invited by a laboratory to apply for a specialized role.`, 'job']);

    sendSuccess(res, { id: result.lastID }, 201);
}));

// HR: Get Staff
app.get('/api/hr/staff', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const staff = await dbAll(`
        SELECT s.*, u.email, u.created_at as joined_at
        FROM staff s
        JOIN users u ON s.user_id = u.id
        WHERE s.organization_id = ?
    `, [lab.id]);
    sendSuccess(res, staff);
}));

// ==========================================
// QUALICORE PUBLIC TRUST API (READ-ONLY)
// ==========================================

// --- PUBLIC TRUST REGISTRY API (Standalone) ---

app.get('/api/public/stats', asyncHandler(async (req, res) => {
    const stats = await publicDb.dbAll(`SELECT * FROM system_stats`, []);
    const statsMap = stats.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    sendSuccess(res, statsMap);
}));

app.get('/api/public/companies', asyncHandler(async (req, res) => {
    const { search } = req.query;
    let query = `SELECT * FROM public_companies WHERE trust_status = 'VERIFIED'`;
    let params = [];
    if (search) {
        query += ` AND (name LIKE ? OR industry LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    const companies = await publicDb.dbAll(query, params);
    sendSuccess(res, companies);
}));

app.get('/api/public/brands', asyncHandler(async (req, res) => {
    const { search, category } = req.query;
    let query = `SELECT b.*, c.name as company_name, c.consumer_group 
                 FROM public_brands b 
                 JOIN public_companies c ON b.company_id = c.id 
                 WHERE b.visibility_status = 'PUBLISHED'`;
    let params = [];
    if (search) {
        query += ` AND (b.name LIKE ? OR b.brand_description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
        query += ` AND b.category = ?`;
        params.push(category);
    }
    const brands = await publicDb.dbAll(query, params);
    sendSuccess(res, brands);
}));

// --- ADMIN TRUST REGISTRY MANAGEMENT (Standalone) ---

app.post('/api/admin/trust/companies', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared } = req.body;
    const result = await publicDb.dbRun(`
        INSERT INTO public_companies (name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared, trust_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
    `, [name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared]);
    sendSuccess(res, { id: result.lastID });
}));

app.post('/api/admin/trust/brands', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { company_id, name, category, trust_badge, brand_description } = req.body;
    const result = await publicDb.dbRun(`
        INSERT INTO public_brands (company_id, name, category, trust_badge, brand_description)
        VALUES (?, ?, ?, ?, ?)
    `, [company_id, name, category, trust_badge, brand_description]);
    sendSuccess(res, { id: result.lastID });
}));

app.put('/api/lab/treasury-config', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    if (req.user.sub_role) {
        throw new ApiError('Unauthorized: Financial sovereignty is reserved for the Lab Director.', 403);
    }
    const { mpesa_shortcode, mpesa_passkey, bank_name, bank_account_name, bank_account_number, bank_swift_code, flw_public_key, flw_secret_key } = req.body;
    
    await dbRun(`
        UPDATE laboratories 
        SET mpesa_shortcode = ?, 
            mpesa_passkey = ?, 
            bank_name = ?, 
            bank_account_name = ?, 
            bank_account_number = ?, 
            bank_swift_code = ?,
            flw_public_key = ?,
            flw_secret_key = ?
        WHERE user_id = ?
    `, [mpesa_shortcode, mpesa_passkey, bank_name, bank_account_name, bank_account_number, bank_swift_code, flw_public_key, flw_secret_key, req.user.id]);

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'lab_treasury', ?, ?)`,
        [req.user.id, 'TREASURY_CONFIG_UPDATED', req.user.id, JSON.stringify({ mpesa_shortcode: '***', bank_name, flw_enabled: !!flw_public_key })]);

    sendSuccess(res, { success: true });
}));

// --- Enterprise HR Management & Talent Sourcing ---

// HR: Get Applications for Lab's Jobs
app.get('/api/hr/applications', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const apps = await dbAll(`
        SELECT a.*, p.full_name, p.specialty, p.experience_years, p.certification_status,
               b.subject as job_title, b.metadata as job_metadata
        FROM broadcast_applications a
        JOIN professionals p ON a.professional_id = p.id
        JOIN broadcast_messages b ON a.broadcast_id = b.id
        WHERE b.sender_id = ?
        ORDER BY a.created_at DESC
    `, [req.user.id]);
    
    sendSuccess(res, apps);
}));

// HR: Update Application Status
app.patch('/api/hr/applications/:id', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['SHORTLISTED', 'REJECTED', 'HIRED'].includes(status)) throw new ApiError('Invalid status', 400);

    const app = await dbGet(`
        SELECT a.id, b.sender_id, a.professional_id, p.user_id as pro_user_id
        FROM broadcast_applications a
        JOIN broadcast_messages b ON a.broadcast_id = b.id
        JOIN professionals p ON a.professional_id = p.id
        WHERE a.id = ?
    `, [req.params.id]);

    if (!app || app.sender_id !== req.user.id) throw new ApiError('Unauthorized to manage this application', 403);

    await dbRun(`UPDATE broadcast_applications SET status = ? WHERE id = ?`, [status, req.params.id]);

    await dbRun(`
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, 'JOB_STATUS')
    `, [app.pro_user_id, `Your job application status has been updated to: ${status}`, 'job']);

    if (status === 'HIRED') {
        const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
        await dbRun(`
            INSERT OR IGNORE INTO staff (organization_id, user_id, role)
            VALUES (?, ?, ?)
        `, [lab.id, app.pro_user_id, 'Technician']);
        
        await dbRun(`UPDATE users SET parent_lab_id = ? WHERE id = ?`, [lab.id, app.pro_user_id]);
    }

    sendSuccess(res, { success: true });
}));

// HR: Talent Pool Search
app.get('/api/hr/talent-pool', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { specialty, min_experience, location, method_expertise } = req.query;
    
    let query = `
        SELECT p.*, u.email 
        FROM professionals p
        JOIN users u ON p.user_id = u.id
        WHERE p.certification_status = 'approved'
    `;
    let params = [];

    if (specialty) { query += ` AND p.specialty = ?`; params.push(specialty); }
    if (min_experience) { query += ` AND p.experience_years >= ?`; params.push(min_experience); }
    if (location) { query += ` AND p.location LIKE ?`; params.push(`%${location}%`); }
    if (method_expertise) {
        query += ` AND EXISTS (SELECT 1 FROM professional_skills WHERE professional_id = p.id AND skill_name LIKE ?)`;
        params.push(`%${method_expertise}%`);
    }

    const pool = await dbAll(query, params);
    sendSuccess(res, pool);
}));

// HR: Invite Professional
app.post('/api/hr/invitations', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const { professional_id, broadcast_id, message } = req.body;
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    
    const result = await dbRun(`
        INSERT INTO job_invitations (lab_id, professional_id, broadcast_id, message)
        VALUES (?, ?, ?, ?)
    `, [lab.id, professional_id, broadcast_id, message]);

    const pro = await dbGet(`SELECT user_id FROM professionals WHERE id = ?`, [professional_id]);
    await dbRun(`
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, 'JOB_INVITATION')
    `, [pro.user_id, `You have been invited by a laboratory to apply for a specialized role.`, 'job']);

    sendSuccess(res, { id: result.lastID }, 201);
}));

// HR: Get Staff
app.get('/api/hr/staff', authenticateToken, authorize('lab'), asyncHandler(async (req, res) => {
    const lab = await dbGet(`SELECT id FROM laboratories WHERE user_id = ?`, [req.user.id]);
    const staff = await dbAll(`
        SELECT s.*, u.email, u.created_at as joined_at
        FROM staff s
        JOIN users u ON s.user_id = u.id
        WHERE s.organization_id = ?
    `, [lab.id]);
    sendSuccess(res, staff);app.get('/api/admin/ecosystem-stats', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const [labs, pros, signals, samples] = await Promise.all([
        dbGet(`SELECT COUNT(*) as count FROM laboratories WHERE verification_status = 'active'`),
        dbGet(`SELECT COUNT(*) as count FROM professionals WHERE certification_status = 'pending_review'`),
        dbGet(`SELECT COUNT(*) as count FROM vigilance_reports WHERE status = 'PENDING'`),
        dbGet(`SELECT COUNT(*) as count FROM samples`)
    ]);
    
    sendSuccess(res, {
        activeLabs: labs.count || 0,
        pendingAccreditations: pros.count || 0,
        activeVigilanceSignals: signals.count || 0,
        networkThroughput: `${samples.count || 0} Records`
    });
}));
}));

// --- Admin Trust Management ---
app.get('/api/admin/trust/companies', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const companies = await dbAll(`SELECT * FROM clients WHERE verification_status = 'active'`);
    sendSuccess(res, companies);
}));

app.get('/api/admin/trust/brands', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const brands = await dbAll(`
        SELECT b.*, c.name as company_name, c.consumer_group 
        FROM trust_brands b 
        JOIN clients c ON b.company_id = c.id
    `);
    sendSuccess(res, brands);
}));

app.post('/api/admin/trust/brands', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { company_id, name, category, trust_badge, brand_description } = req.body;
    const result = await dbRun(
        `INSERT INTO trust_brands (company_id, name, category, trust_badge, brand_description) VALUES (?, ?, ?, ?, ?)`,
        [company_id, name, category, trust_badge, brand_description]
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

// --- Vigilance Intelligence ---
app.get('/api/admin/vigilance/reports', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const reports = await dbAll(`SELECT * FROM vigilance_reports ORDER BY created_at DESC`);
    sendSuccess(res, reports);
}));

app.post('/api/public/vigilance/report', asyncHandler(async (req, res) => {
    const { brand_name, batch_number, symptom_type, description, severity } = req.body;
    const result = await dbRun(
        `INSERT INTO vigilance_reports (brand_name, batch_number, symptom_type, description, severity) VALUES (?, ?, ?, ?, ?)`,
        [brand_name, batch_number, symptom_type, description, severity || 'MEDIUM']
    );
    sendSuccess(res, { id: result.lastID }, 201);
}));

// ==========================================
// QUALICORE PUBLIC TRUST API (READ-ONLY)
// ==========================================

// --- PUBLIC TRUST REGISTRY API (Standalone) ---

app.get('/api/public/stats', asyncHandler(async (req, res) => {
    const stats = await publicDb.dbAll(`SELECT * FROM system_stats`, []);
    const statsMap = stats.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    sendSuccess(res, statsMap);
}));

app.get('/api/public/companies', asyncHandler(async (req, res) => {
    const { search } = req.query;
    let query = `SELECT * FROM public_companies WHERE trust_status = 'VERIFIED'`;
    let params = [];
    if (search) {
        query += ` AND (name LIKE ? OR industry LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    const companies = await publicDb.dbAll(query, params);
    sendSuccess(res, companies);
}));

app.get('/api/public/brands', asyncHandler(async (req, res) => {
    const { search, category } = req.query;
    let query = `SELECT b.*, c.name as company_name, c.consumer_group 
                 FROM public_brands b 
                 JOIN public_companies c ON b.company_id = c.id 
                 WHERE b.visibility_status = 'PUBLISHED'`;
    let params = [];
    if (search) {
        query += ` AND (b.name LIKE ? OR b.brand_description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
        query += ` AND b.category = ?`;
        params.push(category);
    }
    const brands = await publicDb.dbAll(query, params);
    sendSuccess(res, brands);
}));

// --- ADMIN TRUST REGISTRY MANAGEMENT (Standalone) ---

app.post('/api/admin/trust/companies', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared } = req.body;
    const result = await publicDb.dbRun(`
        INSERT INTO public_companies (name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared, trust_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
    `, [name, industry, consumer_group, country, profile_summary, compliance_claims, quality_practices, certifications_declared]);
    sendSuccess(res, { id: result.lastID });
}));

app.post('/api/admin/trust/brands', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { company_id, name, category, trust_badge, brand_description } = req.body;
    const result = await publicDb.dbRun(`
        INSERT INTO public_brands (company_id, name, category, trust_badge, brand_description)
        VALUES (?, ?, ?, ?, ?)
    `, [company_id, name, category, trust_badge, brand_description]);
    sendSuccess(res, { id: result.lastID });
}));

app.post('/api/admin/trust/stats', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const { key, value } = req.body;
    await publicDb.dbRun(`
        INSERT INTO system_stats (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `, [key, value]);
    sendSuccess(res, { success: true });
}));

registerTrustAdminRoutes(app, { authenticateToken, authorize, asyncHandler, sendSuccess });
registerTrustSealRoutes(app, { asyncHandler, sendSuccess });
trustRecertService.start();

app.post('/api/admin/trust/companies/:id/recertify', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => { 
    const result = await trustRecertService.recertifyCompany(req.params.id); 
    sendSuccess(res, result); 
}));

registerTrustSignalRoutes(app, { asyncHandler, sendSuccess });
registerTrustVigilanceRoutes(app, { authenticateToken, authorize, asyncHandler, sendSuccess });
vigilanceEngine.start();

// --- ADMIN IMPERSONATION ENGINE ---
app.post('/api/admin/impersonate/:userId', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
    const targetUser = await dbGet(`SELECT id, email, role, sub_role FROM users WHERE id = ?`, [req.params.userId]);
    if (!targetUser) throw new ApiError('Target user not found', 404);

    // Generate a temporary token for the target user, including an 'impersonated_by' flag
    const token = jwt.sign(
        { 
            id: targetUser.id, 
            email: targetUser.email, 
            role: targetUser.role, 
            sub_role: targetUser.sub_role, 
            impersonated_by: req.user.id 
        },
        JWT_SECRET,
        { expiresIn: '2h' }
    );

    await dbRun(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, 'IMPERSONATION_STARTED', 'user', ?, ?)`, 
        [req.user.id, targetUser.id, JSON.stringify({ target: targetUser.email })]);

    sendSuccess(res, { token, user: targetUser });
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`QualiCore API running on port ${PORT}`));
