const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Add authorize middleware near authenticateToken
const authorizeMiddleware = `
function authorize(role) {
    return (req, res, next) => {
        if (req.user.role !== role && req.user.role !== 'admin') {
            return next(new ApiError('Forbidden: Insufficient privileges', 403));
        }
        next();
    };
}
`;
code = code.replace(/function authenticateToken[\s\S]*?next\(\);\n    }\);\n}/, match => match + '\n' + authorizeMiddleware);

// 2. Replace manual role checks with authorize middleware
// We can just add authorize('lab') to the routes that need it.
code = code.replace(/app\.put\('\/api\/requests\/:id\/respond', authenticateToken, asyncHandler/g, "app.put('/api/requests/:id/respond', authenticateToken, authorize('lab'), asyncHandler");
code = code.replace(/if \(req\.user\.role !== 'lab'\) throw new ApiError\('Only labs can respond', 403\);\n/g, "");

code = code.replace(/app\.put\('\/api\/requests\/:id\/status', authenticateToken, asyncHandler/g, "app.put('/api/requests/:id/status', authenticateToken, authorize('lab'), asyncHandler");
code = code.replace(/if \(req\.user\.role !== 'lab'\) throw new ApiError\('Only labs can update status', 403\);\n/g, "");

code = code.replace(/app\.post\('\/api\/reports\/generate', authenticateToken, asyncHandler/g, "app.post('/api/reports/generate', authenticateToken, authorize('lab'), asyncHandler");
code = code.replace(/if \(req\.user\.role !== 'lab'\) throw new ApiError\('Only lab users can generate reports', 403\);\n/g, "");

// 3. Update audit_log inserts
// Old: `INSERT INTO audit_log (user_id, action, metadata) VALUES (?, ?, ?)`
// New: `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, 'system', NULL, ?)`
// Let's use a simpler regex
code = code.replace(/INSERT INTO audit_log \(user_id, action, metadata\)/g, "INSERT INTO audit_logs (user_id, action, entity_type, new_value)");

// 4. Update notification types
code = code.replace(/'TEST_REQUEST_ACCEPTED'/g, "'request'");
code = code.replace(/'TEST_REQUEST_REJECTED'/g, "'request'");
code = code.replace(/'TEST_STATUS_UPDATED'/g, "'request'");
code = code.replace(/'REPORT_READY'/g, "'report'");
code = code.replace(/'REPORT_GENERATED'/g, "'report'");
code = code.replace(/'NEW_TEST_REQUEST'/g, "'request'");
code = code.replace(/'ENGAGEMENT_ACCEPTED'/g, "'engagement'");
code = code.replace(/'ENGAGEMENT_REJECTED'/g, "'engagement'");

// 5. Add Notifications API
const notifAPI = `
// =======================
// NOTIFICATIONS API
// =======================
app.get('/api/notifications', authenticateToken, asyncHandler(async (req, res) => {
    const rows = await dbAll(\`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50\`, [req.user.id]);
    sendSuccess(res, rows);
}));

app.patch('/api/notifications/:id/read', authenticateToken, asyncHandler(async (req, res) => {
    await dbRun(\`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?\`, [req.params.id, req.user.id]);
    sendSuccess(res, { success: true });
}));

`;

if (!code.includes('/api/notifications')) {
    code = code.replace('// Centralized Error Middleware', notifAPI + '// Centralized Error Middleware');
}

fs.writeFileSync('server.js', code);
console.log('server.js updated');
