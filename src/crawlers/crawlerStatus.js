import {v4 as uuidv4} from 'uuid';
import {saveCrawlerLog} from "../data/db/serverAnalysisDbMethods.js";
import {getDatesBetween, getDecodedLink} from "./utils.js";

const crawlerStatus = {
    crawlId: '',
    isCrawling: false,
    isCrawlCycle: false,
    isManualStart: false,
    crawledSources: [],
    crawlingSource: null,
    totalPausedDuration: 0,
    startTime: 0,
    endTime: 0,
    duration: 0,
    error: false,
    errorMessage: '',
    crawlMode: 0,
    pageNumber: 0,
    pageCount: 0,
    pageLinks: [],
    isPaused: false,
    pauseReason: '',
    isManualPause: false,
    manualPauseDuration: 0,
    pausedFrom: 0,
    crawlerState: 'ok',
    forceResume: false,
    forceStop: false,
};

const crawlerLog = {
    crawlId: crawlerStatus.crawlId,
    startTime: crawlerStatus.startTime,
    endTime: crawlerStatus.endTime,
    duration: crawlerStatus.duration,
    crawlMode: crawlerStatus.crawlMode,
    isCrawlCycle: crawlerStatus.isCrawlCycle,
    isManualStart: crawlerStatus.isManualStart,
    crawledSources: crawlerStatus.crawledSources,
    totalPausedDuration: crawlerStatus.totalPausedDuration,
    error: crawlerStatus.error,
    errorMessage: crawlerStatus.errorMessage,
    forceStop: crawlerStatus.forceStop,
}

export function getCrawlerStatusObj() {
    return crawlerStatus;
}

//-----------------------------------------
//-----------------------------------------

export function updatePageNumberCrawlerStatus(pageNumber, pageCount) {
    crawlerStatus.pageNumber = pageNumber;
    crawlerStatus.pageCount = pageCount;
}

export function addPageLinkToCrawlerStatus(pageLink, pageNumber) {
    pageLink = getDecodedLink(pageLink);
    if (!crawlerStatus.pageLinks.find(item => item.url === pageLink)) {
        crawlerStatus.pageLinks.push({
            url: pageLink,
            pageNumber: pageNumber,
            time: new Date(),
            state: 'getting page data',
            stateTime: new Date()
        });
    }
}

export function changePageLinkStateFromCrawlerStatus(pageLink, state) {
    pageLink = getDecodedLink(pageLink);
    let data = crawlerStatus.pageLinks.find(item => item.url === pageLink);
    if (data) {
        data.state = state;
        data.stateTime = new Date();
    }
}

export function removePageLinkToCrawlerStatus(pageLink) {
    pageLink = getDecodedLink(pageLink);
    crawlerStatus.pageLinks = crawlerStatus.pageLinks.filter(item => item.url !== pageLink);
}

//-----------------------------------------
//-----------------------------------------

export function checkIsCrawling() {
    return crawlerStatus.isCrawling;
}

export async function updateCrawlerStatus_sourceStart(sourceName, crawlMode) {
    crawlerStatus.crawlingSource = {
        name: sourceName,
        startTime: new Date(),
        crawlMode: crawlMode,
        pausedDuration: 0,
    }

    await saveCrawlerLog(crawlerLog);
}

export async function updateCrawlerStatus_sourceEnd(lastPages) {
    crawlerStatus.crawledSources.push({
        ...crawlerStatus.crawlingSource,
        endTime: new Date(),
        duration: getDatesBetween(new Date(), crawlerStatus.crawlingSource.startTime).minutes,
        lastPages: lastPages,
    });

    crawlerStatus.crawlingSource = null;

    await saveCrawlerLog(crawlerLog);
}


//-----------------------------------------
//-----------------------------------------

export function forceStopCrawler() {
    crawlerStatus.crawlerState = 'waiting for manual stop applying';
    crawlerStatus.forceStop = true;
}

export function checkForceStopCrawler() {
    return crawlerStatus.forceStop;
}

//-----------------------------------------
//-----------------------------------------

