const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const cheerio = require('cheerio');
const PQueue = require('p-queue');
const {getPageObj, setPageFree, closePage, closeBrowser} = require('./puppetterBrowser');
const {check_download_link, getMatchCases, check_format} = require('./link');
const {getDecodedLink} = require('./utils');
const {saveError} = require("../saveError");
const {createWorker} = require('tesseract.js');
const Sentry = require('@sentry/node');

axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        (error.response &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});

let _headLessBrowser = false;
let tesseractCounter = 0;


export async function wrapper_module(url, page_count, searchCB) {
    try {
        _headLessBrowser = checkNeedHeadlessBrowser(url);

        const concurrencyNumber = getConcurrencyNumber(url, page_count);
        const promiseQueue = new PQueue({concurrency: concurrencyNumber});
        for (let i = 1; i <= page_count; i++) {
            try {
                let {$, links, checkGoogleCache, responseUrl} = await getLinks(url + `${i}`);
                if (checkLastPage($, links, checkGoogleCache, url, responseUrl, i)) {
                    await Sentry.captureMessage(`end of crawling , last page: ${url + i}`);
                    break;
                }
                for (let j = 0; j < links.length; j++) {
                    if (process.env.NODE_ENV === 'dev') {
                        await searchCB($(links[j]), i, $, url);
                    } else {
                        while (promiseQueue.size > 40) {
                            await new Promise((resolve => setTimeout(resolve, 2)));
                        }
                        promiseQueue.add(() => searchCB($(links[j]), i, $, url));
                    }
                }
            } catch (error) {
                if (_headLessBrowser) {
                    await closeBrowser();
                }
                saveError(error);
            }
        }

        await promiseQueue.onIdle();
        if (_headLessBrowser) {
            await closeBrowser();
        }
    } catch (error) {
        await closeBrowser();
        saveError(error);
    }
}

export async function search_in_title_page(title, page_link, type, get_file_size, getQualitySample = null,
                                           extraSearch_match = null, extraSearch_getFileSize = null, sourceLinkData = null, extraChecker = null) {
    try {
        let {$, links} = await getLinks(page_link, sourceLinkData);
        if ($ === null) {
            return null;
        }
        let matchCases = getMatchCases(title, type);
        let extraSearchLinks = [];
        let promiseArray = [];
        let save_link = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');

            if (link && (
                (sourceLinkData || (extraChecker && extraChecker($, links[j], title, type))) ||
                (check_format(link, type) && check_download_link(link, matchCases, type)))
            ) {
                let link_info = get_file_size($, links[j], type, sourceLinkData, title);
                let qualitySample = getQualitySample ? getQualitySample($, links[j], type) || '' : '';
                if (link_info !== 'trailer' && link_info !== 'ignore') {
                    save_link.push({link: link, info: link_info, qualitySample: qualitySample});
                }
            } else if (link && !sourceLinkData && extraSearch_match && extraSearch_match($, links[j], title, type)) {
                if (extraSearchLinks.includes(link)) {
                    continue;
                }
                extraSearchLinks.push(link);
                let resultPromise = search_in_title_page(title, link, type, extraSearch_getFileSize, getQualitySample,
                    extraSearch_match, extraSearch_getFileSize, {
                        $,
                        link: links[j],
                        sourceLink: page_link
                    }).then(result => {
                    if (result) {
                        let resultLinks = result.save_link;
                        let linkPrefix = link;
                        if (page_link.includes('anime-list')) {
                            let temp = link.replace(/(https|http):\/\//g, '').split('/')[0];
                            linkPrefix = link.includes('https') ? `https://${temp}/` : `http://${temp}/`;
                        }
                        for (let i = 0; i < resultLinks.length; i++) {
                            resultLinks[i].link = linkPrefix + resultLinks[i].link;
                        }
                        save_link.push(...resultLinks);
                    }
                });
                promiseArray.push(resultPromise);
                if (promiseArray.length > 5) {
                    await Promise.all(promiseArray);
                    promiseArray = [];
                }
            }
        }
        await Promise.all(promiseArray);
        return {save_link: save_link, $2: $};
    } catch (error) {
        saveError(error);
        return null;
    }
}

async function getLinks(url, sourceLinkData = null) {
    let checkGoogleCache = false;
    let responseUrl = '';
    try {
        url = url.replace(/\/page\/1(\/|$)|\?page=1$/g, '');
        let $, links = [];
        if (!_headLessBrowser || (sourceLinkData && sourceLinkData.sourceLink.includes('anime-list'))) {
            try {
                let response = await axios.get(url);
                responseUrl = response.request.res.responseUrl;
                $ = cheerio.load(response.data);
                links = $('a');
            } catch (error) {
                let cacheResult = await getFromGoogleCache(url);
                $ = cacheResult.$;
                links = cacheResult.links;
                checkGoogleCache = true;
            }
        } else {
            try {
                let pageObj = await getLinks_headlessBrowser(url);
                if (pageObj) {
                    let pageContent = await pageObj.page.content();
                    responseUrl = pageObj.page.url();
                    setPageFree(pageObj.id);
                    $ = cheerio.load(pageContent);
                    links = $('a');
                }
            } catch (error) {
                let cacheResult = await getFromGoogleCache(url);
                $ = cacheResult.$;
                links = cacheResult.links;
                checkGoogleCache = true;
            }
        }
        if (links.length < 5 && !checkGoogleCache) {
            let cacheResult = await getFromGoogleCache(url);
            $ = cacheResult.$;
            links = cacheResult.links;
            checkGoogleCache = true;
        }
        return {$, links, checkGoogleCache, responseUrl};
    } catch (error) {
        await saveError(error);
        return {$: null, links: [], checkGoogleCache, responseUrl};
    }
}

