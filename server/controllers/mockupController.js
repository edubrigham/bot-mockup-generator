// server/controllers/mockupController.js

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, roleCheck } = require('../middleware/verifyToken');
const { captureScreenshotWithConsent } = require('./puppeteerController');
const { injectChatbotScript } = require('./updateChatbotController');

const ASSETS_BASE_PATH = process.env.ASSETS_BASE_PATH || './assets';
const SCREENSHOTS_FOLDER = path.join(ASSETS_BASE_PATH, 'screenshots');
const { HTML_FILES_FOLDER } = require('../config/paths');
const upload = multer({ dest: SCREENSHOTS_FOLDER });
fs.ensureDirSync(SCREENSHOTS_FOLDER);
fs.ensureDirSync(HTML_FILES_FOLDER);

const mockupController = {
    captureScreenshot: async (req, res) => {
        const { url } = req.body;
        if (!url) {
            return res.status(400).send('URL is required');
        }

        // Clean up the previous preview if it exists
        const previousPreviewId = req.session.previewId;
        if (previousPreviewId) {
            const oldScreenshotPath = path.join(SCREENSHOTS_FOLDER, `${previousPreviewId}.png`);
            const oldHtmlFilePath = path.join(HTML_FILES_FOLDER, `${previousPreviewId}.html`);
            await fs.remove(oldScreenshotPath).catch(console.error);
            await fs.remove(oldHtmlFilePath).catch(console.error);
        }

        // Generate a new preview ID and store it in the session
        const previewId = Date.now();
        req.session.previewId = previewId;

        try {
            const { screenshotFilename, screenshotPath } = await captureScreenshotWithConsent(url, previewId);
            console.log(`Screenshot captured: ${screenshotFilename}`);

            // Generate and store HTML content
            const htmlFilename = `${previewId}.html`;
            const htmlFilePath = path.join(HTML_FILES_FOLDER, htmlFilename);
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Preview</title>
                  <!-- Add any additional scripts or styles that the chatbot requires -->
                </head>
                <body>
                  <img src="/assets/screenshots/${screenshotFilename}" alt="Preview">
                  <!-- Add a placeholder for the chatbot -->
                  <div id="chatbot"></div>
                </body>
                </html>
            `;
            fs.writeFileSync(htmlFilePath, htmlContent);

            // Generate absolute URLs for the screenshot and the HTML file
            const screenshotUrl = `${req.protocol}://${req.get('host')}/assets/screenshots/${screenshotFilename}`;
            const htmlFileUrl = `${req.protocol}://${req.get('host')}/assets/html_files/${htmlFilename}`;

            res.json({
                success: true,
                message: 'Preview generated successfully',
                previewId,
                screenshot_Path: screenshotUrl,
                html_file_path: htmlFileUrl,
                // Include any other data that needs to be stored in the frontend state
            });
        } catch (error) {
            console.error('Error capturing screenshot:', error);
            res.status(500).send('Error capturing screenshot');
        }
    },

    injectChatbotScript: async (mockupId, chatbotScript) => {
        const result = await injectChatbotScript(mockupId, chatbotScript);
        console.log('Received request to inject chatbot script for mockupId:', mockupId);
        return result;
    },

    //uploadScreenshot: async (req, res) => {
        //const { project_id } = req.body;
        //const file = req.file;

        // Save uploaded file reference in DB
        //const updateMockup = `
            //UPDATE public.mockups
            //SET screenshot_path = $1
            //WHERE project_id = $2
            //RETURNING *;
        //`;
        //const values = [`assets/screenshots/${file.filename}`, project_id];
        //const result = await pool.query(updateMockup, values);

        //res.json({ success: true, message: 'Screenshot uploaded successfully', mockup: result.rows[0] });
    //},

    updateChatbotScript: async (req, res) => {
        console.log("updateChatbotScript route hit");
        const { mockupId, chatbotScript } = req.body;
    
        // Ensure that mockupId and chatbotScript are defined
        if (!mockupId || !chatbotScript) {
            console.error('mockupId or chatbotScript is missing');
            return res.status(400).send('mockupId and chatbotScript are required');
        }
        
        const result = await injectChatbotScript(mockupId, chatbotScript);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                mockupId,  // Add this line
                chatbotScript,  // Add this line
                // Include any other data that needs to be stored in the frontend state
            });
        } else {
            res.status(500).send(result.message);
        }
        },
        
        // Serve HTML file
        serveHtml: async (req, res) => {
            const { filename } = req.params;
            const htmlFilePath = path.join(HTML_FILES_FOLDER, filename);
        
            if (fs.existsSync(htmlFilePath)) {
                res.sendFile(htmlFilePath);
            } else {
                res.status(404).send('HTML file not found or access denied');
            }
        },
        
        // Serve screenshot file
        serveFile: async (req, res) => {
            const { filename } = req.params;
            const filePath = path.join(SCREENSHOTS_FOLDER, filename);
        
            if (fs.existsSync(filePath)) {
                res.sendFile(filePath);
            } else {
                res.status(404).send('Screenshot not found or access denied');
            }
        },
        
        };
        
        module.exports = {
        mockupController,
        SCREENSHOTS_FOLDER,
        HTML_FILES_FOLDER
        };