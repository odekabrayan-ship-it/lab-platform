const { ApiError } = require('../services/businessLogic');

/**
 * Middleware to enforce specific sub-roles for platform admin routes.
 * Must be used AFTER `authenticateToken` middleware.
 * 
 * @param {string[]} allowedRoles Array of allowed sub_roles (e.g., ['SUPER_ADMIN', 'PLATFORM_ADMIN'])
 */
const requireSubRole = (allowedRoles = []) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return next(new ApiError('Authentication required', 401));
        }

        // Only applies to platform admins. Lab and client users are blocked.
        if (user.role !== 'admin') {
            return next(new ApiError('Access denied: Platform administrators only.', 403));
        }

        // Check if user has an allowed sub_role
        if (!user.sub_role || !allowedRoles.includes(user.sub_role)) {
             return next(new ApiError(`Access denied: Requires one of [${allowedRoles.join(', ')}].`, 403));
        }

        next();
    };
};

module.exports = requireSubRole;
