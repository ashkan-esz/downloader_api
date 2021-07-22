const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const cheerio = require('cheerio');
const PQueue = require('p-queue');
const {getPageObj, setPageFree, closeBrowser} = require('./puppetterBrowser');
const {saveError} = require("../saveError");
const {wordsToNumbers} = require('words-to-numbers');
const Sentry = require('@sentry/node');

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

let _headLessBrowser = false;
export let _pageCount = 0;

//todo : handle links that are in another page

export async function wrapper_module(url, page_count, searchCB) {
    try {
        _headLessBrowser = (
            url.includes('digimovie') ||
            url.includes('valamovie') ||
            url.includes('film2movie') ||
            url.includes('//zar')
        );
        _pageCount = page_count;

        const concurrencyNumber = getConcurrencyNumber(url, page_count);
        const promiseQueue = new PQueue({concurrency: concurrencyNumber});
        for (let i = 1; i <= page_count; i++) {
            try {
                let {$, links, checkGoogleCache, responseUrl} = await getLinks(url + `${i}/`);
                if (checkLastPage($, links, checkGoogleCache, url, responseUrl, i)) {
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

export async function search_in_title_page(title, page_link, type, get_file_size, getQualitySample = null) {
    try {
        let {$, links} = await getLinks(page_link);
        if ($ === null) {
            return null;
        }
        let matchCases = getMatchCases(title, type);
        let save_link = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');
            if (link && check_format(link, type)) {
                let result = check_download_link(link, matchCases, type);
                if (result) {
                    let link_info = get_file_size($, links[j], type);
                    let qualitySample = getQualitySample ? getQualitySample($, links[j], type) || '' : '';
                    if (link_info !== 'trailer' && link_info !== 'ignore') {
                        save_link.push({link: result, info: link_info, qualitySample: qualitySample});
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

async function getLinks(url) {
    let checkGoogleCache = false;
    let responseUrl = '';
    try {
        url = url.replace('/page/1/', '');
        let $, links = [];
        if (!_headLessBrowser) {
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
                let pageObj = await getPageObj();
                if (pageObj) {
                    await pageObj.page.goto(url);
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

async function getFromGoogleCache(url) {
    try {
        if (process.env.NODE_ENV === 'dev') {
            console.log('google cache: ', url);
        } else {
            await Sentry.captureMessage(`google cache: ${url}`);
        }
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
    }

    if (links.length === 0 && checkGoogleCache) {
        return true;
    }
    return !(pageNumber === 1 || responseUrl.includes('page/'));
}

function check_download_link(original_link, matchCases, type) {
    let link = original_link.toLowerCase().replace(/[_-]/g, '.');
    if (link.includes('trailer')) {
        return null;
    }

    if (type.includes('movie')) {
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
            link.includes(wordsToNumbers(matchCases.case1.replace(/\./g, ' ')).replace(/\s/g, '.')) ||
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
        return checkSerialLinkMatch(link) ? original_link : null
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
            if (link.match(/(\d\d\d\d|\d\d\d)\.nineanime/g)) {
                return true;
            }
            return (type.includes('serial') && checkSerialLinkMatch(link));
        }
    }
    return false;
}

function checkSerialLinkMatch(link) {
    return decodeURIComponent(link).match(/s\d\de\d\d|e\d+|\d+\.nineanime|\[\d+]/g)
}

function getConcurrencyNumber(url, page_count) {
    let concurrencyNumber;
    if (process.env.CRAWLER_CONCURRENCY) {
        concurrencyNumber = Number(process.env.CRAWLER_CONCURRENCY);
    } else if (_headLessBrowser) {
        concurrencyNumber = (page_count === 1) ? 4 : 6;
    } else {
        if (page_count === 1) {
            concurrencyNumber = 10;
        } else {
            concurrencyNumber = (url.includes('nineanime')) ? 6 : 12;
        }
    }
    return concurrencyNumber;
}
