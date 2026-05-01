/**
 * PublicFieldWhitelistMiddleware
 * Ensures that only specified fields are allowed in the response.
 * This is a safety layer to prevent accidental leakage of sensitive internal fields.
 */
const enforceWhitelist = (whitelist) => {
    return (req, res, next) => {
        const originalJson = res.json;
        res.json = function (data) {
            if (data && data.success && data.data) {
                if (Array.isArray(data.data)) {
                    data.data = data.data.map(item => filterFields(item, whitelist));
                } else {
                    data.data = filterFields(data.data, whitelist);
                }
            }
            return originalJson.call(this, data);
        };
        next();
    };
};

const filterFields = (obj, whitelist) => {
    const filtered = {};
    whitelist.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(obj, field)) {
            filtered[field] = obj[field];
        }
    });
    return filtered;
};

module.exports = { enforceWhitelist };
