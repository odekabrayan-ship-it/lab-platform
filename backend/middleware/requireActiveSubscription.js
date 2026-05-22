const { ApiError, dbGet } = require('../services/businessLogic');

const requireActiveSubscription = async (req, res, next) => {
    try {
        if (!req.tenant_lab_id && !req.tenant_client_id) {
            // Internal platform staff bypass this OR unassigned users
            if (req.user && ['admin', 'professional', 'consumer'].includes(req.user.role)) {
                return next();
            }
            throw new ApiError('No tenant context found for subscription check.', 403);
        }

        let status = 'PENDING_ONBOARDING';
        let platformOverride = 0;

        if (req.tenant_lab_id) {
            const lab = await dbGet(`SELECT subscription_status, platform_override FROM laboratories WHERE id = ?`, [req.tenant_lab_id]);
            if (lab) {
                status = lab.subscription_status;
                platformOverride = lab.platform_override || 0;
            }
        } else if (req.tenant_client_id) {
            const client = await dbGet(`SELECT subscription_status, platform_override FROM clients WHERE id = ?`, [req.tenant_client_id]);
            if (client) {
                status = client.subscription_status;
                platformOverride = client.platform_override || 0;
            }
        }

        // Allow platform owners to bypass
        if (req.user && req.user.role === 'admin' && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.sub_role)) {
            platformOverride = 1;
        }

        if (status !== 'ACTIVE' && platformOverride !== 1) {
            return res.status(402).json({
                success: false,
                message: 'Payment Required: Your organization must have an active subscription to access this feature.',
                code: 'SUBSCRIPTION_REQUIRED'
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = requireActiveSubscription;
