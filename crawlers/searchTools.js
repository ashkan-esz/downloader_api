const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const {saveError} = require("../saveError");
const {wordsToNumbers} = require('words-to-numbers');

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

let headLessBrowser = false;
let browser = null;
let page = null;

export async function wrapper_module(url, page_count, searchCB) {
    try {
        headLessBrowser = (
            url.includes('digimovie') ||
            url.includes('valamovie') ||
            url.includes('film2movie')
        );

        let forceWaitNumber = 35;
        for (let i = 1; i <= page_count; i++) { //todo : i=1
            try {
                let {$, links} = await getLinks(url + `${i}/`);
                for (let j = 0; j < links.length; j++) {
                    if (process.env.NODE_ENV === 'dev' || headLessBrowser) {
                        await searchCB($(links[j]), i, $);
                    } else {
                        if (j % forceWaitNumber === 0) {
                            await searchCB($(links[j]), i, $);
                        } else {
                            searchCB($(links[j]), i, $);
                        }
                    }
                }
            } catch (error) {
                if (headLessBrowser) {
                    await closeBrowser();
                }
                saveError(error);
            }
        }
        if (headLessBrowser) {
            await closeBrowser();
        }
    } catch (error) {
        await closeBrowser();
        saveError(error);
    }
}

export async function search_in_title_page(title_array, page_link, type, get_file_size) {
    try {
        let {$, links} = await getLinks(page_link);
        if ($ === null) {
            return null;
        }
        let matchCases = getMatchCases(title_array, type);
        let save_link = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');
            if (link && check_format(link, type)) {
                let result = check_download_link(link, matchCases, type);
                if (result) {
                    let link_info = get_file_size($, links[j], type);
                    if (link_info !== 'trailer' && link_info !== 'ignore') {
                        save_link.push({link: result, info: link_info});
                    }
                }
            }
        }
        return {save_link: save_link, $2: $};
    } catch (error) {
        saveError(error);
        return null;
    }
}

async function openBrowser() {
    if (headLessBrowser) {
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
    }
}

async function closeBrowser() {
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
        saveError(error);
    }
}

async function getLinks(url) {
    //todo : dont use google cache when exceed page number
    try {
        let $, links;
        let triedGoogleCache = false;
        if (!headLessBrowser) {
            try {
                url = url.replace('/page/1/', '');
                let response = await axios.get(url);
                $ = cheerio.load(response.data);
                links = $('a');
            } catch (error) {
                let cacheResult = await getFromGoogleCache(url);
                $ = cacheResult.$;
                links = cacheResult.links;
                triedGoogleCache = true;
            }
        } else {
            try {
                await openBrowser();
                await page.goto(url);
                let pageContent = await page.content();
                $ = cheerio.load(pageContent);
                links = $('a');
            } catch (error) {
                let cacheResult = await getFromGoogleCache(url);
                $ = cacheResult.$;
                links = cacheResult.links;
                triedGoogleCache = true;
            }
        }
        if (links.length < 5 && !triedGoogleCache) {
            let cacheResult = await getFromGoogleCache(url);
            $ = cacheResult.$;
            links = cacheResult.links;
        }
        return {$, links};
    } catch (error) {
        await saveError(error);
        return {$: null, links: []};
    }
}

async function getFromGoogleCache(url) {
    try {
        let encodeUrl = encodeURIComponent(url);
        let cacheUrl = "http://webcache.googleusercontent.com/search?channel=fs&client=ubuntu&q=cache%3A";
        let webCacheUrl = cacheUrl + encodeUrl;
        let response = await axios.get(webCacheUrl);
        let $ = cheerio.load(response.data);
        let links = $('a');
        await new Promise((resolve => setTimeout(resolve, 100)));
        return {$, links};
    } catch (error) {
        saveError(error);
        return {$: null, links: []};
    }
}

