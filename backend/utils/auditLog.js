const { dbRun } = require('../services/businessLogic');

/**
 * Utility for centralized audit logging.
 * Logs sensitive actions asynchronously without blocking the main request flow.
 * 
 * @param {Object} params
 * @param {number} params.userId - The ID of the user performing the action
 * @param {string} params.action - The action being performed (e.g., 'USER_CREATED')
 * @param {string} params.entityType - The type of entity affected (e.g., 'user', 'sample')
 * @param {number|string} params.entityId - The ID of the affected entity
 * @param {Object} [params.metadata] - Additional JSON metadata describing the change
 * @param {Object} [params.req] - Express request object (used to extract IP, user-agent)
 */
const logAudit = async ({ userId, action, entityType, entityId, metadata, req }) => {
    try {
        let ipAddress = null;
        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        }

        const newValueStr = metadata ? JSON.stringify(metadata) : null;

        // Note: The existing audit_logs table schema might not have an ip_address column, 
        // but we can store it in metadata if needed. Let's just use the existing signature.
        // If we want to add IP, we merge it into metadata.
        const enrichedMetadata = {
            ...metadata,
            ...(ipAddress ? { _ip: ipAddress } : {})
        };

        const finalValueStr = JSON.stringify(enrichedMetadata);

        await dbRun(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, ?, ?, ?)`,
            [userId, action, entityType, entityId, finalValueStr]
        );
    } catch (err) {
        console.error('Audit Log Error:', err.message);
        // Do not throw to avoid breaking the main request
    }
};

module.exports = { logAudit };
