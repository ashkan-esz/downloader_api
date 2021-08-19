const puppeteer = require('puppeteer');
const {saveError} = require("../saveError");

let browser = null;
let pages = [];
let pageIdCounter = 0;
let creatingPageCounter = 0;

//todo : optimize puppeteer for other sources
//todo : check puppeteer works on all needed source
//todo : check memory usage of chrome in anime-list

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
                    id: pageIdCounter
                };
                pageIdCounter++;
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
        //todo : lower timeout and use page recreation
        await page.setDefaultTimeout(50000);
        await page.setRequestInterception(true);
        page.on('request', (interceptedRequest) => {
            if (
                interceptedRequest.url().endsWith('.png') ||
                interceptedRequest.url().endsWith('.jpg') ||
                interceptedRequest.url().endsWith('.jpeg') ||
                interceptedRequest.url().endsWith('.gif') ||
                interceptedRequest.url().endsWith('.svg') ||
                interceptedRequest.url().endsWith('.ico') ||
                interceptedRequest.url().endsWith('.woff2') ||
                interceptedRequest.url().endsWith('.ttf') ||
                interceptedRequest.url().endsWith('.css') ||
                interceptedRequest.url().endsWith('.webp') ||
                interceptedRequest.url().endsWith('.json') ||
                interceptedRequest.url().endsWith('.mp4') ||
                interceptedRequest.url().endsWith('all.js') ||
                interceptedRequest.url().endsWith('footer-bundle.js') ||
                interceptedRequest.url().endsWith('jquery.ui.position.min.js') ||
                interceptedRequest.url().endsWith('uikit-icons.min.js') ||
                interceptedRequest.url().includes('youtube') ||
                interceptedRequest.url().includes('yektanet') ||
                interceptedRequest.url().includes('google') ||
                interceptedRequest.url().includes('zarpop')
            ) {
                interceptedRequest.abort();
            } else {
                interceptedRequest.continue();
            }
        });
        return page;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function closePage(id) {
    let selectedPage = null;
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].id === id) {
            selectedPage = pages[i];
        }
    }
    if (selectedPage) {
        pages = pages.filter(item => item.id !== id);
        await selectedPage.page.close();
    }
}

export async function closeBrowser() {
    try {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
        browser = null;
        pages = [];
        pageIdCounter = 0;
    } catch (error) {
        await saveError(error);
    }
}
