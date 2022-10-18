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
import {digimovie_checkTitle} from "./sources/1digimoviez.js";

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


export async function wrapper_module(sourceName, needHeadlessBrowser, sourceAuthStatus, url, page_count, searchCB) {
    try {
        const concurrencyNumber = getConcurrencyNumber(sourceName, needHeadlessBrowser);
        const promiseQueue = new pQueue.default({concurrency: concurrencyNumber});
        for (let i = 1; i <= page_count; i++) {
            try {
                let {
                    $,
                    links,
                    checkGoogleCache,
                    responseUrl,
                    pageTitle
                } = await getLinks(url + `${i}`, sourceName, needHeadlessBrowser, sourceAuthStatus);
                if (checkLastPage($, links, checkGoogleCache, sourceName, responseUrl, pageTitle, i)) {
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

export async function search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus,
                                           title, page_link, type, getFileData, getQualitySample = null,
                                           extraSearchMatch = null, extraSearch_getFileData = null, sourceLinkData = null,
                                           extraChecker = null, getSeasonEpisodeFromInfo = false) {
    try {
        let {
            $,
            links,
            cookies
        } = await getLinks(page_link, sourceName, needHeadlessBrowser, sourceAuthStatus, sourceLinkData);
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
                    if (type.includes('serial') || link_info.match(/^s\d+e\d+(-?e\d+)?\./i)) {
                        if (type.includes('anime') || getSeasonEpisodeFromInfo) {
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
                let resultPromise = search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus, title, link, type, extraSearch_getFileData, getQualitySample,
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

async function getLinks(url, sourceName, needHeadlessBrowser, sourceAuthStatus, sourceLinkData = null) {
    let checkGoogleCache = false;
    let responseUrl = '';
    let pageTitle = '';
    let cookies = {};
    try {
        url = url.replace(/\/page\/1(\/|$)|\?page=1$/g, '');
        if (url.includes('/page/')) {
            url = url + '/';
        }
        let $, links = [];
        if (!needHeadlessBrowser || (sourceLinkData && sourceLinkData.sourceLink.includes('anime-list'))) {
            try {
                let response = await axios.get(url);
                responseUrl = response.request.res.responseUrl;
                $ = cheerio.load(response.data);
                links = $('a');
            } catch (error) {
                if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    if (decodeURIComponent(url) === url) {
                        let temp = url.replace(/\/$/, '').split('/').pop();
                        if (temp) {
                            url = url.replace(temp, encodeURIComponent(temp));
                            return await getLinks(url, sourceName, needHeadlessBrowser, sourceAuthStatus, sourceLinkData);
                        }
                    }
                    error.isAxiosError = true;
                    error.url = url;
                    error.filePath = 'searchTools';
                    await saveError(error);
                } else {
                    let pageNotFound = error.response && error.response.status === 404;
                    if (!pageNotFound) {
                        let cacheResult = await getFromGoogleCache(url);
                        $ = cacheResult.$;
                        links = cacheResult.links;
                        checkGoogleCache = true;
                    }
                }
            }
        } else {
            try {
                let pageData = await getPageData(url, sourceName, sourceAuthStatus, true);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                    pageTitle = pageData.pageTitle;
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
                if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    if (decodeURIComponent(url) === url) {
                        let temp = url.replace(/\/$/, '').split('/').pop();
                        if (temp) {
                            url = url.replace(temp, encodeURIComponent(temp));
                            return await getLinks(url, sourceName, needHeadlessBrowser, sourceAuthStatus, sourceLinkData);
                        }
                    }
                    error.isAxiosError = true;
                    error.url = url;
                    error.filePath = 'searchTools';
                    await saveError(error);
                } else {
                    let cacheResult = await getFromGoogleCache(url);
                    $ = cacheResult.$;
                    links = cacheResult.links;
                    checkGoogleCache = true;
                }
            }
        }
        if (links.length < 5 && !checkGoogleCache) {
            let cacheResult = await getFromGoogleCache(url);
            $ = cacheResult.$;
            links = cacheResult.links;
            checkGoogleCache = true;
        }
        return {$, links, cookies, checkGoogleCache, responseUrl, pageTitle};
    } catch (error) {
        await saveError(error);
        return {$: null, links: [], cookies, checkGoogleCache, responseUrl, pageTitle};
    }
}

async function getFromGoogleCache(url, retryCounter = 0) {
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
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            if (retryCounter === 0) {
                let temp = url.replace(/\/$/, '').split('/').pop();
                if (temp) {
                    let tempEncode = encodeURIComponent(encodeURIComponent(temp));
                    url = url.replace(temp, tempEncode);
                    retryCounter++;
                    return await getFromGoogleCache(url, retryCounter);
                }
            }
            error.isAxiosError = true;
            error.url = getDecodedLink(url);
            error.filePath = 'searchTools';
            await saveError(error);
        } else if (error.response && error.response.status !== 404 && error.response.status !== 429) {
            saveError(error);
        }
        return {$: null, links: []};
    }
}

function checkLastPage($, links, checkGoogleCache, sourceName, responseUrl, pageTitle, pageNumber) {
    try {
        if ($ === null || $ === undefined || pageTitle.includes('صفحه پیدا نشد')) {
            return true;
        }
        if (sourceName === "digimoviez") {
            if (pageNumber > 1 && !responseUrl.includes('page')) {
                return true;
            }
            for (let i = 0; i < links.length; i++) {
                let linkText = $(links[i]).text();
                let linkTitle = $(links[i]).attr('title');
                if (digimovie_checkTitle(linkText, linkTitle, responseUrl)) {
                    return false;
                }
            }
            return true;
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

function getConcurrencyNumber(sourceName, needHeadlessBrowser) {
    let concurrencyNumber = 0;
    if (config.crawlerConcurrency) {
        concurrencyNumber = Number(config.crawlerConcurrency);
    }
    if (concurrencyNumber === 0) {
        concurrencyNumber = (sourceName === "animelist" || sourceName === "golchindl" || needHeadlessBrowser)
            ? 9
            : 12;
    }
    return concurrencyNumber;
}
