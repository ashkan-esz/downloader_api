import * as adminConfigDbMethods from "../data/db/admin/adminConfigDbMethods.js";
import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {setRedis} from "../data/redis.js";
import {compareAppVersions} from "../data/db/admin/adminConfigDbMethods.js";


export async function getMessage(routeUrl) {
    let result = await adminConfigDbMethods.getMessageDB();
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === null) {
        return generateServiceResult({data: null}, 404, errorMessage.messageNotFound);
    }

    await setRedis(routeUrl, {
        data: result,
        code: 200,
        errorMessage: '',
        isGuest: false,
        cachedData: true,
    }, 5 * 60);

    return generateServiceResult({data: result}, 200, '');
}

export async function getApps(appName, routeUrl) {
    let result = await adminConfigDbMethods.getAppVersionDB(true);
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.appNotFound);
    }

    if (appName) {
        result = result.filter(app => app.appName === appName);
    }

    await setRedis(routeUrl, {
        data: result,
        code: 200,
        errorMessage: '',
        isGuest: false,
        cachedData: true,
    }, 5 * 60);

    return generateServiceResult({data: result}, 200, '');
}

export async function checkAppUpdate(appName, os, version, routeUrl) {
    let result = await Promise.allSettled([
        adminConfigDbMethods.getAppVersionDB(true),
        adminConfigDbMethods.getMessageDB(),
    ]);

    if (result[0].value === 'error' || result[1].value === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }

    let appData = result[0].value.find(app => app.appName === appName && app.os === os);
    let data = {
        hasUpdate: appData ? compareAppVersions(appData.latestVersion, version) === 1 : false,
        isForceUpdate: appData ? compareAppVersions(appData.minVersion, version) === 1 : false,
        minVersion: appData ? appData.minVersion : '',
        ...appData?.versions[0],
        message: result[1].value?.message || '',
    }

    await setRedis(routeUrl, {
        data: data,
        code: 200,
        errorMessage: '',
        isGuest: false,
        cachedData: true,
    }, 5 * 60);

    return generateServiceResult({data: data}, 200, '');
}