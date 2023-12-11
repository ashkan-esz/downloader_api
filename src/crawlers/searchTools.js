import config from "../config/index.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from 'cheerio';
import PQueue from 'p-queue';
import {check_format} from "./link.js";
import {getAxiosSourcesObject, getPageData} from "./remoteHeadlessBrowser.js";
import {getFromGoogleCache} from "./googleCache.js";
import {getDecodedLink, getSeasonEpisode} from "./utils/utils.js";
import {getResponseWithCookie} from "./utils/axiosUtils.js";
import {filterLowResDownloadLinks, handleRedundantPartNumber} from "./linkInfoUtils.js";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";
import {digimovie_checkTitle} from "./sources/1digimoviez.js";
import {
    addPageLinkToCrawlerStatus,
    changePageLinkStateFromCrawlerStatus,
    changeSourcePageFromCrawlerStatus,
    linkStateMessages,
    removePageLinkToCrawlerStatus,
    updatePageNumberCrawlerStatus
} from "./status/crawlerStatus.js";
import {checkNeedForceStopCrawler, checkServerIsIdle, pauseCrawler} from "./status/crawlerController.js";
import {getCrawlerWarningMessages} from "./status/crawlerWarnings.js";
import {saveCrawlerWarning, saveServerLog} from "../data/db/serverAnalysisDbMethods.js";

axiosRetry(axios, {
    retries: 2, // number of retries
    shouldResetTimeout: true,
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    onRetry: (retryCount, error, config) => {
        // delete config.headers;
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'SlowDown' ||
        (error.response &&
            error.response.status !== 500 &&
            error.response.status !== 503 &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403 &&
            error.response.status !== 400)
    ),
});

export const axiosBlackListSources = [];

export async function wrapper_module(sourceConfig, url, pageCount, searchCB) {
    let lastPageNumber = 0;
    try {
        if (!url || pageCount === 0) {
            return lastPageNumber;
        }
        const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser);
        const promiseQueue = new PQueue({concurrency: concurrencyNumber});
        for (let i = 1; (pageCount === null || i <= pageCount); i++) {
            if (checkNeedForceStopCrawler()) {
                break;
            }
            await pauseCrawler();
            try {
                changeSourcePageFromCrawlerStatus(url + `${i}`, linkStateMessages.sourcePage.start);
                let {
                    $,
                    links,
                    checkGoogleCache,
                    responseUrl,
                    pageTitle
                } = await getLinks(url + `${i}`, sourceConfig, 'sourcePage');
                changeSourcePageFromCrawlerStatus(url + `${i}`, linkStateMessages.sourcePage.fetchingEnd);
                updatePageNumberCrawlerStatus(i, pageCount, concurrencyNumber);
                lastPageNumber = i;
                if (checkLastPage($, links, checkGoogleCache, sourceConfig.sourceName, responseUrl, pageTitle, i)) {
                    if (i !== 2 || pageCount !== 1) {
                        await saveServerLog(`end of crawling (${sourceConfig.sourceName}), last page: ${url + i}/${pageCount}`);
                    }
                    if (i === 1 || (pageCount && i < pageCount)) {
                        const warningMessages = getCrawlerWarningMessages(sourceConfig.sourceName, i);
                        await saveCrawlerWarning(warningMessages.sourceLastPage);
                    }
                    break;
                }
                for (let j = 0, _length = links.length; j < _length; j++) {
                    if (checkNeedForceStopCrawler()) {
                        break;
                    }
                    await pauseCrawler();
                    await promiseQueue.onSizeLessThan(50);
                    promiseQueue.add(() => searchCB($(links[j]), i, $, url));
                }
            } catch (error) {
                saveError(error);
            }
        }
        changeSourcePageFromCrawlerStatus('', '');
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
            removePageLinkToCrawlerStatus(page_link);
            return null;
        }
        await pauseCrawler();
        let {
            $,
            links,
            cookies,
            pageContent,
        } = await getLinks(page_link, sourceConfig, 'movieDataPage', sourceLinkData);
        if ($ === null || $ === undefined || checkNeedForceStopCrawler()) {
            removePageLinkToCrawlerStatus(page_link);
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
                                ({season, episode, isNormalCase} = getSeasonEpisode(link, true));
                            }
                        } else {
                            ({season, episode, isNormalCase} = getSeasonEpisode(link, true));
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
        const pageLink = url;
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
                saveLinksStatus(pageLink, pageType, 'fetchingStart');
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
                    if (pageType === 'sourcePage') {
                        if (sourceConfig.needHeadlessBrowser && !sourceLinkData) {
                            changeSourcePageFromCrawlerStatus(pageLink, linkStateMessages.sourcePage.retryAxiosCookie);
                        } else {
                            changeSourcePageFromCrawlerStatus(pageLink, linkStateMessages.sourcePage.fetchingStart_axios);
                        }
                    } else {
                        if (sourceConfig.needHeadlessBrowser && !sourceLinkData) {
                            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.gettingPageData.retryAxiosCookie);
                        } else {
                            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.gettingPageData.gettingPageData_axios);
                        }
                    }
                    let sourcesObject = await getAxiosSourcesObject();
                    let sourceCookies = sourcesObject ? sourcesObject[sourceConfig.sourceName].cookies : [];
                    const cookie = sourceCookies.map(item => item.name + '=' + item.value + ';').join(' ');
                    let responseTimeout = pageType === 'sourcePage' ? 15 * 1000 : 10 * 1000;
                    let response = await getResponseWithCookie(url, cookie, responseTimeout);
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
                error.message !== 'certificate has expired' && error.code !== "ERR_TLS_CERT_ALTNAME_INVALID" &&
                retryCounter < 1) {
                url = url.replace(/(?<=(page\/\d+))\/$/, '');
                retryCounter++;
                saveLinksStatus(pageLink, pageType, 'retryOnNotFound');
                return await getLinks(url, sourceConfig, pageType, sourceLinkData, retryCounter);
            }
            if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                if (decodeURIComponent(url) === url) {
                    let temp = url.replace(/\/$/, '').split('/').pop();
                    if (temp) {
                        url = url.replace(temp, encodeURIComponent(temp));
                        saveLinksStatus(pageLink, pageType, 'retryUnEscapedCharacters');
                        return await getLinks(url, sourceConfig, pageType, sourceLinkData, retryCounter);
                    }
                }
                error.isAxiosError = true;
                error.url = url;
                error.filePath = 'searchTools';
                await saveErrorIfNeeded(error);
            } else {
                if (!sourceLinkData) {
                    addSourceToAxiosBlackList(sourceConfig.sourceName);
                }
                saveLinksStatus(pageLink, pageType, 'fromCache');
                let cacheResult = await getFromGoogleCache(url);
                $ = cacheResult.$;
                links = cacheResult.links;
                checkGoogleCache = true;
                if (error.message === 'timeout of 10000ms exceeded') {
                    const warningMessages = getCrawlerWarningMessages('10s', sourceConfig.sourceName);
                    await saveCrawlerWarning(warningMessages.axiosTimeoutError);
                } else if (error.message === 'timeout of 15000ms exceeded') {
                    const warningMessages = getCrawlerWarningMessages('15s', sourceConfig.sourceName);
                    await saveCrawlerWarning(warningMessages.axiosTimeoutError);
                } else {
                    await saveErrorIfNeeded(error);
                }
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
        await saveErrorIfNeeded(error);
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
        saveErrorIfNeeded(error);
        return true;
    }
}

