// server/config/paths.js
const path = require('path');
const ASSETS_BASE_PATH = process.env.ASSETS_BASE_PATH || './assets';
const HTML_FILES_FOLDER = path.join(ASSETS_BASE_PATH, 'html_files');
module.exports = { HTML_FILES_FOLDER };