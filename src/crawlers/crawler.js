import {getDatesBetween, getDayOfYear} from "./utils.js";
import {getSourcesObjDB, updateSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getSourcesArray} from "./sourcesArray.js";
import {domainChangeHandler} from "./domainChangeHandler.js";
import * as Sentry from "@sentry/node";
import {saveError} from "../error/saveError.js";
import {flushCachedData} from "../api/middlewares/moviesCache.js";
import {
    checkIsCrawling,
    updateCrawlerStatus_crawlerCrashed,
    updateCrawlerStatus_crawlerEnd,
    updateCrawlerStatus_crawlerStart,
    updateCrawlerStatus_sourceEnd,
    updateCrawlerStatus_sourceStart,
} from "./crawlerStatus.js";
import {resolveCrawlerWarning, saveCrawlerWarning} from "../data/db/serverAnalysisDbMethods.js";


export let _handleCastUpdate = true;


export async function crawlerCycle() {
    try {
        while (checkIsCrawling()) {
            //avoid parallel crawling
            await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        }
        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            Sentry.captureMessage('crawler cycle cancelled : sourcesObj is null');
            return 'crawler cycle cancelled : sourcesObj is null';
        }
        const sourcesNames = Object.keys(sourcesObj);
        let sourcesArray = getSourcesArray(sourcesObj, 2);
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

        flushCachedData();
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
    handleCastUpdate = true
} = {}) {

    try {
        _handleCastUpdate = handleCastUpdate;
        if (checkIsCrawling()) {
            return {
                isError: true,
                message: 'another crawling is running',
            };
        }
        flushCachedData();
        const startTime = new Date();
        await updateCrawlerStatus_crawlerStart(startTime, isCrawlCycle, isManualStart, crawlMode);

        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            let errorMessage = 'crawling cancelled : sourcesObj is null';
            await updateCrawlerStatus_crawlerCrashed(errorMessage);
            Sentry.captureMessage(errorMessage);
            return {
                isError: true,
                message: errorMessage,
            };
        }

        const sourcesNames = Object.keys(sourcesObj);
        let sourcesArray = getSourcesArray(sourcesObj, crawlMode);
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name));
        let fullyCrawledSources = [];

        if (!handleDomainChangeOnly) {
            if (!sourceName) {
                for (let i = 0; i < sourcesArray.length; i++) {
                    let sourceCookies = sourcesObj[sourcesArray[i].name].cookies;
                    let disabled = sourcesObj[sourcesArray[i].name].disabled;
                    const expireCookieMessage = `source (${sourcesArray[i].name}) cookies expired (crawler skipped).`;
                    const disabledSourceMessage = `source (${sourcesArray[i].name}) is disabled (crawler skipped).`;
                    if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                        Sentry.captureMessage('Warning: ' + expireCookieMessage);
                        await saveCrawlerWarning(expireCookieMessage);
                        continue;
                    }
                    if (disabled) {
                        Sentry.captureMessage('Warning: ' + disabledSourceMessage);
                        await saveCrawlerWarning(disabledSourceMessage);
                        continue;
                    }
                    await resolveCrawlerWarning(expireCookieMessage);
                    await resolveCrawlerWarning(disabledSourceMessage);
                    await updateCrawlerStatus_sourceStart(sourcesArray[i].name, crawlMode);
                    let lastPages = await sourcesArray[i].starter();
                    await updateCrawlerStatus_sourceEnd(lastPages);
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
                    const expireCookieMessage = `source (${sourceName}) cookies expired (crawler skipped).`;
                    const disabledSourceMessage = `source (${sourceName}) is disabled (crawler skipped).`;
                    if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                        Sentry.captureMessage('Warning: ' + expireCookieMessage);
                        await saveCrawlerWarning(expireCookieMessage);
                    } else if (disabled) {
                        Sentry.captureMessage('Warning: ' + disabledSourceMessage);
                        await saveCrawlerWarning(disabledSourceMessage);
                    } else {
                        await resolveCrawlerWarning(expireCookieMessage);
                        await resolveCrawlerWarning(disabledSourceMessage);
                        await updateCrawlerStatus_sourceStart(sourceName, crawlMode);
                        let lastPages = await findSource.starter();
                        await updateCrawlerStatus_sourceEnd(lastPages);
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

        if (handleDomainChangeOnly || handleDomainChange) {
            await domainChangeHandler(sourcesObj, fullyCrawledSources);
        }

        let endTime = new Date();
        let crawlDuration = getDatesBetween(endTime, startTime).minutes;
        await updateCrawlerStatus_crawlerEnd(endTime, crawlDuration);
        let message = `crawling done in : ${crawlDuration}min`;
        Sentry.captureMessage(message);
        flushCachedData();
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
