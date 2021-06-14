const puppeteer = require('puppeteer');
const {saveError} = require("../saveError");


let browser = null;
let page = null;

export async function openBrowser() {
    if (!page || !browser || !browser.isConnected()) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--single-process",
                "--no-zygote"
            ]
        });
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
        await page.setViewport({width: 1280, height: 800});
        await page.setDefaultTimeout(60000);
        await page.setDefaultNavigationTimeout(60000);
    }
    if (page && page.isClosed()) {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
        await page.setViewport({width: 1280, height: 800});
        await page.setDefaultTimeout(60000);
        await page.setDefaultNavigationTimeout(60000);
    }
    return page;
}

export async function closeBrowser() {
    try {
        if (page && !page.isClosed()) {
            await page.close();
        }
        page = null;
        if (browser && browser.isConnected()) {
            await browser.close();
        }
        browser = null;
    } catch (error) {
        await saveError(error);
    }
}
