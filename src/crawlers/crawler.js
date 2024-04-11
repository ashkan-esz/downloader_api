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
        const sourcesNames = Object.keys(sourcesObj);
        // ignore torrent sources
        let sourcesArray = getSourcesArray(sourcesObj, 2).filter(item => !item.configs.isTorrent);
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name));
        sourcesArray = sourcesArray.map(item => ({name: item.name, ...sourcesObj[item.name]}));

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

        const sourcesNames = Object.keys(sourcesObj);
        let sourcesArray = getSourcesArray(sourcesObj, crawlMode, extraConfigs);
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name));
        let fullyCrawledSources = [];

        if (!handleDomainChangeOnly) {
            if (!sourceName) {
                for (let i = 0; i < sourcesArray.length; i++) {
                    if (
                        (torrentState === "ignore" && sourcesArray[i].configs.isTorrent) ||
                        (torrentState === "only" && !sourcesArray[i].configs.isTorrent)
                    ) {
                        continue;
                    }
                    const sourceCookies = sourcesObj[sourcesArray[i].name].cookies;
                    const disabled = sourcesObj[sourcesArray[i].name].disabled;
                    const warningMessages = getCrawlerWarningMessages(sourcesArray[i].name);
                    if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                        await saveCrawlerWarning(warningMessages.expireCookieSkip);
                        continue;
                    }
                    if (disabled) {
                        await saveCrawlerWarning(warningMessages.disabledSourceSkip);
                        continue;
                    }
                    await resolveCrawlerWarning(warningMessages.expireCookieSkip);
                    await resolveCrawlerWarning(warningMessages.disabledSourceSkip);
                    await updateCrawlerStatus_sourceStart(sourcesArray[i].name, crawlMode);
                    let lastPages = await sourcesArray[i].starter();
                    await updateCrawlerStatus_sourceEnd(lastPages);
                    await checkAndHandleSourceChange();
                    if (crawlMode === 2) {
                        fullyCrawledSources.push(sourcesArray[i].name);
                        let now = new Date();
                        sourcesObj[sourcesArray[i].name].lastCrawlDate = now;
                        await updateSourcesObjDB({
                            [sourcesArray[i].name + '.lastCrawlDate']: now,
                        });
                    }
                }
            } else {
                let findSource = sourcesArray.find(x => x.name === sourceName);
                if (findSource) {
                    const sourceCookies = sourcesObj[sourceName].cookies;
                    const disabled = sourcesObj[sourceName].disabled;
                    const warningMessages = getCrawlerWarningMessages(sourceName);
                    if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                        await saveCrawlerWarning(warningMessages.expireCookieSkip);
                    } else if (disabled) {
                        await saveCrawlerWarning(warningMessages.disabledSourceSkip);
                    } else {
                        await resolveCrawlerWarning(warningMessages.expireCookieSkip);
                        await resolveCrawlerWarning(warningMessages.disabledSourceSkip);
                        await updateCrawlerStatus_sourceStart(sourceName, crawlMode);
                        let lastPages = await findSource.starter();
                        await updateCrawlerStatus_sourceEnd(lastPages);
                        await checkAndHandleSourceChange();
                        if (crawlMode === 2) {
                            fullyCrawledSources.push(sourceName);
                            let now = new Date();
                            sourcesObj[sourceName].lastCrawlDate = now;
                            await updateSourcesObjDB({
                                [sourceName + '.lastCrawlDate']: now,
                            });
                        }
                    }
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
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name) && item.configs.isTorrent);
        let sourcesMethods = getSourcesMethods();

        if (!sourceName) {
            for (let i = 0; i < sourcesArray.length; i++) {
                const sourceCookies = sourcesObj[sourcesArray[i].name].cookies;
                const disabled = sourcesObj[sourcesArray[i].name].disabled;
                const warningMessages = getCrawlerWarningMessages(sourcesArray[i].name);
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    await saveCrawlerWarning(warningMessages.expireCookieSkip);
                    continue;
                }
                if (disabled) {
                    await saveCrawlerWarning(warningMessages.disabledSourceSkip);
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
                const warningMessages = getCrawlerWarningMessages(sourceName);
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    await saveCrawlerWarning(warningMessages.expireCookieSkip);
                } else if (disabled) {
                    await saveCrawlerWarning(warningMessages.disabledSourceSkip);
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