function check_download_link(original_link, matchCases, type) {
    let link = original_link.toLowerCase().replace(/[_-]/g, '.');
    if (link.includes('trailer')) {
        return null;
    }

    // console.log(link) //todo : remove
    // console.log(matchCases)

    if (type === 'movie') {
        if (
            link.includes(matchCases.case1) ||
            link.includes(matchCases.case2) ||
            link.includes(matchCases.case3) ||
            link.includes(matchCases.case4) ||
            decodeURIComponent(link).includes(matchCases.case1.replace(/\./g, ' ')) ||
            link.includes(matchCases.case1.replace('.iii', '.3')) ||
            link.includes(matchCases.case1.replace('.3', '.iii')) ||
            link.includes(matchCases.case1.replace('.ii', '.2')) ||
            link.includes(matchCases.case1.replace('.2', '.ii')) ||
            link.includes(matchCases.case1.replace('el', 'the')) ||
            link.includes(matchCases.case1.replace('.and', '')) ||
            link.replace('.and', '').includes(matchCases.case1) ||
            link.includes(wordsToNumbers(matchCases.case1.replace(/\./g, ' ')).replace(/\s/g, '.'))
        ) {
            return original_link;
        }

        let splitted_matchCase = matchCases.case1.split('.');
        if (splitted_matchCase.length > 6) {
            let newMatchCase = splitted_matchCase.slice(3).join('.');
            return link.includes(newMatchCase) ? original_link : null;
        }
        if (splitted_matchCase.length > 3) {
            let newMatchCase = splitted_matchCase.slice(0, 3).join('.');
            return link.includes(newMatchCase) ? original_link : null;
        }

        return null;
    } else {
        let result = link.match(/(s\d\de\d\d)/g);
        if (result) {
            return original_link;
        } else {
            return null;
        }
    }
}

function getMatchCases(title_array, type) {
    if (type === 'movie') {
        let temp = title_array.map((text) => text.replace(/&/g, 'and').replace(/[’:]/g, ''));
        let case1 = temp.map((text) => text.split('.').filter((t) => t !== ''));
        case1 = [].concat.apply([], case1);
        let case2 = case1.map((text) => text.split('-'));
        case2 = [].concat.apply([], case2);
        let case3 = title_array.filter(value => isNaN(value));
        let case4 = case3.map((text) => text.charAt(0));
        return {
            case1: case1.join('.').toLowerCase(),
            case2: case2.join('.').toLowerCase(),
            case3: case3.join('.').toLowerCase(),
            case4: case4.join('.').toLowerCase()
        }
    } else return null;
}

function check_format(link, type) {
    link = link.toLowerCase();
    let formats = ['mkv', 'avi', 'mov', 'flv', 'wmv', 'mp4'];
    let qualities = ['bluray', 'mobile', 'dvdrip', 'hdrip', 'brip', 'webrip', 'web-dl', 'web.dl',
        'farsi_dubbed', 'dvdscr', 'x264', '3d', 'hdcam', '720p', '1080p', 'farsi.dubbed'];
    let encodes = ['valamovie', 'tmkv', 'ganool', 'pahe', 'rarbg', 'evo',
        'psa', 'nitro', 'f2m', 'xredd', 'yify', 'shaanig', 'mkvcage', 'imax'];

    let link_array = link.replace(/\?\d+/g, '').split('.');
    let link_format = link_array.pop();
    for (let i = 0, l = formats.length; i < l; i++) {
        if (link_format === formats[i]) {
            // check to !trailer
            if (link.includes('teaser') || link.includes('trailer')) {
                return false;
            }

            if (link.match(/\d\d\d\dp|\d\d\dp/g) !== null) {
                for (let j = 0; j < qualities.length; j++) {
                    if (link.includes(qualities[j])) {
                        return true;
                    }
                }
                for (let j = 0; j < encodes.length; j++) {
                    if (link.includes(encodes[j])) {
                        return true;
                    }
                }
            }
            if (link.includes('dvdrip') || link.includes('hdcam') || link.includes('mobile')) {
                return true;
            }
            return (type === 'serial' && link.match(/s\d\de\d\d/g));
        }
    }
    return false;
}
