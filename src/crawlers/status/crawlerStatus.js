import config from "../../config/index.js";
import {getServerConfigsDb} from "../../config/configsDb.js";
import {v4 as uuidv4} from 'uuid';
import {saveCrawlerLog} from "../../data/db/serverAnalysisDbMethods.js";
import {getDatesBetween, getDecodedLink} from "../utils/utils.js";
import {crawlerMemoryLimit} from "./crawlerController.js";
import {getCpuAverageLoad, getMemoryStatus} from "../../utils/serverStatus.js";
import {blackListSources, remoteBrowsers} from "../remoteHeadlessBrowser.js";
import {axiosBlackListSources} from "../searchTools.js";

const crawlerStatus = {
    disabledData: {
        isEnvDisabled: config.crawler.disable,
        isDbDisabled: false,
        isDbDisabled_temporary: false,
        dbDisableDuration: 0,
        dbDisableStart: 0,
    },
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
    sourcePage: {
        url: '',
        state: '',
        stateTime: 0,
    },
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
        memory: {value: 0, limit: crawlerMemoryLimit.toFixed(0), total: config.crawler.totalMemory},
        cpu: {value: 0, limit: config.crawler.cpuLimit.toFixed(0)},
        imageOperations: {value: 0, limit: 0},
        trailerUpload: {value: 0, limit: 0},
    },
    domainChangeHandler: {
        isActive: false,
        startTime: 0,
        endTime: 0,
        duration: 0,
        state: '',
        stateTime: 0,
        error: false,
        errorMessage: '',
        sources: [], //sourceName, url, checked, changed, crawled, errorMessage
    },
    remoteBrowsers: [],
    axiosBlackList: {
        default: [], //sourceName, errorCounter, lastErrorTime, isBlocked, totalErrorCounter
        remoteBrowsers: [], //sourceName, lastErrorTime, isBlocked, linksCount
    },
    extraConfigs: {},
};

const crawlerLog = () => ({
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
    domainChangeHandler: {
        startTime: crawlerStatus.domainChangeHandler.startTime,
        endTime: crawlerStatus.domainChangeHandler.endTime,
        duration: crawlerStatus.domainChangeHandler.duration,
        state: crawlerStatus.domainChangeHandler.state,
        error: crawlerStatus.domainChangeHandler.error,
        errorMessage: crawlerStatus.domainChangeHandler.errorMessage,
    }
});

setInterval(async () => {
    crawlerStatus.limits.cpu.value = getCpuAverageLoad();
    getMemoryStatus(false).then(res => {
        crawlerStatus.limits.memory.value = res.used.toFixed(0);
    });
    let configsDb = getServerConfigsDb();
    if (configsDb) {
        crawlerStatus.disabledData.isDbDisabled = configsDb.disableCrawler;
        crawlerStatus.disabledData.isDbDisabled_temporary = configsDb.crawlerDisabled;
        crawlerStatus.disabledData.dbDisableDuration = configsDb.disableCrawlerForDuration;
        crawlerStatus.disabledData.dbDisableStart = configsDb.disableCrawlerStart;
    }
    await import("../remoteHeadlessBrowser.js");
    crawlerStatus.remoteBrowsers = remoteBrowsers.map(item => {
        let temp = {...item};
        delete temp.password;
        return temp;
    });
    await import('../searchTools.js'); //wait for axiosBlackListSources initialization
    crawlerStatus.axiosBlackList.default = axiosBlackListSources;
    crawlerStatus.axiosBlackList.remoteBrowsers = blackListSources;
}, 1000);

export function getCrawlerStatusObj() {
    return crawlerStatus;
}

//-----------------------------------------
//-----------------------------------------

