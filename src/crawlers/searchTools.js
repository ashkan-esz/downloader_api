import config from "../config/index.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from 'cheerio';
import {default as pQueue} from "p-queue";
import {check_format} from "./link.js";
import {getAxiosSourcesObject, getPageData} from "./remoteHeadlessBrowser.js";
import {getFromGoogleCache} from "./googleCache.js";
import {getDecodedLink, getSeasonEpisode} from "./utils.js";
import {filterLowResDownloadLinks, handleRedundantPartNumber} from "./linkInfoUtils.js";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";
import * as Sentry from "@sentry/node";
import {digimovie_checkTitle} from "./sources/1digimoviez.js";
import {
    addPageLinkToCrawlerStatus,
    removePageLinkToCrawlerStatus,
    updatePageNumberCrawlerStatus
} from "./crawlerStatus.js";
import {CookieJar} from 'tough-cookie';
import {wrapper} from "axios-cookiejar-support";
import {checkNeedForceStopCrawler, checkServerIsIdle, pauseCrawler} from "./crawlerController.js";

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

export async function wrapper_module(sourceConfig, url, page_count, searchCB) {
    let lastPageNumber = 0;
    try {
        if (!url || page_count === 0) {
            return lastPageNumber;
        }
        const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, page_count);
        const promiseQueue = new pQueue.default({concurrency: concurrencyNumber});
        for (let i = 1; i <= page_count; i++) {
            if (checkNeedForceStopCrawler()) {
                break;
            }
            await pauseCrawler();
            try {
                let {
                    $,
                    links,
                    checkGoogleCache,
                    responseUrl,
                    pageTitle
                } = await getLinks(url + `${i}`, sourceConfig, 'sourcePage');
                updatePageNumberCrawlerStatus(i, page_count);
                lastPageNumber = i;
                if (checkLastPage($, links, checkGoogleCache, sourceConfig.sourceName, responseUrl, pageTitle, i)) {
                    Sentry.captureMessage(`end of crawling , last page: ${url + i}`);
                    break;
                }
                for (let j = 0, _length = links.length; j < _length; j++) {
                    if (checkNeedForceStopCrawler()) {
                        break;
                    }
                    await pauseCrawler();
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

export async function search_in_title_page(sourceConfig, title, type, page_link, pageNumber, getFileData,
                                           getQualitySample = null, extraChecker = null, getSeasonEpisodeFromInfo = false,
                                           extraSearchMatch = null, extraSearch_getFileData = null, sourceLinkData = null) {
    try {
        if (!sourceLinkData) {
            addPageLinkToCrawlerStatus(page_link, pageNumber);
        }
        if (checkNeedForceStopCrawler()) {
            return null;
        }
        await pauseCrawler();
        let {
            $,
            links,
            cookies,
            pageContent,
        } = await getLinks(page_link, sourceConfig, 'movieDataPage', sourceLinkData);
        if ($ === null || $ === undefined) {
            return null;
        }
        if (checkNeedForceStopCrawler()) {
            return null;
        }

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
                check_format(link, title)
            ) {
                let link_info = getFileData($, links[j], type, sourceLinkData, title);
                let qualitySample = getQualitySample ? getQualitySample($, links[j], type) || '' : '';
                if (link_info !== 'trailer' && link_info !== 'ignore') {
                    let season = 0, episode = 0, isNormalCase = false;
                    if (type.includes('serial') || link_info.match(/^s\d+e\d+(-?e\d+)?\./i)) {
                        if (type.includes('anime') || getSeasonEpisodeFromInfo) {
                            ({season, episode, isNormalCase} = getSeasonEpisode(link_info));
                            if ((season === 0 && episode === 0) || link_info.match(/^\d\d\d\d?p(\.|$)/)) {
                                ({season, episode, isNormalCase} = getSeasonEpisode(link));
                            }
                        } else {
                            ({season, episode, isNormalCase} = getSeasonEpisode(link));
                            if (season === 0 && !isNormalCase) {
                                ({season, episode, isNormalCase} = getSeasonEpisode(link_info));
                            }
                        }
                    }
                    downloadLinks.push({
                        link: link.trim(),
                        info: link_info.replace(/^s\d+e\d+(-?e\d+)?\./i, ''),
                        qualitySample: getDecodedLink(qualitySample),
                        sourceName: sourceConfig.sourceName,
                        pageLink: getDecodedLink(page_link),
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
                let resultPromise = search_in_title_page(sourceConfig, title, type, newPageLink, pageNumber, extraSearch_getFileData,
                    getQualitySample, extraChecker, false,
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
        downloadLinks = filterLowResDownloadLinks(downloadLinks);
        downloadLinks = handleRedundantPartNumber(downloadLinks);
        return {downloadLinks: downloadLinks, $2: $, cookies, pageContent};
    } catch (error) {
        saveError(error);
        removePageLinkToCrawlerStatus(page_link);
        return null;
    }
}

async function getLinks(url, sourceConfig, pageType, sourceLinkData = null, retryCounter = 0) {
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
            if (checkNeedForceStopCrawler()) {
                return {$: null, links: [], cookies, checkGoogleCache, responseUrl, pageTitle, pageContent};
            }
            await pauseCrawler();
            let pageData = null;
            if (sourceConfig.needHeadlessBrowser && !sourceLinkData) {
                pageData = await getPageData(url, sourceConfig.sourceName, sourceConfig.sourceAuthStatus, true);
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
                let sourceData = axiosBlackListSources.find(item => item.sourceName === sourceConfig.sourceName);
                if (sourceData && sourceData.isBlocked && !sourceLinkData && pageType === 'movieDataPage') {
                    $ = null;
                    links = [];
                } else {
                    let sourcesObject = await getAxiosSourcesObject();
                    let sourceCookies = sourcesObject ? sourcesObject[sourceConfig.sourceName].cookies : [];
                    const jar = new CookieJar();
                    const client = wrapper(axios.create({jar}));
                    let response = await client.get(url, {
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
                        addSourceToAxiosBlackList(sourceConfig.sourceName);
                    }
                }
            }
        } catch (error) {
            if (
                error.code === "ERR_BAD_REQUEST" &&
                !error.response.data.includes("مطلبی که به دنبال آن بودید یافت نشد") &&
                !error.response.data.includes("صفحه ای که به دنبال آن می گردید حذف یا اصلا وجود نداشته باشد") &&
                retryCounter < 1) {
                url = url.replace(/(?<=(page\/\d+))\/$/, '');
                retryCounter++;
                return await getLinks(url, sourceConfig, pageType, sourceLinkData, retryCounter);
            }
            if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                if (decodeURIComponent(url) === url) {
                    let temp = url.replace(/\/$/, '').split('/').pop();
                    if (temp) {
                        url = url.replace(temp, encodeURIComponent(temp));
                        return await getLinks(url, sourceConfig, pageType, sourceLinkData, retryCounter);
                    }
                }
                error.isAxiosError = true;
                error.url = url;
                error.filePath = 'searchTools';
                await saveError(error);
            } else {
                if (!sourceLinkData) {
                    addSourceToAxiosBlackList(sourceConfig.sourceName);
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
            for (let i = 0, _length = links.length; i < _length; i++) {
                const linkText = $(links[i]).text();
                const linkTitle = $(links[i]).attr('title');
                if (digimovie_checkTitle(linkText, linkTitle, responseUrl)) {
                    return false;
                }
            }
            return true;
        } else if (sourceName === "animelist") {
            const $div = $('div');
            for (let i = 0, _length = $div.length; i < _length; i++) {
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

async function getConcurrencyNumber(sourceName, needHeadlessBrowser, pageCount) {
    let concurrencyNumber = 0;
    if (config.crawler.concurrency) {
        concurrencyNumber = Number(config.crawler.concurrency);
    }
    if (concurrencyNumber === 0) {
        concurrencyNumber = (sourceName === "animelist" || sourceName === "golchindl" || needHeadlessBrowser)
            ? 9
            : 12;
    }
    if (pageCount < 3 && await checkServerIsIdle()) {
        //use higher concurrency when mode is 0 and server is idle
        concurrencyNumber += 2;
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
