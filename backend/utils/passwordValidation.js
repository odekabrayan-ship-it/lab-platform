/**
 * Validates a password against minimum security complexity requirements.
 * Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number.
 * 
 * @param {string} password - The plaintext password to validate
 * @throws {ApiError} If password does not meet requirements
 */
const { ApiError } = require('../services/businessLogic');

const validatePasswordComplexity = (password) => {
    if (!password) {
        throw new ApiError("Password is required.", 400);
    }
    if (password.length < 8) {
        throw new ApiError("Password must be at least 8 characters long.", 400);
    }
    if (!/[A-Z]/.test(password)) {
        throw new ApiError("Password must contain at least one uppercase letter.", 400);
    }
    if (!/[a-z]/.test(password)) {
        throw new ApiError("Password must contain at least one lowercase letter.", 400);
    }
    if (!/[0-9]/.test(password)) {
        throw new ApiError("Password must contain at least one number.", 400);
    }
};

module.exports = { validatePasswordComplexity };