export const linkStateMessages = Object.freeze({
    start: 'start',
    paused: 'paused',
    sourcePage: Object.freeze({
        start: 'start',
        fetchingStart: 'fetching start',
        fetchingStart_axios: 'fetching start (axios)',
        retryAxiosCookie: 'fetching, retry with axios and cookies',
        retryOnNotFound: 'fetching, retry with not found error',
        retryUnEscapedCharacters: 'fetching, retry on unEscaped characters url',
        fromCache: 'fetching page data from google cache',
        fetchingEnd: 'fetching end',
    }),
    gettingPageData: Object.freeze({
        gettingPageData: 'getting page data',
        gettingPageData_axios: 'getting page data (axios)',
        retryAxiosCookie: 'getting page data, retry with axios and cookies',
        retryOnNotFound: 'getting page data, retry with not found error',
        retryUnEscapedCharacters: 'getting page data, retry on unEscaped characters url',
        fromCache: 'getting page data from google cache',
    }),
    addFileSize: 'adding file size to downloadLinks info',
    checkingDB: 'checking db',
    newTitle: Object.freeze({
        newTitle: 'new title',
        inserting: 'new title: inserting',
        addingCast: 'new title: adding cast and characters',
        uploadingPosterToS3: 'new title: uploading poster to s3',
        uploadingJikanPosterToS3: 'new title: uploading jikan poster to s3',
        uploadingKitsuPosterToS3: 'new title: uploading kitsu poster to s3',
        uploadingAmvPosterToS3: 'new title: uploading amv poster to s3',
        uploadingKitsuWidePosterToS3: 'new title: uploading kitsu wide poster to s3',
        uploadingAmvWidePosterToS3: 'new title: uploading amv wide poster to s3',
        uploadingTvmazePosterToS3: 'new title: uploading tvmaze poster to s3',
        uploadingOmdbPosterToS3: 'new title: uploading omdb poster to s3',
        uploadingTvmazeWidePosterToS3: 'new title: uploading tvmaze wide poster to s3',
        generatingThumbnail: 'new title: generating thumbnail',
        callingOmdbTvMazeKitsuAmv: 'new title: calling omdb/tvmaze/kitsu/amv apis',
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
        uploadingJikanPosterToS3: 'update title: uploading jikan poster to s3',
        uploadingKitsuPosterToS3: 'update title: uploading kitsu poster to s3',
        uploadingAmvPosterToS3: 'update title: uploading amv poster to s3',
        uploadingKitsuWidePosterToS3: 'update title: uploading kitsu wide poster to s3',
        uploadingAmvWidePosterToS3: 'update title: uploading amv wide poster to s3',
        uploadingTvmazePosterToS3: 'update title: uploading tvmaze poster to s3',
        uploadingOmdbPosterToS3: 'update title: uploading omdb poster to s3',
        uploadingTvmazeWidePosterToS3: 'update title: uploading tvmaze wide poster to s3',
        callingOmdbTvMazeKitsuAmv: 'update title: calling omdb/tvmaze/kitsu/amv apis',
        handlingSeasonFields: 'update title: handling seasons fields',
        callingJikan: 'update title: calling jikan api',
        uploadingYoutubeTrailerToS3: 'update title: uploading youtube trailer to s3',
        addingRelatedTitles: 'update title: adding related titles',
        addingMoviePosterBlurHashQueue: 'update title: adding moviePoster to blurHashQueue',
        addingMoviePosterS3BlurHashQueue: 'update title: adding moviePosterS3 to blurHashQueue',
        addingMovieWidePosterS3BlurHashQueue: 'update title: adding movieWidePosterS3 to blurHashQueue',
    }),
    domainChangeHandler: Object.freeze({
        start: 'start',
        checkingUrls: 'checking sources urls',
        retryAxios: 'checking sources urls (retry with axios)',
        crawlingSources: 'crawling sources',
        end: 'end',
    }),
    notification: Object.freeze({
        start: "start handling movie notification",
        finishedListSpinOffSequel: "notification: finishedListSpinOffSequel",
        futureList: "notification: futureList",
        futureListSerialSeasonEnd: "notification: futureListSerialSeasonEnd",
        followingMovie: "notification: followingMovie",
        followMovieBetterQuality: "notification: followMovieBetterQuality",
        followMovieSubtitle: "notification: followMovieSubtitle",
        futureListSubtitle: "notification: futureListSubtitle",
    }),
});

export function updatePageNumberCrawlerStatus(pageNumber, pageCount, concurrencyNumber, extraConfigs) {
    crawlerStatus.pageNumber = pageNumber;
    crawlerStatus.pageCount = pageCount;
    crawlerStatus.constValues.concurrencyNumber = concurrencyNumber;
    crawlerStatus.extraConfigs = extraConfigs;
}

export function addPageLinkToCrawlerStatus(pageLink, pageNumber) {
    pageLink = getDecodedLink(pageLink);
    if (!crawlerStatus.pageLinks.find(item => item.url === pageLink)) {
        crawlerStatus.pageLinks.push({
            url: pageLink,
            pageNumber: pageNumber,
            time: new Date(),
            state: linkStateMessages.start,
            stateTime: new Date()
        });
    }
}

export function changePageLinkStateFromCrawlerStatus(pageLink, state, appendMode = false) {
    pageLink = getDecodedLink(pageLink);
    let data = crawlerStatus.pageLinks.find(item => item.url === pageLink);
    if (data) {
        if (appendMode) {
            data.state = data.state.split(" (")[0] + state;
        } else {
            data.state = state;
            data.stateTime = new Date();
        }
    }
}

export function partialChangePageLinkStateFromCrawlerStatus(pageLink, findValue, changeValue) {
    pageLink = getDecodedLink(pageLink);
    let data = crawlerStatus.pageLinks.find(item => item.url === pageLink);
    if (data) {
        data.state = data.state.replace(findValue, changeValue);
    }
}

export function removePageLinkToCrawlerStatus(pageLink) {
    pageLink = getDecodedLink(pageLink);
    crawlerStatus.pageLinks = crawlerStatus.pageLinks.filter(item => item.url !== pageLink);
}

//-----------------------------------------
//-----------------------------------------

export function changeSourcePageFromCrawlerStatus(pageLink, state) {
    pageLink = getDecodedLink(pageLink);
    crawlerStatus.sourcePage.url = pageLink;
    if (pageLink) {
        crawlerStatus.sourcePage.state = state;
        crawlerStatus.sourcePage.stateTime = new Date();
    } else {
        crawlerStatus.sourcePage.state = '';
        crawlerStatus.sourcePage.stateTime = 0;
    }
}

