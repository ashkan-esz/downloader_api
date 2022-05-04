import config from "../config/index.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from 'cheerio';
import {default as pQueue} from "p-queue";
import {check_download_link, getMatchCases, check_format} from "./link.js";
import {getPageData} from "./remoteHeadlessBrowser.js";
import {getDecodedLink, getSeasonEpisode} from "./utils.js";
import {saveError} from "../error/saveError.js";
import * as Sentry from "@sentry/node";

axiosRetry(axios, {
    retries: 3, // number of retries
    shouldResetTimeout: true,
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
            error.response.status !== 500 &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});

let _headLessBrowser = false;

export async function wrapper_module(sourceName, needHeadlessBrowser, url, page_count, searchCB) {
    try {
        _headLessBrowser = needHeadlessBrowser;

        const concurrencyNumber = getConcurrencyNumber(sourceName);
        const promiseQueue = new pQueue.default({concurrency: concurrencyNumber});
        for (let i = 1; i <= page_count; i++) {
            try {
                let {$, links, checkGoogleCache, responseUrl} = await getLinks(url + `${i}`);
                if (checkLastPage($, links, checkGoogleCache, sourceName, responseUrl, i)) {
                    Sentry.captureMessage(`end of crawling , last page: ${url + i}`);
                    break;
                }
                for (let j = 0; j < links.length; j++) {
                    if (config.nodeEnv === 'dev') {
                        await searchCB($(links[j]), i, $, url);
                    } else {
                        while (promiseQueue.size > 24) {
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

export async function search_in_title_page(sourceName, title, page_link, type, getFileData, getQualitySample = null,
                                           extraSearchMatch = null, extraSearch_getFileData = null, sourceLinkData = null, extraChecker = null) {
    try {
        let {$, links, cookies} = await getLinks(page_link, sourceLinkData);
        if ($ === null || $ === undefined) {
            return null;
        }
        let matchCases = getMatchCases(title, type);
        let extraSearchLinks = [];
        let promiseArray = [];
        let downloadLinks = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');

            if (link && (
                (sourceLinkData || (extraChecker && extraChecker($, links[j], title, type))) ||
                (check_format(link, type) && check_download_link(link, matchCases, type)))
            ) {
                let link_info = getFileData($, links[j], type, sourceLinkData, title);
                let qualitySample = getQualitySample ? getQualitySample($, links[j], type) || '' : '';
                if (link_info !== 'trailer' && link_info !== 'ignore') {
                    let season = 0, episode = 0;
                    if (type.includes('serial')) {
                        if (type.includes('anime')) {
                            ({season, episode} = getSeasonEpisode(link_info));
                            if ((season === 0 && episode === 0) || link_info.match(/^\d\d\d\d?p\./)) {
                                ({season, episode} = getSeasonEpisode(link));
                            }
                        } else {
                            ({season, episode} = getSeasonEpisode(link));
                            if (season === 0) {
                                ({season, episode} = getSeasonEpisode(link_info));
                            }
                        }
                        if (episode > 3000) {
                            episode = 0;
                        }
                    }
                    downloadLinks.push({
                        link: link.trim(),
                        info: link_info.replace(/^s\d+e\d+(-?e\d+)?\./i, ''),
                        qualitySample: qualitySample,
                        sourceName: sourceName,
                        pageLink: page_link,
                        season, episode,
                    });
                }
            } else if (link && !sourceLinkData && extraSearchMatch && extraSearchMatch($, links[j], title, type)) {
                if (extraSearchLinks.includes(link)) {
                    continue;
                }
                extraSearchLinks.push(link);
                let resultPromise = search_in_title_page(sourceName, title, link, type, extraSearch_getFileData, getQualitySample,
                    extraSearchMatch, extraSearch_getFileData, {
                        $,
                        link: links[j],
                        sourceLink: page_link
                    }).then(result => {
                    if (result) {
                        let resultLinks = result.downloadLinks;
                        let linkPrefix = link;
                        if (page_link.includes('anime-list')) {
                            let temp = link.replace(/(https|http):\/\//g, '').split('/')[0];
                            linkPrefix = link.includes('https') ? `https://${temp}/` : `http://${temp}/`;
                        }
                        for (let i = 0; i < resultLinks.length; i++) {
                            resultLinks[i].link = linkPrefix + resultLinks[i].link;
                        }
                        downloadLinks.push(...resultLinks);
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
        return {downloadLinks: downloadLinks, $2: $, cookies};
    } catch (error) {
        saveError(error);
        return null;
    }
}

async function getLinks(url, sourceLinkData = null) {
    let checkGoogleCache = false;
    let responseUrl = '';
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
                let pageNotFound = error.response && error.response.status === 404;
                if (!pageNotFound) {
                    let cacheResult = await getFromGoogleCache(url);
                    $ = cacheResult.$;
                    links = cacheResult.links;
                }
                checkGoogleCache = true;
            }
        } else {
            try {
                let pageData = await getPageData(url);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                    cookies = pageData.cookies;
                    $ = cheerio.load(pageData.pageContent);
                    links = $('a');
                } else {
                    let response = await axios.get(url);
                    responseUrl = response.request.res.responseUrl;
                    $ = cheerio.load(response.data);
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
        return {$, links, cookies, checkGoogleCache, responseUrl};
    } catch (error) {
        await saveError(error);
        return {$: null, links: [], cookies, checkGoogleCache, responseUrl};
    }
}

async function getFromGoogleCache(url) {
    try {
        let decodedLink = getDecodedLink(url);
        if (config.nodeEnv === 'dev') {
            console.log('google cache: ', decodedLink);
        } else {
            Sentry.captureMessage(`google cache: ${decodedLink}`);
        }
        let cacheUrl = "http://webcache.googleusercontent.com/search?channel=fs&client=ubuntu&q=cache%3A";
        let webCacheUrl = cacheUrl + decodedLink;
        let response = await axios.get(webCacheUrl);
        let $ = cheerio.load(response.data);
        let links = $('a');
        await new Promise((resolve => setTimeout(resolve, 100)));
        return {$, links};
    } catch (error) {
        if (error.response && error.response.status !== 404 && error.response.status !== 429) {
            saveError(error);
        }
        return {$: null, links: []};
    }
}

function checkLastPage($, links, checkGoogleCache, sourceName, responseUrl, pageNumber) {
    try {
        if ($ === null || $ === undefined) {
            return true;
        }
        if (sourceName === "digimoviez") {
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
        } else if (sourceName === "animelist") {
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

function getConcurrencyNumber(sourceName) {
    let concurrencyNumber = 0;
    if (config.crawlerConcurrency) {
        concurrencyNumber = Number(config.crawlerConcurrency);
    }
    if (concurrencyNumber === 0) {
        concurrencyNumber = (sourceName === "animelist" || sourceName === "golchindl" || _headLessBrowser)
            ? 9
            : 12;
    }
    return concurrencyNumber;
}