async function getConcurrencyNumber(sourceName, needHeadlessBrowser) {
    let concurrencyNumber = 0;
    if (config.crawler.concurrency) {
        concurrencyNumber = Number(config.crawler.concurrency);
    }
    if (concurrencyNumber === 0) {
        concurrencyNumber = needHeadlessBrowser ? 9 : 12;
    }
    if (await checkServerIsIdle()) {
        //use higher concurrency when mode is 0 and server is idle
        concurrencyNumber += 3;
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
            sourceData.totalErrorCounter++;
        }
        if (Date.now() - sourceData.lastErrorTime < 60 * 1000) {
            sourceData.errorCounter++;
            sourceData.totalErrorCounter++;
        }
        sourceData.lastErrorTime = Date.now();
        if (sourceData.errorCounter >= 15) {
            sourceData.isBlocked = true;
        }
    } else {
        axiosBlackListSources.push({
            sourceName: sourceName,
            errorCounter: 1,
            lastErrorTime: Date.now(),
            isBlocked: false,
            totalErrorCounter: 1,
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

//---------------------------------------------
//---------------------------------------------

function saveLinksStatus(pageLink, pageType, state) {
    if (state === 'fetchingStart') {
        if (pageType === 'sourcePage') {
            changeSourcePageFromCrawlerStatus(pageLink, linkStateMessages.sourcePage.fetchingStart);
        } else {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.gettingPageData.gettingPageData);
        }
    } else if (state === 'retryOnNotFound') {
        if (pageType === 'sourcePage') {
            changeSourcePageFromCrawlerStatus(pageLink, linkStateMessages.sourcePage.retryOnNotFound);
        } else {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.gettingPageData.retryOnNotFound);
        }
    } else if (state === 'retryUnEscapedCharacters') {
        if (pageType === 'sourcePage') {
            changeSourcePageFromCrawlerStatus(pageLink, linkStateMessages.sourcePage.retryUnEscapedCharacters);
        } else {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.gettingPageData.retryUnEscapedCharacters);
        }
    } else if (state === 'fromCache') {
        if (pageType === 'sourcePage') {
            changeSourcePageFromCrawlerStatus(pageLink, linkStateMessages.sourcePage.fromCache);
        } else {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.gettingPageData.fromCache);
        }
    }
}