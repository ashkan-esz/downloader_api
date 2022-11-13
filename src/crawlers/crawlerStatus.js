import {v4 as uuidv4} from 'uuid';
import {saveCrawlerLog} from "../data/db/serverAnalysisDbMethods.js";
import {getDatesBetween} from "./utils.js";

const crawlerStatus = {
    crawlId: '',
    isCrawling: false,
    isCrawlCycle: false,
    crawledSources: [],
    crawlingSource: null,
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

const crawlerStatus_titles = {
    pageNumber: 0,
    pageLinks: [],
}


export function getCrawlerStatusObj() {
    return ({...crawlerStatus, ...crawlerStatus_titles});
}

//-----------------------------------------
//-----------------------------------------

export function updatePageNumberCrawlerStatus(pageNumber) {
    crawlerStatus_titles.pageNumber = pageNumber;
}

export function addPageLinkToCrawlerStatus(pageLink) {
    crawlerStatus_titles.pageLinks.push(pageLink);
}

export function removePageLinkToCrawlerStatus(pageLink) {
    crawlerStatus_titles.pageLinks = crawlerStatus_titles.pageLinks.filter(item => item !== pageLink);
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


export async function updateCrawlerStatus_crawlerStart(startTime, isCrawlCycle, crawlMode) {
    crawlerStatus.crawlId = uuidv4();
    crawlerStatus.isCrawling = true;
    crawlerStatus.isCrawlCycle = isCrawlCycle;
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlingSource = null;
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
    crawlerStatus_titles.pageNumber = 0;
    crawlerStatus_titles.pageLinks = [];
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
