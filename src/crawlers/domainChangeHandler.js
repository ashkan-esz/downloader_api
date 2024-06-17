import {updateSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getSourcesArray} from "./sourcesArray.js";
import {getPageData} from "./remoteHeadlessBrowser.js";
import {getDatesBetween} from "./utils/utils.js";
import {getResponseUrl} from "./utils/axiosUtils.js";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";
import {resolveCrawlerWarning, saveCrawlerWarning, saveServerLog} from "../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "./status/crawlerWarnings.js";
import {
    changeDomainChangeHandlerState, checkForceStopCrawler, linkStateMessages,
    updateCrawlerStatus_domainChangeHandlerCrashed,
    updateCrawlerStatus_domainChangeHandlerEnd,
    updateCrawlerStatus_domainChangeHandlerStart
} from "./status/crawlerStatus.js";


export async function domainChangeHandler(sourcesObj, fullyCrawledSources, extraConfigs) {
    try {
        await updateCrawlerStatus_domainChangeHandlerStart();
        delete sourcesObj._id;
        delete sourcesObj.title;
        let sourcesUrls = Object.keys(sourcesObj).map(sourceName => ({
            sourceName: sourceName,
            url: sourcesObj[sourceName].movie_url,
            checked: false,
            changed: false,
            crawled: false,
            errorMessage: '',
        }));

        changeDomainChangeHandlerState(sourcesUrls, linkStateMessages.domainChangeHandler.checkingUrls);
        let changedSources = await checkSourcesUrl(sourcesUrls, extraConfigs);

        if (changedSources.length > 0) {
            await saveServerLog('start domain change handler');
            updateSourceFields(sourcesObj, sourcesUrls);
            await updateDownloadLinks(sourcesObj, changedSources, fullyCrawledSources);
            await saveServerLog('source domain changed');
        }
        return await updateCrawlerStatus_domainChangeHandlerEnd();
    } catch (error) {
        await saveError(error);
        return await updateCrawlerStatus_domainChangeHandlerCrashed(error.message || '');
    }
}

async function checkSourcesUrl(sourcesUrls, extraConfigs) {
    let changedSources = [];
    try {
        for (let i = 0; i < sourcesUrls.length; i++) {
            let responseUrl;
            let homePageLink = sourcesUrls[i].url.replace(/\/page\/|\/(movie-)*anime\?page=/g, '');
            changeDomainChangeHandlerState(sourcesUrls, linkStateMessages.domainChangeHandler.checkingUrls + ` || ${sourcesUrls[i].sourceName} || ${homePageLink}`);
            try {
                if (checkForceStopCrawler()) {
                    return [];
                }
                let pageData = await getPageData(homePageLink, sourcesUrls[i].sourceName, extraConfigs);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                } else {
                    changeDomainChangeHandlerState(sourcesUrls, linkStateMessages.domainChangeHandler.retryAxios + ` || ${sourcesUrls[i].sourceName} || ${homePageLink}`);
                    responseUrl = await getResponseUrl(homePageLink);
                }
                sourcesUrls[i].checked = true;
                if (!responseUrl) {
                    continue;
                }
            } catch (error) {
                if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    let temp = homePageLink.replace(/\/$/, '').split('/').pop();
                    let url = homePageLink.replace(temp, encodeURIComponent(temp));
                    try {
                        responseUrl = await getResponseUrl(url);
                        sourcesUrls[i].checked = true;
                    } catch (error2) {
                        error2.isAxiosError = true;
                        error2.url = homePageLink;
                        error2.url2 = url;
                        error2.filePath = 'domainChangeHandler';
                        await saveErrorIfNeeded(error2);
                        sourcesUrls[i].checked = true;
                        sourcesUrls[i].errorMessage = error2.message || '';
                        continue;
                    }
                } else {
                    if (error.code !== 'ETIMEDOUT') {
                        await saveErrorIfNeeded(error);
                    }
                    sourcesUrls[i].checked = true;
                    sourcesUrls[i].errorMessage = error.message || '';
                    continue;
                }
            }

            let newUrl = getNewURl(sourcesUrls[i].url, responseUrl);

            if (sourcesUrls[i].url !== newUrl) {//changed
                sourcesUrls[i].url = newUrl;
                sourcesUrls[i].changed = true;
                changedSources.push(sourcesUrls[i]);
            }
        }
        return changedSources;
    } catch (error) {
        await saveErrorIfNeeded(error);
        return [];
    }
}

