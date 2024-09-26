import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {crawler, torrentCrawlerSearch} from "../crawlers/crawler.js";
import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as adminCrawlerDbMethods from "../data/db/admin/adminCrawlerDbMethods.js";
import * as adminConfigDbMethods from "../data/db/admin/adminConfigDbMethods.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import * as botsDbMethods from "../data/db/botsDbMethods.js";
import * as moviesDbMethods from "../data/db/moviesDbMethods.js";
import * as staffAndCharactersDbMethods from "../data/db/staffAndCharactersDbMethods.js";
import * as usersDbMethods from "../data/db/usersDbMethods.js";
import * as adminDbMethods from "../data/db/admin/adminDbMethods.js";
import {getCrawlerStatusObj} from "../crawlers/status/crawlerStatus.js";
import {getServerResourcesStatus} from "../utils/serverStatus.js";
import {pauseCrawler_manual, resumeCrawler_manual, stopCrawler_manual} from "../crawlers/status/crawlerController.js";
import {safeFieldsToEdit_array} from "../config/configsDb.js";
import * as RemoteHeadlessBrowserMethods from "../crawlers/remoteHeadlessBrowser.js";
import {createHash} from "node:crypto";
import {saveError} from "../error/saveError.js";
import {
    bucketNamesObject,
    bucketsEndpointSuffix,
    removeAppFileFromS3,
    removeProfileImageFromS3
} from "../data/cloudStorage.js";
import {getArrayBufferResponse} from "../crawlers/utils/axiosUtils.js";
import {checkOmdbApiKeys} from "../crawlers/3rdPartyApi/omdbApi.js";
import {getSourcesMethods, sourcesNames} from "../crawlers/sourcesArray.js";
import {getCronJobsStatus, startCronJobByName} from "../utils/cronJobsStatus.js";
import * as Cache from "../data/cache.js";
import config from "../config/index.js";
import * as roleAndPermissionsDbMethods from "../data/db/admin/roleAndPermissionsDbMethods.js";
import {_testUserId} from "../preStart.js";