async function getLinks_headlessBrowser(url, canRetry = true) {
    let pageObj = await getPageObj();
    if (!pageObj) {
        pageObj = await getPageObj();
        if (!pageObj) {
            return null;
        }
    }

    let isAnimelist = url.includes('anime-list') || url.includes('animelist');
    let pageLoaded = await loadPageWithHeadlessBrowser(url, isAnimelist, pageObj);
    if (!pageLoaded) {
        return null;
    }
    if (isAnimelist && url.includes('/anime/')) {
        let captchaResult = await handleAnimeListCaptcha(pageObj.page);
        if (!captchaResult) {
            await closePage(pageObj.id);
            if (canRetry) {
                return await getLinks_headlessBrowser(url, false);
            } else {
                return null;
            }
        }
    }
    return pageObj;
}

async function loadPageWithHeadlessBrowser(url, isAnimelist, pageObj, canRetry = true) {
    try {
        if (isAnimelist) {
            await pageObj.page.goto(url, {waitUntil: "domcontentloaded"});
        } else {
            await pageObj.page.goto(url);
        }
        if (url.includes('digimovie')) {
            await pageObj.page.waitForSelector('.container');
            if (url.match(/\/serie$|\/page\//g) || url.replace('https://', '').split('/').length === 1) {
                await pageObj.page.waitForSelector('.main_site');
                await pageObj.page.waitForSelector('.alphapageNavi');
            }
        }
        return true;
    } catch (error) {
        await closePage(pageObj.id);
        pageObj = await getPageObj();
        if (pageObj && canRetry) {
            return await loadPageWithHeadlessBrowser(url, isAnimelist, pageObj, false);
        } else {
            saveError(error);
            return false;
        }
    }
}

async function getFromGoogleCache(url) {
    try {
        let decodedLink = getDecodedLink(url);
        if (process.env.NODE_ENV === 'dev') {
            console.log('google cache: ', decodedLink);
        } else {
            await Sentry.captureMessage(`google cache: ${decodedLink}`);
        }
        let cacheUrl = "http://webcache.googleusercontent.com/search?channel=fs&client=ubuntu&q=cache%3A";
        let webCacheUrl = cacheUrl + decodedLink;
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

function checkLastPage($, links, checkGoogleCache, url, responseUrl, pageNumber) {
    if (url.includes('digimovie')) {
        for (let i = 0; i < links.length; i++) {
            let linkText = $(links[i]).text();
            if (
                (linkText && linkText.includes('دانلود') && !linkText.includes('تریلر'))
            ) {
                return false;
            }
        }
    } else if (url.includes('anime-list') || url.includes('animelist')) {
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('character-movie')) {
                return false;
            }
        }
        return true;
    }

    if (links.length === 0 && checkGoogleCache) {
        return true;
    }
    return !(pageNumber === 1 || responseUrl.includes('page'));
}

export function checkNeedHeadlessBrowser(url) {
    return (
        url.includes('digimovie') ||
        url.includes('valamovie') ||
        url.includes('film2movie') ||
        url.includes('//zar') ||
        url.includes('anime-list') ||
        url.includes('animelist')
    );
}

function getConcurrencyNumber(url, page_count) {
    let concurrencyNumber;
    if (process.env.CRAWLER_CONCURRENCY) {
        concurrencyNumber = Number(process.env.CRAWLER_CONCURRENCY);
    } else if (_headLessBrowser) {
        concurrencyNumber = 5;
    } else {
        if (page_count === 1) {
            concurrencyNumber = 10;
        } else {
            concurrencyNumber = (url.includes('anime')) ? 6 : 12;
        }
    }
    return concurrencyNumber;
}

async function handleAnimeListCaptcha(page) {
    try {
        tesseractCounter++;
        while (tesseractCounter > 1) {
            await new Promise(resolve => setTimeout(resolve, 2));
        }
        let captchaImage = await page.evaluate('document.querySelector("#captcha").getAttribute("src")');
        let imageBuffer = Buffer.from(captchaImage.split(',')[1], "base64");
        const worker = createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const {data: {text}} = await worker.recognize(imageBuffer);
        await worker.terminate();
        tesseractCounter--;
        await page.type('#securityCode', text);
        await page.evaluate(() => {
            document.querySelector('button[name=submit]').click();
        });
        try {
            await page.waitForSelector('#securityCode', {hidden: true, timeout: 10000});
        } catch (error) {
            return null;
        }
        await page.waitForTimeout(10);
        return 1;
    } catch (error) {
        saveError(error);
        return null;
    }
}
