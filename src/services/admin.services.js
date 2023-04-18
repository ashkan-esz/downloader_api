import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {crawler} from "../crawlers/crawler.js";
import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as adminCrawlerDbMethods from "../data/db/admin/adminCrawlerDbMethods.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import {getCrawlerStatusObj} from "../crawlers/crawlerStatus.js";
import {getServerResourcesStatus} from "../utils/serverStatus.js";
import {pauseCrawler_manual, resumeCrawler_manual, stopCrawler_manual} from "../crawlers/crawlerController.js";


export async function startCrawler(sourceName, mode, handleDomainChange, handleDomainChangeOnly, handleCastUpdate) {
    let result = await crawler(sourceName, {
        crawlMode: mode,
        isManualStart: true,
        handleDomainChange,
        handleCastUpdate,
        handleDomainChangeOnly,
    });
    if (result.isError) {
        return generateServiceResult({data: result}, 500, result.message);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function manualPauseCrawler(duration) {
    let result = pauseCrawler_manual(duration);
    if (result === "ok") {
        return generateServiceResult({data: result}, 200, '');
    }
    return generateServiceResult({data: ""}, 409, result);
}

export async function resumeCrawler(force) {
    let result = resumeCrawler_manual(force);
    if (result === "ok") {
        return generateServiceResult({data: result}, 200, '');
    }
    return generateServiceResult({data: ""}, 409, result);
}

export async function manualStopCrawler(duration) {
    let result = stopCrawler_manual(duration);
    if (result === "ok") {
        return generateServiceResult({data: result}, 200, '');
    }
    return generateServiceResult({data: ""}, 409, result);
}

export async function getCrawlerStatus() {
    let result = getCrawlerStatusObj();
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getCrawlingHistory(startTime, endTime, skip, limit) {
    let result = await serverAnalysisDbMethods.getCrawlerLogsInTimes(startTime, endTime, skip, limit);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getCrawlerWarningsHistory(startTime, endTime, skip, limit) {
    let result = await serverAnalysisDbMethods.getCrawlerWarningsInTimes(startTime, endTime, skip, limit);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getCrawlerSources() {
    let result = await crawlerMethodsDB.getSourcesObjDB();
    if (!result || result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }

    let keys = Object.keys(result);
    result.sources = [];
    for (let i = 0; i < keys.length; i++) {
        if (['_id', 'title', 'pageCounter_time'].includes(keys[i])) {
            continue;
        }
        result.sources.push({
            sourceName: keys[i],
            ...result[keys[i]],
        })
        delete result[keys[i]];
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function getCrawlerWarnings(startTime, endTime, skip, limit) {
    let result = await serverAnalysisDbMethods.getCrawlerCurrentWarnings(startTime, endTime, skip, limit);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function editSource(sourceName, movie_url, page_count, serial_url, serial_page_count, crawlCycle, disabled, cookies) {
    let result = await adminCrawlerDbMethods.updateSourceData(sourceName, {
        movie_url,
        page_count,
        serial_url,
        serial_page_count,
        crawlCycle,
        disabled,
        cookies
    });
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === "notfound") {
        return generateServiceResult({data: null}, 404, errorMessage.crawlerSourceNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function addSource(sourceName, movie_url, page_count, serial_url, serial_page_count, crawlCycle, disabled, cookies) {
    let result = await adminCrawlerDbMethods.addSourceDB(sourceName, {
        movie_url,
        page_count,
        serial_url,
        serial_page_count,
        crawlCycle,
        disabled,
        cookies
    });
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === "notfound") {
        return generateServiceResult({data: null}, 404, errorMessage.crawlerSourceNotFound);
    } else if (result === "already exist") {
        return generateServiceResult({data: null}, 409, errorMessage.crawlerSourceAlreadyExist);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getActiveUsersAnalysis(startTime, endTime, skip, limit) {
    let result = await serverAnalysisDbMethods.getUserCountsInTimes(startTime, endTime, skip, limit);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getServerStatus() {
    let result = await getServerResourcesStatus();
    if (result === null) {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}