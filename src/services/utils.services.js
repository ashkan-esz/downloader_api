import * as adminConfigDbMethods from "../data/db/admin/adminConfigDbMethods.js";
import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import * as Cache from "../data/cache.js";
import {compareAppVersions} from "../data/db/admin/adminConfigDbMethods.js";


export async function getMessage() {
    let cacheResult = await Cache.getUtilsMessagesCacheByKey("");
    let result = cacheResult || await adminConfigDbMethods.getMessageDB();
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === null) {
        return generateServiceResult({data: null}, 404, errorMessage.messageNotFound);
    }

    if (!cacheResult) {
        await Cache.setUtilsMessagesCacheByKey("", result);
    }

    return generateServiceResult({data: result, isCacheData: !!cacheResult}, 200, '');
}

export async function getApps(appName) {
    let cacheResult = await Cache.getUtilsAppsCacheByKey("");
    let result = cacheResult || await adminConfigDbMethods.getAppVersionDB(true);
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.appNotFound);
    }

    if (!cacheResult) {
        await Cache.setUtilsAppsCacheByKey("", result);
    }

    if (appName) {
        result = result.filter(app => app.appName === appName);
    }

    return generateServiceResult({data: result, isCacheData: !!cacheResult}, 200, '');
}

export async function checkAppUpdate(appName, os, version) {
    const cacheKey = [appName, os, version].join('/');
    let cacheResult = await Cache.getUtilsAppUpdateCacheByKey(cacheKey);
    let result = cacheResult || await Promise.allSettled([
        adminConfigDbMethods.getAppVersionDB(true),
        adminConfigDbMethods.getMessageDB(),
    ]);

    if (result[0].value === 'error' || result[1].value === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }

    if (!cacheResult) {
        await Cache.setUtilsAppUpdateCacheByKey(cacheKey, result);
    }

    let appData = result[0].value.find(app => app.appName === appName && app.os === os);
    let data = {
        hasUpdate: appData ? compareAppVersions(appData.latestVersion, version) === 1 : false,
        isForceUpdate: appData ? compareAppVersions(appData.minVersion, version) === 1 : false,
        minVersion: appData ? appData.minVersion : '',
        ...appData?.versions[0],
        message: result[1].value?.message || '',
    }

    return generateServiceResult({data: data, isCacheData: !!cacheResult}, 200, '');
}