export async function checkUrlWork(sourceName, sourceUrl, extraConfigs = null, retryCounter = 0) {
    try {
        let responseUrl;
        let homePageLink = sourceUrl.replace(/(\/page\/)|(\/(movie-)*anime\?page=)|(\/$)/g, '');
        try {
            let pageData = await getPageData(homePageLink, sourceName, extraConfigs);
            if (pageData && pageData.pageContent) {
                responseUrl = pageData.responseUrl;
            } else {
                responseUrl = await getResponseUrl(homePageLink);
            }
        } catch (error) {
            if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                let temp = homePageLink.replace(/\/$/, '').split('/').pop();
                let url = homePageLink.replace(temp, encodeURIComponent(temp));
                try {
                    responseUrl = await getResponseUrl(url);
                } catch (error2) {
                    error2.isAxiosError = true;
                    error2.url = homePageLink;
                    error2.url2 = url;
                    error2.filePath = 'domainChangeHandler';
                    await saveErrorIfNeeded(error2);
                }
            } else if ((error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') && retryCounter < 2) {
                retryCounter++;
                await new Promise((resolve => setTimeout(resolve, 2000)));
                return await checkUrlWork(sourceName, sourceUrl, extraConfigs, retryCounter);
            } else {
                await saveErrorIfNeeded(error);
            }
            return "error";
        }
        responseUrl = responseUrl.replace(/(\/page\/)|(\/(movie-)*anime\?page=)|(\/$)/g, '');
        return homePageLink === responseUrl ? "ok" : responseUrl;
    } catch (error) {
        await saveErrorIfNeeded(error);
        return "error";
    }
}

function updateSourceFields(sourcesObject, sourcesUrls) {
    let sourcesNames = Object.keys(sourcesObject);
    for (let i = 0; i < sourcesNames.length; i++) {
        let thisSource = sourcesObject[sourcesNames[i]];
        let currentUrl = sourcesUrls.find(x => x.sourceName === sourcesNames[i]).url;
        if (currentUrl) {
            thisSource.movie_url = currentUrl;
            if (thisSource.serial_url) {
                thisSource.serial_url = getNewURl(thisSource.serial_url, currentUrl);
            }
        }
    }
}

async function updateDownloadLinks(sourcesObj, changedSources, fullyCrawledSources) {
    let sourcesArray = getSourcesArray(sourcesObj, 2);
    for (let i = 0; i < changedSources.length; i++) {
        try {
            let startTime = new Date();
            let sourceName = changedSources[i].sourceName;
            await saveServerLog(`domain change handler: (${sourceName} reCrawl start)`);
            changeDomainChangeHandlerState(changedSources, linkStateMessages.domainChangeHandler.crawlingSources + ` || ${sourceName}`);
            let findSource = sourcesArray.find(item => item.name === sourceName);
            if (findSource) {
                const sourceCookies = sourcesObj[sourceName].cookies;
                const disabled = sourcesObj[sourceName].disabled;
                const warningMessages = getCrawlerWarningMessages(sourceName);
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    await saveCrawlerWarning(warningMessages.expireCookieSkip_domainChange);
                } else if (disabled) {
                    await saveCrawlerWarning(warningMessages.disabledSourceSkip_domainChange);
                } else {
                    await resolveCrawlerWarning(warningMessages.expireCookieSkip_domainChange);
                    await resolveCrawlerWarning(warningMessages.disabledSourceSkip_domainChange);
                    let crawled = false;
                    if (!fullyCrawledSources.includes(sourceName)) {
                        await findSource.starter();
                        crawled = true;
                    }
                    //update source data
                    let updateSourceField = {};
                    if (crawled) {
                        sourcesObj[sourceName].lastCrawlDate = new Date();
                    }
                    sourcesObj[sourceName].lastDomainChangeDate = new Date();
                    updateSourceField[sourceName] = sourcesObj[sourceName];
                    await updateSourcesObjDB(updateSourceField);
                }
            }
            changedSources[i].crawled = true;

            await saveServerLog(`domain change handler: (${sourceName} reCrawl ended in ${getDatesBetween(new Date(), startTime).minutes} min)`);
        } catch (error) {
            saveError(error);
        }
    }
}

function getNewURl(url, currentUrl) {
    let domain = url
        .replace(/www\.|https:\/\/|http:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '')
        .split('/')[0];
    let currentDomain = currentUrl
        .replace(/www\.|https:\/\/|http:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '')
        .split('/')[0];
    return url.replace(domain, currentDomain);
}
