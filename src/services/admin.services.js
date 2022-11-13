import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {crawler} from "../crawlers/crawler.js";
import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import {getCrawlerLogsInTimes, getUserCountsInTimes} from "../data/db/serverAnalysisDbMethods.js";
import {getCrawlerStatusObj} from "../crawlers/crawlerStatus.js";


export async function startCrawler(sourceName, mode, handleDomainChange, handleDomainChangeOnly, handleCastUpdate) {
    let result = await crawler(sourceName, mode, false, {
        handleDomainChange,
        handleCastUpdate,
        handleDomainChangeOnly,
    });
    if (result.isError) {
        return generateServiceResult({data: result}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getCrawlerStatus() {
    let result = getCrawlerStatusObj();
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getCrawlingHistory(startTime, endTime, skip, limit) {
    let result = await getCrawlerLogsInTimes(startTime, endTime, skip, limit);
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
    result.warnings = [];
    for (let i = 0; i < result.sources.length; i++) {
        let cookies = result.sources[i].cookies;
        if (cookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
            result.warnings.push(`Source (${result.sources[i].sourceName}) has expired cookie(s)`);
        }
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function getActiveUsersAnalysis(startTime, endTime, skip, limit) {
    let result = await getUserCountsInTimes(startTime, endTime, skip, limit);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}
