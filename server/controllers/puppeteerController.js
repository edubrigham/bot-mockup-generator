// server/controllers/puppeteerController.js

require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const autoconsent = require('@duckduckgo/autoconsent/dist/autoconsent.puppet.js');
const extraRules = require('@duckduckgo/autoconsent/rules/rules.json');


// Using .env for assets base path
const ASSETS_BASE_PATH = process.env.ASSETS_BASE_PATH
const SCREENSHOTS_FOLDER = path.join(ASSETS_BASE_PATH, 'screenshots');
fs.ensureDirSync(SCREENSHOTS_FOLDER);

// Function to normalize URL
function normalizeUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
    }
    return url;
}

async function captureScreenshotWithConsent(url, previewId) {
    const browser = await puppeteer.launch({ headless: true, args: [
        '--disable-extensions-except=/path/to/manifest/folder/',
        '--load-extension=/path/to/manifest/folder/',
      ]});
    const page = await browser.newPage();

    // Normalize the URL before using it
    const normalizedUrl = normalizeUrl(url);

    console.log('Navigating to URL:', normalizedUrl);
    await page.setViewport({ width: 1900, height: 1200 });
    await page.goto(normalizedUrl, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
    await handleConsent(page, normalizedUrl); // Handles any consent pop-ups

    const screenshotFilename = `${previewId}.png`;
    const screenshotPath = path.join(SCREENSHOTS_FOLDER, screenshotFilename);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();
    return { screenshotFilename, screenshotPath: `assets/screenshots/${screenshotFilename}` };
}

async function handleConsent(page, url) {
    console.log('Handling consent for:', url);

    // Try clicking the specific "Accepter tout" button first
    const specificClicked = await page.evaluate(() => {
        const acceptButton = document.querySelector('.btn-accept');
        if (acceptButton) {
            acceptButton.click();
            return true;
        }
        return false;
    });

    if (specificClicked) {
        console.log('Specific consent button was clicked successfully.');
    } else {
        console.log('No specific consent button found. Attempting general consent handling.');

    // Define consent rules using autoconsent and extra rules
    const consentomatic = extraRules.consentomatic;
    const rules = [
        ...autoconsent.rules,
        ...Object.keys(consentomatic).map(name => new autoconsent.ConsentOMaticCMP(`com_${name}`, consentomatic[name])),
        ...extraRules.autoconsent.map(spec => autoconsent.createAutoCMP(spec)),
    ];

    // Attempt to click common consent button texts directly
    const generalClicked = await page.evaluate(() => {
            const selector = 'a[id*=cookie i], a[class*=cookie i], button[id*=cookie i], button[class*=cookie i]';
            const expectedText = /^(I agree|Accept|Accept all cookies|Accept all|Allow|Allow all|Allow all cookies|Ok|accepter tout|Accepter tout|tout accepter|accepter|Alles accepteren|tout accepter|alles aanvaarden|alle cookies aanvaarden)$/gi;
            const clickAccept = (selector) => {
                const elements = Array.from(document.querySelectorAll(selector));
                for (const element of elements) {
                    if (element.textContent.trim().match(expectedText)) {
                        element.click();
                        return true;
                    }
                }
                return false;
            };
            return clickAccept(selector);
        });

    // If direct click didn't work, try using autoconsent
    if (!generalClicked) {
        console.log('No consent button was clicked. Using autoconsent.');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 2000 }).catch(() => {});
        const tab = autoconsent.attachToPage(page, url, [
            ...autoconsent.rules,
            ...Object.keys(extraRules.consentomatic).map(name => new autoconsent.ConsentOMaticCMP(`com_${name}`, extraRules.consentomatic[name])),
            ...extraRules.autoconsent.map(spec => autoconsent.createAutoCMP(spec)),
        ], 10);
        try {
            await tab.checked;
            await tab.doOptIn();
        } catch (e) {
            console.warn(`CMP error with autoconsent:`, e);
        }
    }
}

    // Wait a bit for any post-consent processes to complete
    // Replacing waitForTimeout with a workaround using setTimeout inside page.evaluate
    await page.evaluate(() => {
        return new Promise(function(resolve) {
            setTimeout(resolve, 2000); // waits for 2000 milliseconds (2 seconds)
        });
    });
}

module.exports = {
    captureScreenshotWithConsent
};