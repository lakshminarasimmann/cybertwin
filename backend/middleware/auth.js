/**
 * JWT Authentication Middleware
 * 
 * Security rationale: Every behavioral data point must be tied to a
 * cryptographically verified session. Without this anchor, behavioral
 * analysis has no identity correlation — defeating the entire purpose
 * of continuous identity verification.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cybertwin_jwt_secret_key_change_in_production';

/**
 * Verify JWT token and attach user context to request
 * This ensures behavioral identity is always tied to a verified session
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
            message: 'Behavioral identity verification requires an active session token.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            sessionId: decoded.sessionId,
            iat: decoded.iat
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Session expired',
                code: 'SESSION_EXPIRED',
                message: 'Re-authentication required for continued behavioral tracking.'
            });
        }
        return res.status(403).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
            message: 'Token verification failed — session integrity compromised.'
        });
    }
};

/**
 * Optional auth — allows unauthenticated access but attaches user if token present
 * Used for public endpoints that can optionally personalize responses
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                id: decoded.id || decoded.userId,
                email: decoded.email,
                sessionId: decoded.sessionId,
                iat: decoded.iat
            };
        } catch (err) {
            // Silently continue without auth
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
};

/**
 * Generate JWT token for a user session
 */
const generateToken = (userId, email, sessionId) => {
    return jwt.sign(
        { userId, email, sessionId },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );
};

module.exports = { authenticateToken, optionalAuth, generateToken };
