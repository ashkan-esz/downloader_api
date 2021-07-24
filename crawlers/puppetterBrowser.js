const puppeteer = require('puppeteer');
const {saveError} = require("../saveError");

let browser = null;
let pages = [];
let creatingPageCounter = 0;

export async function getPageObj() {
    try {
        const tabNumber = Number(process.env.CRAWLER_BROWSER_TAB_COUNT) || 2;
        for (let i = 0; i < pages.length; i++) {
            if (pages[i].state === 'free') {
                pages[i].state = 'pending';
                return pages[i];
            }
        }

        if (pages.length + creatingPageCounter < tabNumber) {
            creatingPageCounter++;
            let newPage = await openNewPage();
            let newPageObj = null;
            if (newPage) {
                newPageObj = {
                    page: newPage,
                    state: 'pending',
                    id: pages.length
                };
                pages.push(newPageObj);
            }
            creatingPageCounter--;
            return newPageObj;
        } else {
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 2));
                for (let i = 0; i < pages.length; i++) {
                    if (pages[i].state === 'free') {
                        pages[i].state = 'pending';
                        return pages[i];
                    }
                }
            }
        }
    } catch (error) {
        saveError(error);
        return null;
    }
}

export function setPageFree(id) {
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].id === id) {
            pages[i].state = 'free';
        }
    }
}

async function openNewPage() {
    try {
        if (!browser || !browser.isConnected()) {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--single-process",
                    "--no-zygote"
                ]
            });
        }
        let page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
        await page.setViewport({width: 1280, height: 800});
        await page.setDefaultTimeout(50000);
        await page.setRequestInterception(true);
        page.on('request', (interceptedRequest) => {
            if (
                interceptedRequest.url().endsWith('.png') ||
                interceptedRequest.url().endsWith('.jpg') ||
                interceptedRequest.url().endsWith('.gif') ||
                interceptedRequest.url().endsWith('.mp4')
            )
                interceptedRequest.abort();
            else interceptedRequest.continue();
        });
        return page;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function closeBrowser() {
    try {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
        browser = null;
        pages = [];
    } catch (error) {
        await saveError(error);
    }
}
