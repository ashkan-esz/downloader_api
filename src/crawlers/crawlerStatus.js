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
    },
};

export function getCrawlerStatus() {
    return ({...crawlerStatus});
}

//-----------------------------------------
//-----------------------------------------

export function checkIsCrawling() {
    return crawlerStatus.isCrawling;
}

//todo : add source page number and handling titles to crawlerStatus

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

export async function updateCrawlerStatus_sourceEnd() {
    crawlerStatus.crawledSources.push({
        ...crawlerStatus.crawlingSource,
        endTime: new Date(),
        time: getDatesBetween(new Date(), crawlerStatus.crawlingSource.startTime).minutes,
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


export async function updateCrawlerStatus_crawlerStart(startTime, isCrawlCycle) {
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
    };
    await saveCrawlerLog(crawlerStatus.lastCrawl);
}

export async function updateCrawlerStatus_crawlerEnd(startTime, endTime, crawlDuration) {
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
    }
    await saveCrawlerLog(crawlerStatus.lastCrawl);
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlId = '';
}

export async function updateCrawlerStatus_crawlerCrashed(startTime, errorMessage) {
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
    }
    await saveCrawlerLog(crawlerStatus.lastCrawl);
    crawlerStatus.crawledSources = [];
    crawlerStatus.crawlId = '';
}
