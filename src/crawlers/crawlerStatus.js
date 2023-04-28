import config from "../config/index.js";
import {v4 as uuidv4} from 'uuid';
import {saveCrawlerLog} from "../data/db/serverAnalysisDbMethods.js";
import {getDatesBetween, getDecodedLink} from "./utils.js";
import {crawlerMemoryLimit} from "./crawlerController.js";
import {trailerUploadConcurrency} from "../data/cloudStorage.js";
import {imageOperationsConcurrency} from "../utils/sharpImageMethods.js";

const crawlerStatus = {
    disable: config.crawler.disable,
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
    pauseData: {
        isPaused: false,
        pauseReason: '',
        isManualPause: false,
        manualPauseDuration: 0,
        pausedFrom: 0,
    },
    crawlerState: 'ok',
    forceResume: false,
    forceStop: false,
    constValues: {
        concurrencyNumber: 0,
        pauseDuration: config.crawler.pauseDurationLimit,
    },
    limits: {
        memory: {value: crawlerMemoryLimit.toFixed(0), limit: config.crawler.totalMemory},
        cpu: {value: 0, limit: config.crawler.cpuLimit.toFixed(0)},
        imageOperations: {value:0, limit: imageOperationsConcurrency},
        trailerUpload: {value:0, limit: trailerUploadConcurrency},
    }
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

export const linkStateMessages = Object.freeze({
    addFileSize: 'adding file size to downloadLinks info',
    checkingDB: 'checking db',
    newTitle: Object.freeze({
        newTitle: 'new title',
        inserting: 'new title: inserting',
        connectingRelatedTitles: 'new title: connecting related titles',
        addingCast: 'new title: adding cast and characters',
        uploadingPosterToS3: 'new title: uploading poster to s3',
        generatingThumbnail: 'new title: generating thumbnail',
        callingOmdbTvMaze: 'new title: calling omdb/tvmaze apis',
        handlingSeasonFields: 'new title: handling seasons fields',
        callingJikan: 'new title: calling jikan api',
        uploadingYoutubeTrailerToS3: 'new title: uploading youtube trailer to s3',
        addingRelatedTitles: 'new title: adding related titles',
    }),
    updateTitle: Object.freeze({
        updateTitle: 'update title',
        convertingToRelease: 'update title: converting unreleased to released',
        addingCast: 'update title: adding cast and characters',
        removingS3Trailer: 'update title: removing s3 trailer',
        updating: 'update title: updating',
        checkingPoster: 'update title: checking poster',
        uploadingPosterToS3: 'update title: uploading poster to s3',
        callingOmdbTvMaze: 'update title: calling omdb/tvmaze apis',
        handlingSeasonFields: 'update title: handling seasons fields',
        callingJikan: 'update title: calling jikan api',
        uploadingYoutubeTrailerToS3: 'update title: uploading youtube trailer to s3',
        addingRelatedTitles: 'update title: adding related titles',
    }),
});

export function updatePageNumberCrawlerStatus(pageNumber, pageCount, concurrencyNumber) {
    crawlerStatus.pageNumber = pageNumber;
    crawlerStatus.pageCount = pageCount;
    crawlerStatus.constValues.concurrencyNumber = concurrencyNumber;
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

export function updateImageOperationsLimit(number) {
    crawlerStatus.limits.imageOperations.value = number;
}

export function updateTrailerUploadLimit(number) {
    crawlerStatus.limits.trailerUpload.value = number;
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
    if (crawlerStatus.pauseData.isPaused) {
        return "crawler is already paused";
    }
    if (isManualPause) {
        crawlerStatus.crawlerState = 'waiting for manual pause applying';
        crawlerStatus.pauseData.isManualPause = true;
        crawlerStatus.pauseData.manualPauseDuration = manualPauseDuration;
    } else {
        if (crawlerStatus.pauseData.isManualPause) {
            crawlerStatus.crawlerState = 'manual paused';
        } else {
            crawlerStatus.crawlerState = 'paused';
        }
        crawlerStatus.pauseData.isPaused = true;
        crawlerStatus.pauseData.pauseReason = reason;
        crawlerStatus.pauseData.pausedFrom = Date.now();
    }
    return "ok";
}

export function removeCrawlerPause(handleManual = false, force = false) {
    if (!crawlerStatus.pauseData.isPaused) {
        return "crawler is not paused";
    }
    if (handleManual && !force && !crawlerStatus.pauseData.isManualPause) {
        return "crawler is not manually paused, use force=true";
    }
    if (force) {
        crawlerStatus.forceResume = true;
    }
    const pauseDuration = (Date.now() - crawlerStatus.pauseData.pausedFrom) / 1000;
    crawlerStatus.pauseData.isPaused = false;
    crawlerStatus.pauseData.pauseReason = '';
    crawlerStatus.totalPausedDuration += pauseDuration;
    crawlerStatus.pauseData.pausedFrom = 0;
    if (crawlerStatus.crawlingSource) {
        crawlerStatus.crawlingSource.pausedDuration += pauseDuration;
    }
    if (!crawlerStatus.forceStop) {
        crawlerStatus.crawlerState = 'ok';
    }
    crawlerStatus.pauseData.isManualPause = false;
    crawlerStatus.pauseData.manualPauseDuration = 0;
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
    crawlerStatus.pauseData.isPaused = false;
    crawlerStatus.pauseData.pauseReason = '';
    crawlerStatus.pauseData.isManualPause = false;
    crawlerStatus.pauseData.pausedFrom = 0;
    crawlerStatus.pauseData.manualPauseDuration = 0;
    crawlerStatus.crawlerState = 'ok';
    crawlerStatus.forceResume = false;
    crawlerStatus.forceStop = false;

    await saveCrawlerLog(crawlerLog);
}

export async function updateCrawlerStatus_crawlerEnd(endTime, crawlDuration) {
    crawlerStatus.endTime = endTime;
    crawlerStatus.duration = crawlDuration;
    crawlerStatus.isCrawling = false;
    crawlerStatus.isCrawlCycle = false;
    crawlerStatus.isManualStart = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.crawlerState = 'ok';
    await saveCrawlerLog(crawlerLog);
}

export async function updateCrawlerStatus_crawlerCrashed(errorMessage) {
    crawlerStatus.endTime = new Date();
    crawlerStatus.duration = getDatesBetween(new Date(), crawlerStatus.startTime).minutes;
    crawlerStatus.isCrawling = false;
    crawlerStatus.isCrawlCycle = false;
    crawlerStatus.isManualStart = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.error = true;
    crawlerStatus.errorMessage = errorMessage;
    crawlerStatus.crawlerState = 'error';

    await saveCrawlerLog(crawlerLog);
}
