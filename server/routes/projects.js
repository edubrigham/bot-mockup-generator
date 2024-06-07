// server/routes/projects.js

const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

// Create a new project
router.post('/', verifyToken, async (req, res) => {
  const { user_id, title, description } = req.body;
  //console.log('Received request to create project:', { user_id, title, description }); // Log the request data
  try {
    const result = await pool.query(
      'INSERT INTO projects (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [user_id, title, description]
    );
    console.log('Project created:', result.rows[0]); // Log the created project
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err); // Log the error
    res.status(500).send('Server error');
  }
});

// Get all projects for a user
router.get('/user/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT p.*, u.username FROM projects p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Get a specific project by its ID
router.get('/:projectId', verifyToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
     console.log('SQL query result:', result.rows); // Log the SQL query result
    if (result.rows.length > 0) {
      console.log('Project data:', result.rows[0]); // Log the project data
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Project not found');
    }
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).send('Server error');
  }
});

// Update a project
router.put('/:projectId', verifyToken, async (req, res) => {
  const { projectId } = req.params;
  const { title, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE projects SET title = $1, description = $2 WHERE id = $3 RETURNING *',
      [title, description, projectId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Delete a project
router.delete('/:projectId', verifyToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.status(204).send('Project deleted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


module.exports = router;
