const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db'); // Make sure this points to your actual db configuration

const router = express.Router();
const saltRounds = 10;
const verifyToken = require('../middleware/verifyToken');

// Simplified Registration Endpoint for initial admin user creation
router.post('/register', async (req, res) => {
  const { username, email, password, role_id } = req.body;
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  try {
    // Insert the new user into the database
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashedPassword, role_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/me', verifyToken, async (req, res) => {
  const userId = req.user.id; // Extract userID from the token

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Endpoint to fetch a user by their ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
if (result.rows.length === 0) {
  return res.status(404).send('User not found');
}
res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Endpoint to update a user by their ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, password, role_id } = req.body;

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  try {
    // Update the user in the database
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, password = $3, role_id = $4 WHERE id = $5 RETURNING *',
      [username, email, hashedPassword, role_id, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Endpoint to delete a user by their ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the user from the database
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
