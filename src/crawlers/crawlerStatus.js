import {v4 as uuidv4} from 'uuid';
import {saveCrawlerLog} from "../data/db/serverAnalysisDbMethods.js";
import {getDatesBetween, getDecodedLink} from "./utils.js";

const crawlerStatus = {
    crawlId: '',
    isCrawling: false,
    isCrawlCycle: false,
    crawledSources: [],
    crawlingSource: null,
    totalPausedDuration: 0,
    lastCrawl: {
        startTime: 0,
        endTime: 0,
        time: 0,
        error: false,
        errorMessage: '',
        crawledSources: [],
        crawlId: '',
        isCrawlCycle: false,
        crawlMode: 0,
    },
};

const crawlerStatus_temp = {
    pageNumber: 0,
    pageCount: 0,
    pageLinks: [],
    isPaused: false,
    pausedFrom: 0,
}


export function getCrawlerStatusObj() {
    return ({...crawlerStatus, ...crawlerStatus_temp});
}

//-----------------------------------------
//-----------------------------------------

export function updatePageNumberCrawlerStatus(pageNumber, pageCount) {
    crawlerStatus_temp.pageNumber = pageNumber;
    crawlerStatus_temp.pageCount = pageCount;
}

export function addPageLinkToCrawlerStatus(pageLink, pageNumber) {
    pageLink = getDecodedLink(pageLink);
    if (!crawlerStatus_temp.pageLinks.find(item => item.url === pageLink)) {
        crawlerStatus_temp.pageLinks.push({
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
    let data = crawlerStatus_temp.pageLinks.find(item => item.url === pageLink);
    if (data) {
        data.state = state;
        data.stateTime = new Date();
    }
}


export function removePageLinkToCrawlerStatus(pageLink) {
    pageLink = getDecodedLink(pageLink);
    crawlerStatus_temp.pageLinks = crawlerStatus_temp.pageLinks.filter(item => item.url !== pageLink);
}

//-----------------------------------------
//-----------------------------------------

export function checkIsCrawling() {
    return crawlerStatus.isCrawling;
}

export async function updateCrawlerStatus_sourceStart(sourceName, crawlMode) {
    crawlerStatus.crawlingSource = {
        name: sourceName,
        startTime: new Date,
        crawlMode: crawlMode,
        pausedDuration: 0,
    }
    await saveCrawlerLog({
        ...crawlerStatus.lastCrawl,
        crawlingSource: crawlerStatus.crawlingSource,
        crawledSources: crawlerStatus.crawledSources,
    });
}

export async function updateCrawlerStatus_sourceEnd(lastPages) {
    crawlerStatus.crawledSources.push({
        ...crawlerStatus.crawlingSource,
        endTime: new Date(),
        time: getDatesBetween(new Date(), crawlerStatus.crawlingSource.startTime).minutes,
        lastPages: lastPages,
    });
    crawlerStatus.crawlingSource = null;
    await saveCrawlerLog({
        ...crawlerStatus.lastCrawl,
        crawlingSource: crawlerStatus.crawlingSource,
        crawledSources: crawlerStatus.crawledSources,
    });
}


//-----------------------------------------
//-----------------------------------------

export function saveCrawlerPause() {
    if (!crawlerStatus_temp.isPaused) {
        crawlerStatus_temp.isPaused = true;
        crawlerStatus_temp.pausedFrom = Date.now();
    }
}

export function removeCrawlerPause() {
    if (crawlerStatus_temp.isPaused) {
        const pauseDuration = (Date.now() - crawlerStatus_temp.pausedFrom) / 1000;
        crawlerStatus_temp.isPaused = false;
        crawlerStatus.totalPausedDuration += pauseDuration;
        crawlerStatus_temp.pausedFrom = 0;
        if (crawlerStatus.crawlingSource) {
            crawlerStatus.crawlingSource.pausedDuration += pauseDuration;
        }
    }
}

//-----------------------------------------
//-----------------------------------------

export async function updateCrawlerStatus_crawlerStart(startTime, isCrawlCycle, crawlMode) {
    crawlerStatus.crawlId = uuidv4();
    crawlerStatus.isCrawling = true;
    crawlerStatus.isCrawlCycle = isCrawlCycle;
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlingSource = null;
    crawlerStatus.totalPausedDuration = 0;
    crawlerStatus.lastCrawl = {
        startTime: startTime,
        endTime: 0,
        time: 0,
        error: false,
        errorMessage: '',
        crawledSources: [],
        crawlId: crawlerStatus.crawlId,
        isCrawlCycle: isCrawlCycle,
        crawlMode: crawlMode,
    };
    crawlerStatus_temp.pageNumber = 0;
    crawlerStatus_temp.pageLinks = [];
    crawlerStatus_temp.isPaused = false;
    crawlerStatus_temp.pausedFrom = 0;
    await saveCrawlerLog(crawlerStatus.lastCrawl);
}

export async function updateCrawlerStatus_crawlerEnd(startTime, endTime, crawlDuration, crawlMode) {
    crawlerStatus.isCrawling = false;
    crawlerStatus.lastCrawl = {
        startTime: startTime,
        endTime: endTime,
        time: crawlDuration,
        error: false,
        errorMessage: '',
        crawledSources: [...crawlerStatus.crawledSources],
        crawlId: crawlerStatus.crawlId,
        isCrawlCycle: crawlerStatus.isCrawlCycle,
        crawlMode: crawlMode,
    }
    await saveCrawlerLog(crawlerStatus.lastCrawl);
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlId = '';
}

export async function updateCrawlerStatus_crawlerCrashed(startTime, errorMessage, crawlMode) {
    crawlerStatus.isCrawling = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.lastCrawl = {
        startTime: startTime,
        endTime: new Date(),
        time: getDatesBetween(new Date(), startTime).minutes,
        error: true,
        errorMessage: errorMessage,
        crawledSources: [...crawlerStatus.crawledSources],
        crawlId: crawlerStatus.crawlId,
        isCrawlCycle: crawlerStatus.isCrawlCycle,
        crawlMode: crawlMode,
    }
    await saveCrawlerLog(crawlerStatus.lastCrawl);
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlId = '';
}
