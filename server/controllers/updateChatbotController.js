const { HTML_FILES_FOLDER } = require('../config/paths');
console.log('HTML_FILES_FOLDER:', HTML_FILES_FOLDER);
const fs = require('fs-extra');
const path = require('path');
const { pool } = require('../config/db');

async function injectChatbotScript(mockupId, chatbotScript) {
    try {
        const htmlFilePath = path.join(HTML_FILES_FOLDER, `${mockupId}.html`);
        let htmlContent = await fs.readFile(htmlFilePath, 'utf-8');

        // Inject the script tag just before the closing </body> tag
        htmlContent = htmlContent.replace('</body>', `${chatbotScript}</body>`);

        await fs.writeFile(htmlFilePath, htmlContent, 'utf-8');
        console.log('Chatbot script injected successfully');
        return { success: true, message: 'Chatbot script injected successfully' };
    } catch (error) {
        console.error('Error injecting chatbot script:', error);
        return { success: false, message: 'Error injecting chatbot script' };
    }
}

module.exports = { injectChatbotScript };