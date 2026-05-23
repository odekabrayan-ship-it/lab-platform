const { ApiError } = require('../services/businessLogic');

/**
 * Middleware to enforce portal-level access control.
 * Validates that the JWT was issued for the correct portal.
 * Must be used AFTER authenticateToken.
 *
 * Portal-Role mapping:
 *   lab   → lab, client, consumer
 *   admin → admin
 *   cert  → professional, admin
 *   trust → public (no auth required, this middleware should not be used)
 */
const requirePortal = (...allowedPortals) => {
    return (req, res, next) => {
        // Admin role has cross-portal authority
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        const tokenPortal = req.user?.portal;
        
        if (!tokenPortal || !allowedPortals.includes(tokenPortal)) {
            return next(new ApiError(
                `Access denied: This endpoint requires portal scope [${allowedPortals.join(', ')}]. Your token was issued for portal '${tokenPortal || 'none'}'.`,
                403
            ));
        }

        next();
    };
};

module.exports = requirePortal;