export function saveCrawlerPause(reason, isManualPause = false, manualPauseDuration = 0) {
    if (crawlerStatus.isPaused) {
        return "crawler is already paused";
    }
    if (isManualPause) {
        crawlerStatus.crawlerState = 'waiting for manual pause applying';
        crawlerStatus.isManualPause = true;
        crawlerStatus.manualPauseDuration = manualPauseDuration;
    } else {
        if (crawlerStatus.isManualPause) {
            crawlerStatus.crawlerState = 'manual paused';
        } else {
            crawlerStatus.crawlerState = 'paused';
        }
        crawlerStatus.isPaused = true;
        crawlerStatus.pauseReason = reason;
        crawlerStatus.pausedFrom = Date.now();
    }
    return "ok";
}

export function removeCrawlerPause(handleManual = false, force = false) {
    if (!crawlerStatus.isPaused) {
        return "crawler is not paused";
    }
    if (handleManual && !force && !crawlerStatus.isManualPause) {
        return "crawler is not manually paused, use force=true";
    }
    if (force) {
        crawlerStatus.forceResume = true;
    }
    const pauseDuration = (Date.now() - crawlerStatus.pausedFrom) / 1000;
    crawlerStatus.isPaused = false;
    crawlerStatus.pauseReason = '';
    crawlerStatus.totalPausedDuration += pauseDuration;
    crawlerStatus.pausedFrom = 0;
    if (crawlerStatus.crawlingSource) {
        crawlerStatus.crawlingSource.pausedDuration += pauseDuration;
    }
    if (!crawlerStatus.forceStop) {
        crawlerStatus.crawlerState = 'ok';
    }
    crawlerStatus.isManualPause = false;
    crawlerStatus.manualPauseDuration = 0;
    return "ok";
}

export function checkForceResume() {
    return crawlerStatus.forceResume;
}

export function disableForceResume() {
    crawlerStatus.forceResume = false;
}

//-----------------------------------------
//-----------------------------------------

export async function updateCrawlerStatus_crawlerStart(startTime, isCrawlCycle, isManualStart, crawlMode) {
    crawlerStatus.crawlId = uuidv4();
    crawlerStatus.startTime = startTime;
    crawlerStatus.endTime = 0;
    crawlerStatus.duration = 0;
    crawlerStatus.crawlMode = crawlMode;
    crawlerStatus.isCrawling = true;
    crawlerStatus.isCrawlCycle = isCrawlCycle;
    crawlerStatus.isManualStart = isManualStart;
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlingSource = null;
    crawlerStatus.totalPausedDuration = 0;
    crawlerStatus.error = false;
    crawlerStatus.errorMessage = '';
    crawlerStatus.pageNumber = 0;
    crawlerStatus.pageCount = 0;
    crawlerStatus.pageLinks = [];
    crawlerStatus.isPaused = false;
    crawlerStatus.pauseReason = '';
    crawlerStatus.isManualPause = false;
    crawlerStatus.pausedFrom = 0;
    crawlerStatus.manualPauseDuration = 0;
    crawlerStatus.crawlerState = 'ok';
    crawlerStatus.forceResume = false;
    crawlerStatus.forceStop = false;

    await saveCrawlerLog(crawlerLog);
}

export async function updateCrawlerStatus_crawlerEnd(endTime, crawlDuration) {
    crawlerStatus.endTime = endTime;
    crawlerStatus.duration = crawlDuration;
    crawlerStatus.isCrawling = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.crawlerState = 'ok';
    await saveCrawlerLog(crawlerLog);
}

export async function updateCrawlerStatus_crawlerCrashed(errorMessage) {
    crawlerStatus.endTime = new Date();
    crawlerStatus.duration = getDatesBetween(new Date(), crawlerStatus.startTime).minutes;
    crawlerStatus.isCrawling = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.error = true;
    crawlerStatus.errorMessage = errorMessage;
    crawlerStatus.crawlerState = 'error';

    await saveCrawlerLog(crawlerLog);
}
