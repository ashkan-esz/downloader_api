const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const cheerio = require('cheerio');
const PQueue = require('p-queue');
const {getPageObj, setPageFree, closePage, closeBrowser} = require('./puppetterBrowser');
const {getDecodedLink} = require('./utils');
const {saveError} = require("../saveError");
const {wordsToNumbers} = require('words-to-numbers');
const {createWorker} = require('tesseract.js');
const Sentry = require('@sentry/node');

axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.response &&
        error.response.status !== 429 &&
        error.response.status !== 404 &&
        error.response.status !== 403
    ),
});

let _headLessBrowser = false;
export let _pageCount = 0;


export async function wrapper_module(url, page_count, searchCB) {
    try {
        _headLessBrowser = checkNeedHeadlessBrowser(url);
        _pageCount = page_count;

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
        url = url.replace('/page/1/', '').replace(/\?page=1$/g, '');
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

async function getLinks_headlessBrowser(url) {
    let pageObj = await getPageObj();
    if (!pageObj) {
        pageObj = await getPageObj();
        if (!pageObj) {
            return null;
        }
    }
    //todo : make simple
    if (url.includes('anime-list')) {
        try {
            await pageObj.page.goto(url, {waitUntil: "domcontentloaded"});
        } catch (error) {
            await closePage(pageObj.id);
            pageObj = await getPageObj();
            if (pageObj) {
                await pageObj.page.goto(url, {waitUntil: "domcontentloaded"});
            } else {
                return null;
            }
        }
        if (url.includes('/anime/')) {
            let captchaResult = await handleAnimeListCaptcha(pageObj.page);
            if (!captchaResult) {
                await closePage(pageObj.id);
                pageObj = await getPageObj();
                if (pageObj) {
                    await pageObj.page.goto(url, {waitUntil: "domcontentloaded"});
                    captchaResult = await handleAnimeListCaptcha(pageObj.page);
                    if (!captchaResult) {
                        return null;
                    }
                } else {
                    return null;
                }
            }
        }
    } else {
        try {
            await pageObj.page.goto(url);
        } catch (error) {
            await closePage(pageObj.id);
            pageObj = await getPageObj();
            if (pageObj) {
                await pageObj.page.goto(url);
            } else {
                return null;
            }
        }
    }
    return pageObj;
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
    //todo : handle last page for bia2anime , animelist
    if (url.includes('digimovie')) {
        for (let i = 0; i < links.length; i++) {
            let linkText = $(links[i]).text();
            if (
                (linkText && linkText.includes('دانلود') && !linkText.includes('تریلر'))
            ) {
                return false;
            }
        }
    }

    if (links.length === 0 && checkGoogleCache) {
        return true;
    }
    return !(pageNumber === 1 || responseUrl.includes('page'));
}

function check_download_link(original_link, matchCases, type) {
    //todo : removable?
    try {
        let link = original_link.toLowerCase().replace(/[_-]/g, '.');
        if (link.includes('trailer')) {
            return null;
        }

        if (type.includes('movie')) {
            let decodedLink = getDecodedLink(link);
            if (
                link.includes(matchCases.case1) ||
                link.includes(matchCases.case2) ||
                link.includes(matchCases.case3) ||
                link.includes(matchCases.case4) ||
                decodedLink.includes(matchCases.case1) ||
                decodedLink.includes(matchCases.case1.replace(/\./g, ' ')) ||
                link.includes(matchCases.case1.replace(/\./g, '')) ||
                link.includes(matchCases.case1.replace('.ova', '.oad')) ||
                link.includes(matchCases.case1.replace('.iii', '.3')) ||
                link.includes(matchCases.case1.replace('.3', '.iii')) ||
                link.includes(matchCases.case1.replace('.ii', '.2')) ||
                link.includes(matchCases.case1.replace('.2', '.ii')) ||
                link.includes(matchCases.case1.replace('el', 'the')) ||
                link.includes(matchCases.case1.replace('.and', '')) ||
                link.replace('.and', '').includes(matchCases.case1) ||
                link.includes(wordsToNumbers(matchCases.case1.replace(/\./g, ' ')).toString().replace(/\s/g, '.')) ||
                link.includes(matchCases.case1.replace('demon.slayer', 'kimetsu.no.yaiba')) ||
                link.includes(matchCases.case1.replace('demon.slayer', 'kimetsu.no.yaiba').replace('.the.movie', ''))
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
            return checkSerialLinkMatch(link) ? original_link : null;
        }
    } catch (error) {
        saveError(error);
        return null;
    }
}

function getMatchCases(title, type) {
    if (type.includes('movie')) {
        let title_array = title.split(' ');
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

            if (link.match(/\d\d\d+p/g) !== null) {
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
            if (link.match(/\d\d\d+\.nineanime/g)) {
                return true;
            }
            return (type.includes('serial') && checkSerialLinkMatch(link));
        }
    }
    return false;
}

function checkSerialLinkMatch(link) {
    let decodedLink = getDecodedLink(link).toLowerCase().replace(/_/gi, '.');
    let serialMatch = decodedLink.match(/\[\d+]|s\d+e\d+|e\d+|\d+\.nineanime/gi);
    if (serialMatch) {
        return true;
    }
    let animeSerialMatch1 = decodedLink.match(
        /\.(episode|ep)\.\d+\.mkv|ep \d+ \[animdl\.ir]\.mkv|\.(\d\d+|oad\.dvd|ova\.orphan|special)\.animdl\.ir|\.\d\d+(\.uncen)*\.(hd|sd|bd|dvd)(\.dual[.\-]audio)*\.animdl\.ir/gi);
    if (animeSerialMatch1) {
        return true;
    }
    return decodedLink.match(
        /([.\s\[(])+\s*(.*)\s*(\d\d\d+p*|dvdrip|dvd)\s*(.*)\s*([.\s\])])+\s*([.\[]*)(bia2anime|(animdl|animelit|animList|animeList)\.(ir|top)|x265|10bit|mkv)([.\]]*)/gi);
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
    //todo : fix crash while loading eng.traineddata
    //todo : handle wrong captcha code
    try {
        let captchaImage = await page.evaluate('document.querySelector("#captcha").getAttribute("src")');
        let imageBuffer = Buffer.from(captchaImage.split(',')[1], "base64");
        const worker = createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const {data: {text}} = await worker.recognize(imageBuffer);
        await worker.terminate();
        await page.type('#securityCode', text);
        await page.evaluate(() => {
            document.querySelector('button[name=submit]').click();
        });
        try {
            await page.waitForSelector('#securityCode', {hidden: true});
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
