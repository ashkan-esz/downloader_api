import {getDatesBetween, getDayOfYear} from "./utils/utils.js";
import {getSourcesObjDB, updateSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getSourcesArray, getSourcesMethods} from "./sourcesArray.js";
import {domainChangeHandler} from "./domainChangeHandler.js";
import {saveError} from "../error/saveError.js";
import {
    checkIsCrawling,
    updateCrawlerStatus_crawlerCrashed,
    updateCrawlerStatus_crawlerEnd,
    updateCrawlerStatus_crawlerStart,
    updateCrawlerStatus_sourceEnd,
    updateCrawlerStatus_sourceStart,
} from "./status/crawlerStatus.js";
import {resolveCrawlerWarning, saveCrawlerWarning, saveServerLog} from "../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "./status/crawlerWarnings.js";
import {checkAndHandleSourceChange} from "./status/crawlerChange.js";
import * as generic from "./sources/generic.js";


export async function crawlerCycle() {
    try {
        while (checkIsCrawling()) {
            //avoid parallel crawling
            await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        }
        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            const warningMessages = getCrawlerWarningMessages();
            await saveCrawlerWarning(warningMessages.crawlerCycleCancelled);
            return warningMessages.crawlerCycleCancelled;
        }

        delete sourcesObj._id;
        delete sourcesObj.title;
        const sourcesNames = Object.keys(sourcesObj);

        let temp = getSourcesArray(sourcesObj, 2);
        let sourcesArray = [];

        for (let i = 0; i < sourcesNames.length; i++) {
            if (sourcesObj[sourcesNames[i]].config.isTorrent) {
                // ignore torrent sources
                continue
            }

            if (sourcesObj[sourcesNames[i]].config.isGeneric) {
                sourcesArray.push({
                    name: sourcesNames[i],
                    ...sourcesObj[sourcesNames[i]],
                    starter: () => {
                        return generic.default(sourcesObj[sourcesNames[i]], null, {});
                    }
                })
            } else {
                let findSource = temp.find(s => s.name === sourcesNames[i]);
                if (findSource) {
                    findSource = {
                        name: sourcesNames[i],
                        ...findSource,
                        ...sourcesObj[sourcesNames[i]],
                    }
                    sourcesArray.push(findSource);
                }
            }
        }

        //handle sources with crawlCycle
        let now = new Date();
        let sourcesWithCycle = sourcesArray.filter(item => item.crawlCycle > 0 && !item.cookies.find(c => c.expire && (Date.now() > (c.expire - 60 * 60 * 1000))))
            .sort((a, b) => {
                let lastCrawlDate_a = a.lastCrawlDate || now;
                let lastCrawlDate_b = b.lastCrawlDate || now;
                let remained_a = getDatesBetween(now, lastCrawlDate_a).days;
                let remained_b = getDatesBetween(now, lastCrawlDate_b).days;
                return remained_a > remained_b;
            });

        if (sourcesWithCycle.length > 0) {
            let lastCrawlDate = sourcesWithCycle[0].lastCrawlDate;
            if (!lastCrawlDate || getDatesBetween(now, lastCrawlDate).days >= sourcesWithCycle[0].crawlCycle) {
                await crawler(sourcesWithCycle[0].name, {crawlMode: 2, isCrawlCycle: true});
                return await crawlerCycle();
            }
        }

        //handle sources with first time crawling
        let firstTimeCrawlingSources = sourcesArray.filter(item => !item.lastCrawlDate && !item.cookies.find(c => c.expire && (Date.now() > (c.expire - 60 * 60 * 1000))));
        if (firstTimeCrawlingSources.length > 0) {
            await crawler(firstTimeCrawlingSources[0].name, {crawlMode: 2, isCrawlCycle: true});
            return await crawlerCycle();
        }

        //pick a source and crawl
        let index = getDayOfYear(now) % sourcesArray.length;
        if (getDatesBetween(now, sourcesArray[index].lastCrawlDate).days >= 5) {
            let sourceCookies = sourcesObj[sourcesArray[index].name].cookies;
            if (!sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                await crawler(sourcesArray[index].name, {crawlMode: 2, isCrawlCycle: true});
            }
        }
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function crawler(sourceName, {
    crawlMode = 0,
    isCrawlCycle = false,
    isManualStart = false,
    handleDomainChangeOnly = false,
    handleDomainChange = true,
    crawlerConcurrency = 0,
    dontUseRemoteBrowser = false,
    axiosBlockThreshHold = 0,
    remoteBrowserBlockThreshHold = 0,
    castUpdateState = 'none',
    apiUpdateState = 'none',
    trailerUploadState = 'none',
    torrentState = 'none', // none|ignore|only
}) {

    let extraConfigs = {
        crawlerConcurrency,
        dontUseRemoteBrowser,
        axiosBlockThreshHold,
        remoteBrowserBlockThreshHold,
        castUpdateState,
        apiUpdateState,
        trailerUploadState,
        torrentState,
    }

    try {
        if (checkIsCrawling()) {
            return {
                isError: true,
                message: 'another crawling is running',
            };
        }
        const startTime = new Date();
        await updateCrawlerStatus_crawlerStart(startTime, isCrawlCycle, isManualStart, crawlMode);

        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            const warningMessages = getCrawlerWarningMessages();
            await updateCrawlerStatus_crawlerCrashed(warningMessages.crawlerCancelled);
            await saveCrawlerWarning(warningMessages.crawlerCancelled);
            return {
                isError: true,
                message: warningMessages.crawlerCancelled,
            };
        }

        let sourcesNames = Object.keys(sourcesObj);
        sourcesNames = sourcesNames.filter(item => !!sourcesObj[item].config);
        let sourcesArray = getSourcesArray(sourcesObj, crawlMode, extraConfigs);
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name));
        let fullyCrawledSources = [];

        if (!handleDomainChangeOnly) {
            for (let i = 0; i < sourcesNames.length; i++) {
                if (
                    (torrentState === "ignore" && sourcesObj[sourcesNames[i]].config.isTorrent) ||
                    (torrentState === "only" && !sourcesObj[sourcesNames[i]].config.isTorrent) ||
                    (sourceName && sourcesNames[i] !== sourceName) // in single source mode
                ) {
                    continue;
                }

                const sourceCookies = sourcesObj[sourcesNames[i]].cookies;
                const disabled = sourcesObj[sourcesNames[i]].disabled;
                const isManualDisable = sourcesObj[sourcesNames[i]].isManualDisable;
                const warningMessages = getCrawlerWarningMessages(sourcesNames[i]);
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    await saveCrawlerWarning(warningMessages.expireCookieSkip);
                    continue;
                }
                if (disabled) {
                    if (!isManualDisable) {
                        await saveCrawlerWarning(warningMessages.disabledSourceSkip);
                    }
                    continue;
                }
                await resolveCrawlerWarning(warningMessages.expireCookieSkip);
                await resolveCrawlerWarning(warningMessages.disabledSourceSkip);
                await updateCrawlerStatus_sourceStart(sourcesNames[i], crawlMode);

                let sourceStarter = sourcesArray.find(s => s.name === sourcesNames[i]);
                if (!sourceStarter && sourcesObj[sourcesNames[i]].config.isGeneric) {
                    const pageCount = crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : null;
                    sourceStarter = {
                        starter: () => {
                            return generic.default(sourcesObj[sourcesNames[i]], pageCount, extraConfigs);
                        }
                    }
                }

                let lastPages = await sourceStarter.starter();

                await updateCrawlerStatus_sourceEnd(lastPages);
                await checkAndHandleSourceChange();
                if (crawlMode === 2) {
                    fullyCrawledSources.push(sourcesNames[i]);
                    let now = new Date();
                    sourcesObj[sourcesNames[i]].lastCrawlDate = now;
                    await updateSourcesObjDB({
                        [sourcesNames[i] + '.lastCrawlDate']: now,
                    });
                }
            }
        }

        let domainChangeDuration = 0;
        if (handleDomainChangeOnly || handleDomainChange) {
            domainChangeDuration = await domainChangeHandler(sourcesObj, fullyCrawledSources, extraConfigs);
        }

        const endTime = new Date();
        const crawlDuration = getDatesBetween(endTime, startTime).minutes;
        await updateCrawlerStatus_crawlerEnd(endTime, crawlDuration);
        let message = `crawling done in : ${crawlDuration}min, (domainChangeHandler: ${domainChangeDuration}min)`;
        await saveServerLog(message);
        return {
            isError: false,
            message: message,
        };
    } catch (error) {
        await updateCrawlerStatus_crawlerCrashed(error.message || '');
        await saveError(error);
        return {
            isError: true,
            message: error.message || "Internal server error",
        };
    }
}

