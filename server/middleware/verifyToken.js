// server/middleware/verifyToken.js
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
    //console.log("Authorization header:", req.headers['authorization']);

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).send('Authorization header not found.');
      }
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('No token provided');
        return res.status(403).send('A token is required for authentication');
    }

    console.log("Extracted Token:", token);

    try {
        const decoded = jwt.verify(token, jwtSecret);
        console.log("Decoded token:", decoded);

        const userRoleQuery = await pool.query(
            'SELECT r.name FROM roles r INNER JOIN users u ON r.id = u.role_id WHERE u.id = $1',
            [decoded.id]
        );

        if (userRoleQuery.rows.length > 0) {
            req.user = { ...decoded, role: userRoleQuery.rows[0].name };
            next();
        } else {
            console.log('User role not found.');
            return res.status(403).send('User role not found.');
        }
    } catch (err) {
        console.error("Token verification error:", err.name, err.message);
        // Enhanced error handling for more detailed diagnostics
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).send(`JWT Error: ${err.message}`);
        } else if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).send('Token has expired');
        } else if (err instanceof jwt.NotBeforeError) {
            return res.status(401).send('Token not active yet');
        } else {
            // Handling unexpected errors, e.g., database issues
            console.error("Unexpected error during token verification:", err);
            return res.status(500).send("Internal server error during token verification");
        }
    }
};

module.exports = verifyToken;