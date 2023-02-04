import config from "../config/index.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from 'cheerio';
import {default as pQueue} from "p-queue";
import {check_download_link, getMatchCases, check_format} from "./link.js";
import {getAxiosSourcesObject, getPageData} from "./remoteHeadlessBrowser.js";
import {getFromGoogleCache} from "./googleCache.js";
import {getSeasonEpisode} from "./utils.js";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";
import * as Sentry from "@sentry/node";
import {digimovie_checkTitle} from "./sources/1digimoviez.js";
import {updatePageNumberCrawlerStatus} from "./crawlerStatus.js";

axiosRetry(axios, {
    retries: 3, // number of retries
    shouldResetTimeout: true,
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    onRetry: (retryCount, error, config) => {
        //todo : temporary fix, not fixed yet on axios 1.1.3
        delete config.headers;
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

let axiosBlackListSources = [];

export async function wrapper_module(sourceName, needHeadlessBrowser, sourceAuthStatus, url, page_count, searchCB) {
    let lastPageNumber = 0;
    try {
        if (!url || page_count === 0) {
            return lastPageNumber;
        }
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
                } = await getLinks(url + `${i}`, sourceName, needHeadlessBrowser, sourceAuthStatus, 'sourcePage');
                updatePageNumberCrawlerStatus(i);
                lastPageNumber = i;
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
        return lastPageNumber;
    } catch (error) {
        saveError(error);
        return lastPageNumber;
    }
}

export async function search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus,
                                           title, page_link, type, getFileData, getQualitySample = null,
                                           extraChecker = null, getSeasonEpisodeFromInfo = false,
                                           extraSearchMatch = null, extraSearch_getFileData = null, sourceLinkData = null) {
    try {
        let {
            $,
            links,
            cookies,
            pageContent,
        } = await getLinks(page_link, sourceName, needHeadlessBrowser, sourceAuthStatus, 'movieDataPage', sourceLinkData);
        if ($ === null || $ === undefined) {
            return null;
        }
        let matchCases = getMatchCases(title, type);
        let extraSearchLinks = [];
        let promiseArray = [];
        let downloadLinks = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');
            if (!link) {
                continue;
            }

            if (
                (extraChecker && extraChecker($, links[j], title, type)) ||
                (check_format(link, type) && check_download_link(link, matchCases, type))
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
            } else if (
                (!sourceLinkData && extraSearchMatch && extraSearchMatch($, links[j], title, type)) ||
                (sourceLinkData && sourceLinkData.searchLayer < 2 && link.match(/^\d\d\d\d?p\/$/i))
            ) {
                if (extraSearchLinks.includes(link)) {
                    continue;
                }
                extraSearchLinks.push(link);

                let newPageLink = sourceLinkData ? (page_link + link) : link;
                let resultPromise = search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus,
                    title, newPageLink, type, extraSearch_getFileData, getQualitySample, extraChecker, false,
                    extraSearchMatch, extraSearch_getFileData, {
                        $,
                        link: links[j],
                        sourceLink: page_link,
                        searchLayer: sourceLinkData ? sourceLinkData.searchLayer + 1 : 1,
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
                if (promiseArray.length > 10) {
                    await Promise.allSettled(promiseArray);
                    promiseArray = [];
                }
            }
        }
        await Promise.allSettled(promiseArray);
        return {downloadLinks: downloadLinks, $2: $, cookies, pageContent};
    } catch (error) {
        saveError(error);
        return null;
    }
}

async function getLinks(url, sourceName, needHeadlessBrowser, sourceAuthStatus, pageType, sourceLinkData = null) {
    let checkGoogleCache = false;
    let responseUrl = '';
    let pageTitle = '';
    let cookies = {};
    let pageContent = {};
    try {
        url = url.replace(/\/page\/1(\/|$)|\?page=1$/g, '');
        if (url.includes('/page/')) {
            url = url + '/';
        }
        let $, links = [];

        try {
            let pageData = null;
            if (needHeadlessBrowser && !sourceLinkData) {
                pageData = await getPageData(url, sourceName, sourceAuthStatus, true);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                    pageTitle = pageData.pageTitle;
                    cookies = pageData.cookies;
                    pageContent = pageData.pageContent;
                    $ = cheerio.load(pageData.pageContent);
                    links = $('a');
                }
            }
            if (!pageData || (!pageData.pageContent && !pageData.isAxiosCalled)) {
                freeAxiosBlackListSources();
                let sourceData = axiosBlackListSources.find(item => item.sourceName === sourceName);
                if (sourceData && sourceData.isBlocked && !sourceLinkData && pageType === 'movieDataPage') {
                    $ = null;
                    links = [];
                } else {
                    let sourcesObject = await getAxiosSourcesObject();
                    let sourceCookies = sourcesObject ? sourcesObject[sourceName].cookies : [];
                    let response = await axios.get(url, {
                        headers: {
                            Cookie: sourceCookies.map(item => item.name + '=' + item.value + ';').join(' '),
                        }
                    });
                    responseUrl = response.request.res.responseUrl;
                    if (response.data.includes('<title>Security Check ...</title>') && pageType === 'movieDataPage') {
                        $ = null;
                        links = [];
                    } else {
                        pageContent = response.data;
                        $ = cheerio.load(response.data);
                        links = $('a');
                    }
                    if (links.length < 5 && !sourceLinkData) {
                        addSourceToAxiosBlackList(sourceName);
                    }
                }
            }
        } catch (error) {
            if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                if (decodeURIComponent(url) === url) {
                    let temp = url.replace(/\/$/, '').split('/').pop();
                    if (temp) {
                        url = url.replace(temp, encodeURIComponent(temp));
                        return await getLinks(url, sourceName, needHeadlessBrowser, sourceAuthStatus, pageType, sourceLinkData);
                    }
                }
                error.isAxiosError = true;
                error.url = url;
                error.filePath = 'searchTools';
                await saveError(error);
            } else {
                if (!sourceLinkData) {
                    addSourceToAxiosBlackList(sourceName);
                }
                let cacheResult = await getFromGoogleCache(url);
                $ = cacheResult.$;
                links = cacheResult.links;
                checkGoogleCache = true;
                saveErrorIfNeeded(error);
            }
        }

        if (links.length < 5 && !checkGoogleCache) {
            let cacheResult = await getFromGoogleCache(url);
            $ = cacheResult.$;
            links = cacheResult.links;
            checkGoogleCache = true;
        }
        return {$, links, cookies, checkGoogleCache, responseUrl, pageTitle, pageContent};
    } catch (error) {
        await saveError(error);
        return {$: null, links: [], cookies, checkGoogleCache, responseUrl, pageTitle, pageContent};
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

//---------------------------------------------
//---------------------------------------------

function addSourceToAxiosBlackList(sourceName) {
    let sourceData = axiosBlackListSources.find(item => item.sourceName === sourceName);
    if (sourceData) {
        if (Date.now() - sourceData.lastErrorTime > 5 * 60 * 1000) {
            //kind of resetting counter
            sourceData.errorCounter = 1;
        }
        if (Date.now() - sourceData.lastErrorTime < 60 * 1000) {
            sourceData.errorCounter++;
        }
        sourceData.lastErrorTime = Date.now();
        if (sourceData.errorCounter >= 10) {
            sourceData.isBlocked = true;
        }
    } else {
        axiosBlackListSources.push({
            sourceName: sourceName,
            errorCounter: 1,
            lastErrorTime: Date.now(),
            isBlocked: false,
        });
    }
}

function freeAxiosBlackListSources() {
    for (let i = 0; i < axiosBlackListSources.length; i++) {
        //free source after 5 minute
        if (Date.now() - axiosBlackListSources[i].lastErrorTime >= 5 * 60 * 1000) {
            axiosBlackListSources[i].errorCounter = 0;
            axiosBlackListSources[i].lastErrorTime = 0;
            axiosBlackListSources[i].isBlocked = false;
        }
    }
}