export async function torrentCrawlerSearch({
                                               sourceName = "",
                                               title = "",
                                               type = "",
                                               isManualStart = false,
                                               crawlerConcurrency = 0,
                                               dontUseRemoteBrowser = false,
                                               castUpdateState = 'none',
                                               apiUpdateState = 'none',
                                               trailerUploadState = 'none',
                                           }) {

    let extraConfigs = {
        crawlerConcurrency,
        dontUseRemoteBrowser,
        castUpdateState,
        apiUpdateState,
        trailerUploadState,
    }

    try {
        if (checkIsCrawling()) {
            return {
                isError: true,
                message: 'another crawling is running',
            };
        }
        const startTime = new Date();
        await updateCrawlerStatus_crawlerStart(startTime, false, isManualStart, 0);

        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            const warningMessages = getCrawlerWarningMessages();
            await updateCrawlerStatus_crawlerCrashed(warningMessages.crawlerCancelled);
            await saveCrawlerWarning(warningMessages.crawlerCancelled);
            return {
                isError: true,
                message: warningMessages.crawlerCancelled,
            };
        }

        const sourcesNames = Object.keys(sourcesObj);
        let sourcesArray = getSourcesArray(sourcesObj, 0, extraConfigs);
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name) && sourcesObj[item.name].config.isTorrent);
        let sourcesMethods = getSourcesMethods();

        if (!sourceName) {
            for (let i = 0; i < sourcesArray.length; i++) {
                const sourceCookies = sourcesObj[sourcesArray[i].name].cookies;
                const disabled = sourcesObj[sourcesArray[i].name].disabled;
                const isManualDisable = sourcesObj[sourcesArray[i].name].isManualDisable;
                const warningMessages = getCrawlerWarningMessages(sourcesArray[i].name);
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    await saveCrawlerWarning(warningMessages.expireCookieSkip);
                    continue;
                }
                if (disabled) {
                    if (!isManualDisable) {
                        await saveCrawlerWarning(warningMessages.disabledSourceSkip);
                    }
                    continue;
                }
                await updateCrawlerStatus_sourceStart(sourcesArray[i].name, 0);
                let movieUrl = sourcesObj[sourcesArray[i].name].movie_url;
                let lastPages = await sourcesMethods[sourcesArray[i].name].searchByTitle(movieUrl, title, extraConfigs);
                await updateCrawlerStatus_sourceEnd(lastPages, true);
            }
        } else {
            let findSource = sourcesArray.find(x => x.name === sourceName);
            if (findSource) {
                const sourceCookies = sourcesObj[sourceName].cookies;
                const disabled = sourcesObj[sourceName].disabled;
                const isManualDisable = sourcesObj[sourceName].isManualDisable;
                const warningMessages = getCrawlerWarningMessages(sourceName);
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    await saveCrawlerWarning(warningMessages.expireCookieSkip);
                } else if (disabled) {
                    if (!isManualDisable) {
                        await saveCrawlerWarning(warningMessages.disabledSourceSkip);
                    }
                } else {
                    await updateCrawlerStatus_sourceStart(sourceName, 0);
                    let movieUrl = sourcesObj[sourceName].movie_url;
                    let lastPages = await sourcesMethods[sourceName].searchByTitle(movieUrl, title, extraConfigs);
                    await updateCrawlerStatus_sourceEnd(lastPages, true);
                }
            }
        }

        const endTime = new Date();
        const crawlDuration = getDatesBetween(endTime, startTime).minutes;
        await updateCrawlerStatus_crawlerEnd(endTime, crawlDuration);
        let message = `crawling done in : ${crawlDuration}min`;
        await saveServerLog(message);
        return {
            isError: false,
            message: message,
        };
    } catch (error) {
        await updateCrawlerStatus_crawlerCrashed(error.message || '');
        await saveError(error);
        return {
            isError: true,
            message: error.message || "Internal server error",
        };
    }
}
