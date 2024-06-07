// server/routes/mockups.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db'); // Import the pool object
const { mockupController } = require('../controllers/mockupController');
const verifyToken = require('../middleware/verifyToken');
const roleCheck = require('../middleware/roleCheck');
const { injectChatbotScript } = require('../controllers/updateChatbotController');

const router = express.Router();

// File filter for validating file type
//const fileFilter = (req, file, cb) => {
  //if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    //cb(null, true);
  //} else {
    //cb(new Error('Unsupported file type'), false);
  //}
//};

// Setup multer for file uploads with file type and size validation
//const upload = multer({ 
  //dest: path.join(__dirname, '..', 'assets', 'screenshots'),
  //limits: { fileSize: 1024 * 1024 * 5 }, // 5 MB file size limit
  //fileFilter: fileFilter
//});

// Routes definition using the controller's functions
router.post('/create', verifyToken, roleCheck(['superuser', 'admin']), mockupController.captureScreenshot);
//router.post('/upload', verifyToken, roleCheck(['superuser', 'admin']), upload.single('screenshot'), mockupController.uploadScreenshot);
router.post('/update-chatbot-script', verifyToken, roleCheck(['superuser', 'admin']), mockupController.updateChatbotScript);
router.get('/html/:filename', verifyToken, mockupController.serveHtml);


// New route to serve screenshot files
router.get('/files/:filename', verifyToken, (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'assets', 'screenshots', filename + '.png');

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.log(`File not found at path: ${filePath}`); // Log for debugging
        res.status(404).send('File not found');
    }
});

router.post('/inject', verifyToken, roleCheck(['admin', 'user']), async (req, res) => {
  const { mockupId, chatbotScript } = req.body;
  const result = await mockupController.injectChatbotScript(mockupId, chatbotScript);
  res.json(result);
});

// Create a new mockup
router.post('/create-full', verifyToken, roleCheck(['superuser', 'admin']), async (req, res) => {
  //console.log('Request body:', req.body); // Log the request body
  const { project_id, page_title, page_description, url, screenshot_Path, chatbotScript, html_file_path } = req.body;
  console.log('Received request to create mockup', { project_id, page_title, page_description, url, screenshot_Path, chatbotScript, html_file_path }); // Log the request data
  //console.log('Received request to create mockup');
  try {
    const result = await pool.query(
      'INSERT INTO mockups (project_id, page_title, page_description, url, screenshot_Path, chatbot_script, html_file_path) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [project_id, page_title, page_description, url, screenshot_Path, chatbotScript, html_file_path] // Changed chatbotscript to chatbotScript
    );
    //console.log('Mockup created:', result.rows[0]); // Log the created mockup
    console.log('Mockup sucessfully created');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating mockup:', err); // Log the error
    res.status(500).send('Server error');
  }
});

// New route to get all mockups for a user
router.get('/user/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT m.* FROM mockups m JOIN projects p ON m.project_id = p.id WHERE p.user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).send('No mockups found for this user');
    }
  } catch (err) {
    console.error('Error fetching mockups:', err);
    res.status(500).send('Server error');
  }
});

// New route to get all mockups for a specific project
router.get('/project/:projectId', verifyToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM mockups WHERE project_id = $1',
      [projectId]
    );
    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).send('No mockups found for this project');
    }
  } catch (err) {
    console.error('Error fetching mockups:', err);
    res.status(500).send('Server error');
  }
});

// New route to get a mockup by user ID and URL
router.get('/', verifyToken, async (req, res) => {
  const { url } = req.query;
  const user_id = req.user.id; // Extract user_id from the token
  try {
      const result = await pool.query(
          'SELECT m.* FROM mockups m JOIN projects p ON m.project_id = p.id WHERE p.user_id = $1 AND m.url = $2',
          [user_id, url]
      );
      if (result.rows.length > 0) {
          res.json(result.rows[0]);
      } else {
          res.status(404).send('No mockup found');
      }
  } catch (err) {
      console.error('Error fetching mockup:', err);
      res.status(500).send('Server error');
  }
});

// Delete a single mockup by ID
router.delete('/:mockupId', verifyToken, roleCheck(['superuser', 'admin']), async (req, res) => {
  const { mockupId } = req.params;
  try {
    // First, retrieve the mockup to get file paths for screenshot and HTML file
    const mockupResult = await pool.query('SELECT * FROM mockups WHERE id = $1', [mockupId]);
    const mockup = mockupResult.rows[0];

    if (!mockup) {
      return res.status(404).send('Mockup not found');
    }

    // Delete screenshot file if it exists
    if (mockup.screenshot_path) {
      const screenshotPath = path.join(__dirname, '..', mockup.screenshot_path.replace('http://localhost:3001', ''));
      if (fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
      }
    }

    // Delete HTML file if it exists
    if (mockup.html_file_path) {
      const htmlFilePath = path.join(__dirname, '..', mockup.html_file_path.replace('http://localhost:3001', ''));
      if (fs.existsSync(htmlFilePath)) {
        fs.unlinkSync(htmlFilePath);
      }
    }

    // Now, delete the mockup record from the database
    await pool.query('DELETE FROM mockups WHERE id = $1', [mockupId]);

    res.status(204).send('Mockup deleted');
  } catch (err) {
    console.error('Error deleting mockup:', err);
    res.status(500).send('Server error');
  }
});

// Delete all mockups for a project
router.delete('/project/:projectId', verifyToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM mockups WHERE project_id = $1',
      [projectId]
    );

    result.rows.forEach(mockup => {
      console.log(mockup);
      if (mockup.screenshot_path) {
        const screenshotPath = path.join(__dirname, '..', mockup.screenshot_path.replace('http://localhost:3001', ''));
        if (fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
        }
      }
      if (mockup.html_file_path) {
        const htmlFilePath = path.join(__dirname, '..', mockup.html_file_path.replace('http://localhost:3001', ''));
        if (fs.existsSync(htmlFilePath)) {
          fs.unlinkSync(htmlFilePath);
        }
      }
    });

    await pool.query('DELETE FROM mockups WHERE project_id = $1', [projectId]);
    res.status(204).send('Mockups deleted');
  } catch (err) {
    console.error('Error deleting mockups:', err);
    res.status(500).send('Server error');
  }
});

// Update a mockup
router.put('/:mockupId', verifyToken, roleCheck(['superuser', 'admin']), async (req, res) => {
  const { mockupId } = req.params;
  const { page_title, page_description, chatbot_script, html_file_path } = req.body;
  try {
    const result = await pool.query(
      'UPDATE mockups SET page_title = $1, page_description = $2, chatbot_script = $3, html_file_path = $4 WHERE id = $5 RETURNING *',
      [page_title, page_description, chatbot_script, html_file_path, mockupId]
    );
    if (result.rows.length > 0) {
      // After updating the mockup in the database, update the chatbot script in the HTML file
      let htmlFileName = path.basename(html_file_path); // Extract the file name from the path
      htmlFileName = htmlFileName.replace('.html', ''); // Remove the .html extension
      const injectResult = await injectChatbotScript(htmlFileName, chatbot_script);
      if (injectResult.success) {
        res.json(result.rows[0]);
      } else {
        res.status(500).send('Error updating chatbot script in HTML file');
      }
    } else {
      res.status(404).send('No mockup found to update');
    }
  } catch (err) {
    console.error('Error updating mockup:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