//-----------------------------------------
//-----------------------------------------

export function updateImageOperationsLimit(number, limit) {
    crawlerStatus.limits.imageOperations.value = number;
    crawlerStatus.limits.imageOperations.limit = limit;
}

export function updateTrailerUploadLimit(number, limit) {
    crawlerStatus.limits.trailerUpload.value = number;
    crawlerStatus.limits.trailerUpload.limit = limit;
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
        crawlerStatus.pauseData.pauseReason = reason;
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
    const pauseDuration = (Date.now() - crawlerStatus.pauseData.pausedFrom) / (60 * 1000);
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
    resetDomainChangeHandlerStatusData();
    await saveCrawlerLog(crawlerLog());
}

export async function updateCrawlerStatus_crawlerEnd(endTime, crawlDuration) {
    crawlerStatus.endTime = endTime;
    crawlerStatus.duration = crawlDuration;
    crawlerStatus.isCrawling = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.crawlerState = 'ok';
    await saveCrawlerLog(crawlerLog());
    crawlerStatus.isCrawlCycle = false;
    crawlerStatus.isManualStart = false;
    crawlerStatus.extraConfigs = {};
}

export async function updateCrawlerStatus_crawlerCrashed(errorMessage) {
    crawlerStatus.endTime = new Date();
    crawlerStatus.duration = getDatesBetween(new Date(), crawlerStatus.startTime).minutes;
    crawlerStatus.isCrawling = false;
    crawlerStatus.crawlingSource = null;
    crawlerStatus.error = true;
    crawlerStatus.errorMessage = errorMessage;
    crawlerStatus.crawlerState = 'error';
    await saveCrawlerLog(crawlerLog());
    crawlerStatus.isCrawlCycle = false;
    crawlerStatus.isManualStart = false;
    crawlerStatus.extraConfigs = {};
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
    await saveCrawlerLog(crawlerLog());
}

export async function updateCrawlerStatus_sourceEnd(lastPages, dontSave = false) {
    crawlerStatus.crawledSources.push({
        ...crawlerStatus.crawlingSource,
        endTime: new Date(),
        duration: getDatesBetween(new Date(), crawlerStatus.crawlingSource.startTime).minutes,
        lastPages: lastPages,
    });

    if (!dontSave) {
        await saveCrawlerLog(crawlerLog());
    }
    crawlerStatus.crawlingSource = null;
}

//-----------------------------------------
//-----------------------------------------

export async function updateCrawlerStatus_domainChangeHandlerStart() {
    crawlerStatus.domainChangeHandler.isActive = true;
    crawlerStatus.domainChangeHandler.startTime = new Date();
    crawlerStatus.domainChangeHandler.state = linkStateMessages.domainChangeHandler.start;
    crawlerStatus.domainChangeHandler.stateTime = new Date();

    await saveCrawlerLog(crawlerLog());
}

export async function updateCrawlerStatus_domainChangeHandlerEnd() {
    const duration = getDatesBetween(new Date(), crawlerStatus.domainChangeHandler.startTime).minutes;
    crawlerStatus.domainChangeHandler.isActive = false;
    crawlerStatus.domainChangeHandler.endTime = new Date();
    crawlerStatus.domainChangeHandler.duration = duration;
    crawlerStatus.domainChangeHandler.state = linkStateMessages.domainChangeHandler.end;
    crawlerStatus.domainChangeHandler.stateTime = new Date();

    await saveCrawlerLog(crawlerLog());
    resetDomainChangeHandlerStatusData();
    return duration;
}

export async function updateCrawlerStatus_domainChangeHandlerCrashed(errorMessage) {
    const duration = getDatesBetween(new Date(), crawlerStatus.domainChangeHandler.startTime).minutes;
    crawlerStatus.domainChangeHandler.isActive = false;
    crawlerStatus.domainChangeHandler.endTime = new Date();
    crawlerStatus.domainChangeHandler.duration = duration;
    crawlerStatus.domainChangeHandler.error = true;
    crawlerStatus.domainChangeHandler.errorMessage = errorMessage;

    await saveCrawlerLog(crawlerLog());
    resetDomainChangeHandlerStatusData();
    return duration;
}

function resetDomainChangeHandlerStatusData() {
    crawlerStatus.domainChangeHandler.isActive = false;
    crawlerStatus.domainChangeHandler.startTime = 0;
    crawlerStatus.domainChangeHandler.endTime = 0;
    crawlerStatus.domainChangeHandler.duration = 0;
    crawlerStatus.domainChangeHandler.state = '';
    crawlerStatus.domainChangeHandler.stateTime = 0;
    crawlerStatus.domainChangeHandler.error = false;
    crawlerStatus.domainChangeHandler.errorMessage = '';
    crawlerStatus.domainChangeHandler.sources = [];
}

export function changeDomainChangeHandlerState(sources, state) {
    crawlerStatus.domainChangeHandler.sources = sources;
    crawlerStatus.domainChangeHandler.state = state;
    crawlerStatus.domainChangeHandler.stateTime = new Date();
}
