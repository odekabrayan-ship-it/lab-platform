const { dbGet, ApiError } = require('../services/businessLogic');

/**
 * Middleware to resolve and inject tenant context into the request.
 * Resolves req.tenantLabId for lab users, req.tenantClientId for client users.
 * For platform admins, both are null (unrestricted access).
 * Must be mounted AFTER authenticateToken.
 */
const requireTenantScope = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(); // If no user is authenticated, skip scope injection (or it could be handled by authenticateToken)
        }

        const user = req.user;
        req.tenantLabId = null;
        req.tenantClientId = null;

        if (user.role === 'admin') {
            // Platform admin: no tenant scope restrictions
            return next();
        }

        if (user.role === 'lab') {
            const dbUser = await dbGet(`SELECT parent_lab_id FROM users WHERE id = ?`, [user.id]);
            if (dbUser && dbUser.parent_lab_id) {
                req.tenantLabId = dbUser.parent_lab_id;
            } else {
                return next(new ApiError('Lab user is not linked to any laboratory', 403));
            }
        } else if (user.role === 'client') {
            const dbUser = await dbGet(`SELECT parent_client_id FROM users WHERE id = ?`, [user.id]);
            if (dbUser && dbUser.parent_client_id) {
                req.tenantClientId = dbUser.parent_client_id;
            } else {
                return next(new ApiError('Client user is not linked to any organization', 403));
            }
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = requireTenantScope;
