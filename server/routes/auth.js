// server/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;

// Login Endpoint - Updated to accept either email or username
router.post('/login', async (req, res) => {
  const { login, password } = req.body; // 'login' can be either an email or a username

  try {
      const userQuery = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $1', [login]);

      if (userQuery.rows.length === 0) {
          console.log(`Login attempt failed - User not found: ${login}`);
          return res.status(404).send('User not found');
      }

      const user = userQuery.rows[0];
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
          console.log(`Login attempt failed - Invalid credentials for: ${login}`);
          return res.status(403).send('Invalid credentials');
      }

      const accessToken = jwt.sign({ id: user.id, role_id: user.role_id }, jwtSecret, { expiresIn: '120m' });
      const refreshToken = jwt.sign({ id: user.id, role_id: user.role_id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
      await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
      console.log(`User logged in successfully: ${login}`);
      res.json({ accessToken });
  } catch (error) {
      console.error(`Login attempt error for ${login}: ${error.message}`);
      res.status(500).send('Server error');
  }
});

// Token Refresh Endpoint
router.post('/token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).send("Refresh Token Required");

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.id, refreshToken]);

    if (userQuery.rows.length > 0) {
      const user = userQuery.rows[0];
      const newAccessToken = jwt.sign({ id: user.id, role_id: user.role_id }, jwtSecret, { expiresIn: '15m' });
      res.json({ accessToken: newAccessToken });
    } else {
      res.status(403).send("Invalid Refresh Token");
    }
  } catch (error) {
    res.status(403).send("Invalid Refresh Token");
  }
});

// Logout Endpoint
router.post('/logout', async (req, res) => {
  const userId = req.user.id; // Assuming userID is correctly extracted
  await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
  res.clearCookie('refreshToken').send('Logged out successfully');
});

module.exports = router;