export async function startCrawler(crawlerOptions) {
    let result = await crawler(crawlerOptions.sourceName, {
        ...crawlerOptions,
        crawlMode: crawlerOptions.mode,
        isManualStart: true,
    });
    if (result.isError) {
        return generateServiceResult({data: result}, 500, result.message);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function startTorrentSearch(crawlerOptions) {
    let result = await torrentCrawlerSearch({
        ...crawlerOptions,
        isManualStart: true,
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

export async function duplicateTitles(preCheck, autoRemove) {
    let result = await adminDbMethods.getDuplicateTitles(preCheck);
    if (result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }
    if (result.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.movieNotFound);
    }
    if (preCheck && autoRemove) {
        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < result[i].ids.length; j++) {
                await moviesDbMethods.removeMovieById(result[i].ids[j]);
            }
        }
    }
    return generateServiceResult({data: result}, 200, '');
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
            castUpdateState: 'ignore',
        });
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function removeSource(sourceName, userData) {
    let result = await adminCrawlerDbMethods.removeSource(sourceName, userData, true);

    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === "notfound") {
        return generateServiceResult({data: null}, 404, errorMessage.crawlerSourceNotFound);
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

        //https://download-app.s3.com/ttt-ttt%401.0.0.apk
        //s3.com/download-app/ttt-ttt@1.0.0.apk
        if (appFileData.location.includes('/' + bucketNamesObject.downloadApp + '/')) {
            appFileData.location = `https://${bucketNamesObject.downloadApp}.${bucketsEndpointSuffix}/${appFileData.location.split('/').pop()}`;
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
    let omdb = await checkOmdbApiKeys();

    let result = [
        {name: 'jikan', totalKeys: 0, badKeys: [], noKeyNeed: true},
        {name: 'omdb', totalKeys: omdb.totalKeys, badKeys: omdb.badKeys, noKeyNeed: false},
        {name: 'tvmaze', totalKeys: 0, badKeys: [], noKeyNeed: true},
        {name: 'kitsu', totalKeys: 0, badKeys: [], noKeyNeed: true},
    ];
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getBots(botId) {
    let result;
    if (botId) {
        result = await botsDbMethods.getBotData(botId);
        if (result === 'error') {
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        }
        if (result === null) {
            return generateServiceResult({data: null}, 404, errorMessage.botNotFound);
        }
    } else {
        result = await botsDbMethods.getAllBots();
        if (result === 'error') {
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        }
        if (result.length === 0) {
            return generateServiceResult({data: []}, 404, errorMessage.botNotFound);
        }
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function editBot(botId, botName, botType, lastUseDate, lastApiCall_news, lastApiCall_updates, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, permissionToTorrentSearch, botToken, userData) {
    let result = await botsDbMethods.updateBotData(botId, {
        botName,
        botToken,
        botType,
        lastUseDate,
        lastApiCall_news,
        lastApiCall_updates,
        disabled,
        description,
        isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, permissionToTorrentSearch,
    }, userData);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result === "notfound") {
        return generateServiceResult({data: null}, 404, errorMessage.botNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function addBot(botName, botType, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, permissionToTorrentSearch, botToken, userData) {
    let result = await botsDbMethods.addNewBot(botName, botType, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, permissionToTorrentSearch, botToken, userData);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    if (result === "notfound") {
        return generateServiceResult({data: null}, 500, errorMessage.botNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function deleteBot(botId, userData) {
    let result = await botsDbMethods.removeBotData(botId, userData);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getCronJobs() {
    let result = getCronJobsStatus();
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function startCronJob(jobName) {
    let result = startCronJobByName(jobName);
    if (result === "error") {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
    if (result === "notfound") {
        return generateServiceResult({data: null}, 400, errorMessage.jobNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function addRelatedTitle(id1, id2, relation) {
    let result = await moviesDbMethods.addRelatedMovies(id1, id2, relation);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
    if (result === "notfound") {
        return generateServiceResult({}, 404, errorMessage.movieNotFound);
    }
    return generateServiceResult({}, 200, '');
}

export async function removeRelatedTitle(id1, id2) {
    let result = await moviesDbMethods.removeRelatedMovies(id1, id2);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
    return generateServiceResult({}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function removeDocsRows(removeType, id, currentAdminPermissions) {
    let result;
    if (removeType === 'movie') {
        result = await moviesDbMethods.removeMovieById(id);
    } else if (removeType === 'staff') {
        if (isNaN(id)) {
            result = "invalid id";
        } else {
            result = await staffAndCharactersDbMethods.removeStaffById(Number(id));
        }
    } else if (removeType === 'character') {
        if (isNaN(id)) {
            result = "invalid id";
        } else {
            result = await staffAndCharactersDbMethods.removeCharacterById(Number(id));
        }
    } else if (removeType === 'user') {
        if (isNaN(id)) {
            result = "invalid id";
        } else {
            id = Number(id);

            const admin_remove_user = roleAndPermissionsDbMethods.PermissionsList.admin_remove_user;
            if (!currentAdminPermissions.includes(admin_remove_user)) {
                return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_remove_user}]) permissions`);
            }

            const userRoles = await roleAndPermissionsDbMethods.getRoleUsersByIdDb(id);

            if (userRoles.find(r =>
                r.id === roleAndPermissionsDbMethods.Default_Role_Ids.mainAdmin || r.name === roleAndPermissionsDbMethods.Default_Role_Names.main_admin_role)) {
                return generateServiceResult({data: null}, 403, `Forbidden, cannot remove main-admin`);
            }

            if (userRoles.find(r => roleAndPermissionsDbMethods.checkRoleIsAdminRole(r.name))) {
                const admin_remove_admin = roleAndPermissionsDbMethods.PermissionsList.admin_remove_admin;
                if (!currentAdminPermissions.includes(admin_remove_admin)) {
                    return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_remove_admin}]) permissions`);
                }
            }

            if (id === _testUserId) {
                return generateServiceResult({data: null}, 403, `Forbidden, cannot remove $$test_user$$`);
            }

            result = await usersDbMethods.removeUserById(id);
            if (result !== 'notfound' && result !== 'error') {
                //remove profileImages from s3
                for (let i = 0; i < result.profileImages.length; i++) {
                    let imageFileName = result.profileImages[i].url.split('/').pop();
                    await removeProfileImageFromS3(imageFileName);
                }
                //blacklist tokens
                for (let i = 0; i < result.activeSessions.length; i++) {
                    await Cache.setJwtDataCacheByKey(result.activeSessions[i].refreshToken, 'deleteAccount', config.jwt.accessTokenExpireSeconds);
                }
            }
        }
    }

    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === "invalid id") {
        return generateServiceResult({}, 400, 'Invalid id');
    } else if (result === "notfound") {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    return generateServiceResult({}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getAllPermissionsList() {
    return generateServiceResult({data: Object.keys(roleAndPermissionsDbMethods.PermissionsList)}, 200, '');
}

export async function getAllRoles(searchingPermissions) {
    let result = await roleAndPermissionsDbMethods.getAllRolesWithPermissionsDb(searchingPermissions);
    if (!result) {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getRoleDataByName(roleName) {
    let result = await roleAndPermissionsDbMethods.getRoleDataByName(roleName);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (!result) {
        return generateServiceResult({data: null}, 404, "Not found");
    }
    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function createNewRole(name, description, torrentLeachLimitGb, torrentSearchLimit, permissionIds, currentAdminPermissions) {
    const permissions = Object.keys(roleAndPermissionsDbMethods.PermissionsList);
    if (permissionIds.some(pid => roleAndPermissionsDbMethods.checkPermissionIsAdminPermission(permissions[pid] || ''))) {
        // admin role
        if (!name.startsWith('admin_')) {
            return generateServiceResult({data: null}, 400, "Name of Roles with admin permissions must start with \'admin_\'");
        }

        const admin_manage_admin_role = roleAndPermissionsDbMethods.PermissionsList.admin_manage_admin_role;
        if (!currentAdminPermissions.includes(admin_manage_admin_role)) {
            return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_manage_admin_role}]) permissions`);
        }
    } else {
        // normal role
        if (name.startsWith('admin_')) {
            return generateServiceResult({data: null}, 400, "Name of Roles without admin permissions cannot start with \'admin_\'");
        }
    }

    let result = await roleAndPermissionsDbMethods.addNewRoleDb(name, description, torrentLeachLimitGb, torrentSearchLimit, permissionIds);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === "name already exist") {
        return generateServiceResult({data: null}, 409, "Already exist");
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function editRoleData(name, newName, description, torrentLeachLimitGb, torrentSearchLimit, permissionIds, currentAdminPermissions, jwtUserData) {
    const permissions = Object.keys(roleAndPermissionsDbMethods.PermissionsList);
    if (permissionIds.some(pid => roleAndPermissionsDbMethods.checkPermissionIsAdminPermission(permissions[pid] || ''))) {
        // admin role
        if (!newName.startsWith('admin_')) {
            return generateServiceResult({data: null}, 400, "Name of Roles with admin permissions must start with \'admin_\'");
        }

        const admin_manage_admin_role = roleAndPermissionsDbMethods.PermissionsList.admin_manage_admin_role;
        if (!currentAdminPermissions.includes(admin_manage_admin_role)) {
            return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_manage_admin_role}]) permissions`);
        }
    } else {
        // normal role
        if (newName.startsWith('admin_')) {
            return generateServiceResult({data: null}, 400, "Name of Roles without admin permissions cannot start with \'admin_\'");
        }
    }

    if (name === roleAndPermissionsDbMethods.Default_Role_Names.main_admin_role || newName === roleAndPermissionsDbMethods.Default_Role_Names.main_admin_role) {
        return generateServiceResult({data: null}, 403, `Forbidden, cannot edit main-admin-role`);
    }

    if (!jwtUserData.roleIds.includes(roleAndPermissionsDbMethods.Default_Role_Ids.mainAdmin)) {
        const roleData = await roleAndPermissionsDbMethods.getRoleDataByName(name);
        if (roleData && jwtUserData.roleIds.includes(roleData?.id)) {
            return generateServiceResult({data: null}, 403, `Forbidden, cannot edit the roles of yourself`);
        }
    }

    let result = await roleAndPermissionsDbMethods.editRoleDb(name, newName, description, torrentLeachLimitGb, torrentSearchLimit, permissionIds);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (!result) {
        return generateServiceResult({data: null}, 404, "Not found");
    } else if (result === "name already exist") {
        return generateServiceResult({data: null}, 409, "Already exist");
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function removeRoleByName(name, currentAdminPermissions) {
    if (roleAndPermissionsDbMethods.checkRoleIsAdminRole(name)) {
        // admin role
        const admin_manage_admin_role = roleAndPermissionsDbMethods.PermissionsList.admin_manage_admin_role;
        if (!currentAdminPermissions.includes(admin_manage_admin_role)) {
            return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_manage_admin_role}]) permissions`);
        }
    }

    let result = await roleAndPermissionsDbMethods.removeRoleByNameDb(name);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (!result) {
        return generateServiceResult({data: null}, 404, "Not found");
    }

    return generateServiceResult({data: result}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------

export async function getRoleUsers(roleName, skip, limit) {
    let result = await roleAndPermissionsDbMethods.getRoleUsersDb(roleName, skip, limit);
    if (!result) {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, "Not found");
    }

    return generateServiceResult({data: result}, 200, '');
}

export async function editUserRoles(userId, roleIds, currentAdminPermissions, jwtUserData) {
    if (roleIds.length === 0) {
        roleIds = [roleAndPermissionsDbMethods.Default_Role_Ids.defaultUser];
    }

    const prevRoles = await roleAndPermissionsDbMethods.getRoleUsersByIdDb(userId);
    if (prevRoles === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (!prevRoles) {
        return generateServiceResult({}, 404, "Not found");
    }

    const newRoles = await roleAndPermissionsDbMethods.getRolesByIds(roleIds);
    if (newRoles === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    }

    const addingRoles = newRoles.filter(nr => !prevRoles.find(pr => pr.id === nr.id));
    const removingRoles = prevRoles.filter(pr => !newRoles.find(nr => pr.id === nr.id));

    if (addingRoles.some(r => roleAndPermissionsDbMethods.checkRoleIsAdminRole(r.name))) {
        const admin_create_admin = roleAndPermissionsDbMethods.PermissionsList.admin_create_admin;
        if (!currentAdminPermissions.includes(admin_create_admin)) {
            return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_create_admin}]) permissions`);
        }
    }

    if (removingRoles.some(r => roleAndPermissionsDbMethods.checkRoleIsAdminRole(r.name))) {
        const admin_remove_admin = roleAndPermissionsDbMethods.PermissionsList.admin_remove_admin;
        if (!currentAdminPermissions.includes(admin_remove_admin)) {
            return generateServiceResult({data: null}, 403, `Forbidden, need ([${admin_remove_admin}]) permissions`);
        }
    }

    if (newRoles.find(r =>
        r.id === roleAndPermissionsDbMethods.Default_Role_Ids.mainAdmin || r.name === roleAndPermissionsDbMethods.Default_Role_Names.main_admin_role)) {
        return generateServiceResult({data: null}, 403, `Forbidden, cannot give or get main-admin-role`);
    }

    if (userId === jwtUserData.userId && !jwtUserData.roleIds.includes(roleAndPermissionsDbMethods.Default_Role_Ids.mainAdmin)) {
        return generateServiceResult({data: null}, 403, `Forbidden, cannot edit the roles of yourself`);
    }

    if (userId === _testUserId) {
        return generateServiceResult({data: null}, 403, `Forbidden, cannot edit the roles of $$test_user$$`);
    }

    let result = await roleAndPermissionsDbMethods.editUserRoles(userId, roleIds);
    if (result === "error") {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === "role not found") {
        return generateServiceResult({}, 404, "Role not found");
    } else if (!result) {
        return generateServiceResult({}, 404, "Not found");
    }

    return generateServiceResult({}, 200, '');
}

//---------------------------------------------------
//---------------------------------------------------
