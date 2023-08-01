import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {crawler} from "../crawlers/crawler.js";
import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as adminCrawlerDbMethods from "../data/db/admin/adminCrawlerDbMethods.js";
import * as adminConfigDbMethods from "../data/db/admin/adminConfigDbMethods.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import {getCrawlerStatusObj} from "../crawlers/status/crawlerStatus.js";
import {getServerResourcesStatus} from "../utils/serverStatus.js";
import {pauseCrawler_manual, resumeCrawler_manual, stopCrawler_manual} from "../crawlers/status/crawlerController.js";
import {safeFieldsToEdit_array} from "../config/configsDb.js";
import * as RemoteHeadlessBrowserMethods from "../crawlers/remoteHeadlessBrowser.js";
import {createHash} from "node:crypto";
import {saveError} from "../error/saveError.js";
import {removeAppFileFromS3} from "../data/cloudStorage.js";
import {getArrayBufferResponse} from "../crawlers/utils/axiosUtils.js";
import {checkImdbApiKeys} from "../crawlers/3rdPartyApi/imdbApi.js";
import {checkOmdbApiKeys} from "../crawlers/3rdPartyApi/omdbApi.js";
import {getSourcesMethods, sourcesNames} from "../crawlers/sourcesArray.js";


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

export async function manualStopCrawler() {
    let result = stopCrawler_manual();
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

export async function crawlUrl(sourceName, url, title, type) {
    let sourceMethods = getSourcesMethods();
    if (!sourcesNames.includes(sourceName)) {
        return generateServiceResult({data: null}, 404, errorMessage.crawlerSourceNotFound);
    }
    let result = await sourceMethods[sourceName].handlePageCrawler(url, title, type);
    if (result === 'error') {
        return generateServiceResult({
            data: {
                isError: true,
                message: '',
            }
        }, 500, errorMessage.serverError);
    }
    return generateServiceResult({
        data: {
            isError: false,
            message: 'number of founded download links: ' + result,
        }
    }, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getServerAnalysisInTimes(fieldName, startTime, endTime, skip, limit) {
    let result = await serverAnalysisDbMethods.getServerAnalysisInTimesDB(fieldName, startTime, endTime, skip, limit);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getServerAnalysisCurrentMonth(fieldName, page) {
    let result = await serverAnalysisDbMethods.getServerAnalysisInCurrentMonthDB(fieldName, page);
    if (result === "error") {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function resolveServerAnalysis(fieldsName, id) {
    let result = await serverAnalysisDbMethods.resolveServerAnalysisDB(fieldsName, id);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === 'not found') {
        return generateServiceResult({data: null}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function resolveServerAnalysisByIds(fieldsName, ids) {
    let result = await serverAnalysisDbMethods.resolveServerAnalysisByIdsDB(fieldsName, ids);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === 'not found') {
        return generateServiceResult({data: null}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function resolveServerAnalysisLastDays(fieldsName, days) {
    let result = await serverAnalysisDbMethods.resolveServerAnalysisLastDaysDB(fieldsName, days);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === 'not found') {
        return generateServiceResult({data: null}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getCrawlerSources() {
    let result = await crawlerMethodsDB.getSourcesObjDB(true);
    if (!result || result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function editSource(sourceName, movie_url, serial_url, crawlCycle, disabled, cookies, reCrawl, description, userData) {
    let result = await adminCrawlerDbMethods.updateSourceData(sourceName, {
        movie_url,
        serial_url,
        crawlCycle,
        disabled,
        cookies,
        description,
    }, userData);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === "notfound") {
        return generateServiceResult({data: null}, 404, errorMessage.crawlerSourceNotFound);
    }

    if (reCrawl) {
        crawler(sourceName, {
            crawlMode: 2,
            isManualStart: true,
            handleDomainChange: false,
            handleCastUpdate: false,
        });
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function addSource(sourceName, movie_url, serial_url, crawlCycle, disabled, cookies) {
    let result = await adminCrawlerDbMethods.addSourceDB(sourceName, {
        movie_url,
        serial_url,
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

//---------------------------------------------------
//---------------------------------------------------

export async function updateConfigsDb(configs, requestOrigin) {
    const keys = Object.keys(configs);
    let errors = [];
    for (let i = 0; i < keys.length; i++) {
        if (!safeFieldsToEdit_array.includes(keys[i])) {
            errors.push(`unKnown parameter ${keys[i]}`);
        }
    }
    if (errors.length > 0) {
        return generateServiceResult({data: null}, 400, errors.join(', '));
    }

    if (configs.corsAllowedOrigins && !configs.corsAllowedOrigins.includes(requestOrigin)) {
        return generateServiceResult({data: null}, 400, errorMessage.cantRemoveCurrentOrigin);
    }

    let result = await adminConfigDbMethods.updateServerConfigs(configs);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === "notfound") {
        return generateServiceResult({data: null}, 404, errorMessage.configsDbNotFound);
    }
    return generateServiceResult({data: {}}, 200, '');
}

export async function getConfigsDb() {
    let result = await adminConfigDbMethods.getServerConfigs_safe();
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === null) {
        return generateServiceResult({data: null}, 404, errorMessage.configsDbNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getServerStatus() {
    let result = await getServerResourcesStatus();
    if (result === null) {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getRemoteBrowsersStatus() {
    let result = await RemoteHeadlessBrowserMethods.getAllRemoteBrowsersStatus();
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export function mutateRemoteBrowserStatus(mutateType, id, all) {
    let result = RemoteHeadlessBrowserMethods.manualMutateRemoteBrowser(mutateType, id, all);
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === 'not found') {
        return generateServiceResult({data: result}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function checkSourceOnRemoteBrowsers(sourceName, url) {
    let result = await RemoteHeadlessBrowserMethods.checkSourceOnAllRemoteBrowsers(sourceName, url);
    if (result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function setMessage(message, date) {
    let result = await adminConfigDbMethods.setMessageDB(message, date);
    if (result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function addNewAppVersion(appData, appFileData, userData) {
    try {
        if (!appFileData) {
            return generateServiceResult({data: null}, 400, errorMessage.badRequestBody);
        }

        let response = await getArrayBufferResponse(appFileData.location);
        appData.fileData = {
            url: appFileData.location,
            size: Number(response.data.length),
            sha256checksum: createHash('sha256').update(response.data).digest('hex'),
            addDate: new Date(),
        };
        let result = await adminConfigDbMethods.addNewAppVersionDB(appData, userData);
        if (result === 'error') {
            const fileName = appFileData.location.split('/').pop();
            await removeAppFileFromS3(fileName);
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        } else if (result === 'already exists') {
            return generateServiceResult({data: null}, 409, errorMessage.alreadyExist);
        }
        return generateServiceResult({data: result}, 200, '');
    } catch (error) {
        saveError(error);
        if (appFileData && appFileData.location) {
            const fileName = appFileData.location.split('/').pop();
            await removeAppFileFromS3(fileName);
        }
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
}

export async function removeAppVersion(vid) {
    try {
        let result = await adminConfigDbMethods.removeAppVersionDB(vid);
        if (result === 'error') {
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        } else if (result === 'not found') {
            return generateServiceResult({data: null}, 500, errorMessage.appNotFound);
        }
        const fileName = result.fileData.url.split('/').pop();
        await removeAppFileFromS3(fileName);
        return generateServiceResult({data: result}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
}

export async function getAppVersion() {
    let result = await adminConfigDbMethods.getAppVersionDB();
    if (result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.appNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function check3rdPartApisWorking() {
    let res = await Promise.allSettled([
        checkImdbApiKeys(),
        checkOmdbApiKeys(),
    ]);
    let result = [
        {name: 'imdb', totalKeys: res[0].value.totalKeys, badKeys: res[0].value.badKeys, noKeyNeed: false},
        {name: 'jikan', totalKeys: 0, badKeys: [], noKeyNeed: true},
        {name: 'omdb', totalKeys: res[1].value.totalKeys, badKeys: res[1].value.badKeys, noKeyNeed: false},
        {name: 'tvmaze', totalKeys: 0, badKeys: [], noKeyNeed: true},
    ];
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------