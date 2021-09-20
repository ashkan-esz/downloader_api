const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const cheerio = require('cheerio');
const {default: pQueue} = require('p-queue');
const {check_download_link, getMatchCases, check_format} = require('./link');
const {getDecodedLink} = require('./utils');
const {saveError} = require("../saveError");
const Sentry = require('@sentry/node');

axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'SlowDown' ||
        (error.response &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});

let _headLessBrowser = false;


export async function wrapper_module(url, page_count, searchCB) {
    try {
        _headLessBrowser = checkNeedHeadlessBrowser(url);

        const concurrencyNumber = getConcurrencyNumber(url);
        const promiseQueue = new pQueue({concurrency: concurrencyNumber});
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
                        while (promiseQueue.size > 50) {
                            await new Promise((resolve => setTimeout(resolve, 50)));
                        }
                        promiseQueue.add(() => searchCB($(links[j]), i, $, url));
                    }
                }
            } catch (error) {
                saveError(error);
            }
        }
        await promiseQueue.onEmpty();
        await promiseQueue.onIdle();
    } catch (error) {
        saveError(error);
    }
}

export async function search_in_title_page(title, page_link, type, get_file_size, getQualitySample = null,
                                           extraSearch_match = null, extraSearch_getFileSize = null, sourceLinkData = null, extraChecker = null) {
    try {
        let {$, links, subtitles, cookies} = await getLinks(page_link, sourceLinkData);
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
                    save_link.push({link: link.trim(), info: link_info, qualitySample: qualitySample});
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
                    await Promise.allSettled(promiseArray);
                    promiseArray = [];
                }
            }
        }
        await Promise.allSettled(promiseArray);
        return {save_link: save_link, $2: $, subtitles, cookies};
    } catch (error) {
        saveError(error);
        return null;
    }
}

async function getLinks(url, sourceLinkData = null) {
    let checkGoogleCache = false;
    let responseUrl = '';
    let subtitles = [];
    let cookies = {};
    try {
        url = url.replace(/\/page\/1(\/|$)|\?page=1$/g, '');
        if (url.includes('/page/')) {
            url = url + '/';
        }
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
                let pageData = await getPageData(url);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                    subtitles = pageData.subtitles;
                    cookies = pageData.cookies;
                    $ = cheerio.load(pageData.pageContent);
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
        return {$, links, subtitles, cookies, checkGoogleCache, responseUrl};
    } catch (error) {
        await saveError(error);
        return {$: null, links: [], subtitles, cookies, checkGoogleCache, responseUrl};
    }
}

export async function getPageData(url) {
    try {
        url = encodeURIComponent(url);
        let remoteBrowserPassword = encodeURIComponent(process.env.REMOTE_BROWSER_PASSWORD);
        let remoteBrowserEndPoint = process.env.REMOTE_BROWSER_ENDPOINT;
        let response = await axios.get(
            `${remoteBrowserEndPoint}/headlessBrowser/?password=${remoteBrowserPassword}&url=${url}`
        );
        let data = response.data;
        return (!data || data.error) ? null : data;
    } catch (error) {
        await saveError(error);
        return null;
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
    try {
        if (url.includes('digimovie')) {
            if (pageNumber > 1 && !responseUrl.includes('page')) {
                return true;
            }
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
    } catch (error) {
        saveError(error);
        return true;
    }
}

export function checkNeedHeadlessBrowser(url) {
    return (
        url.includes('digimovie') ||
        url.includes('film2media') ||
        url.includes('f2m') ||
        url.includes('film2movie') ||
        url.includes('anime-list') ||
        url.includes('animelist')
    );
}

function getConcurrencyNumber(url) {
    let concurrencyNumber;
    if (process.env.CRAWLER_CONCURRENCY) {
        concurrencyNumber = Number(process.env.CRAWLER_CONCURRENCY);
    } else {
        concurrencyNumber = (url.includes('anime'))
            ? 6
            : (url.includes('golchin') || _headLessBrowser) ? 9 : 12;
    }
    return concurrencyNumber;
}
