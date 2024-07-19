import {adminServices} from '../services/index.js';
import {sendResponse} from "./controllerUtils.js";

export async function startCrawler(req, res) {
    let result = await adminServices.startCrawler(req.query);
    return sendResponse(req, res, result);
}

export async function startTorrentSearch(req, res) {
    let result = await adminServices.startTorrentSearch(req.query);
    return sendResponse(req, res, result);
}

export async function getCrawlerStatus(req, res) {
    let result = await adminServices.getCrawlerStatus();
    return sendResponse(req, res, result);
}

export async function crawlUrl(req, res) {
    let {sourceName, url, title, type} = req.body;
    let result = await adminServices.crawlUrl(sourceName, url, title, type);
    return sendResponse(req, res, result);
}

export async function duplicateTitles(req, res) {
    let {preCheck, autoRemove} = req.query;
    let result = await adminServices.duplicateTitles(preCheck, autoRemove);
    return sendResponse(req, res, result);
}

export async function manualPauseCrawler(req, res) {
    let {duration} = req.params;
    let result = await adminServices.manualPauseCrawler(duration);
    return sendResponse(req, res, result);
}

export async function resumeCrawler(req, res) {
    let {force} = req.params;
    let result = await adminServices.resumeCrawler(force);
    return sendResponse(req, res, result);
}

export async function manualStopCrawler(req, res) {
    let result = await adminServices.manualStopCrawler();
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function getServerAnalysisInTimes(req, res) {
    let {serverAnalysisFieldName, startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getServerAnalysisInTimes(serverAnalysisFieldName, startTime, endTime, skip, limit);
    return sendResponse(req, res, result);
}

export async function getServerAnalysisCurrentMonth(req, res) {
    let {serverAnalysisFieldName, page} = req.params;
    let result = await adminServices.getServerAnalysisCurrentMonth(serverAnalysisFieldName, page);
    return sendResponse(req, res, result);
}

export async function resolveServerAnalysis(req, res) {
    let {serverAnalysisFieldName, id} = req.params;
    let result = await adminServices.resolveServerAnalysis(serverAnalysisFieldName, id);
    return sendResponse(req, res, result);
}

export async function resolveServerAnalysisByIds(req, res) {
    let {serverAnalysisFieldName} = req.params;
    let {ids} = req.body;
    let result = await adminServices.resolveServerAnalysisByIds(serverAnalysisFieldName, ids);
    return sendResponse(req, res, result);
}

export async function resolveServerAnalysisLastDays(req, res) {
    let {serverAnalysisFieldName, days} = req.params;
    let result = await adminServices.resolveServerAnalysisLastDays(serverAnalysisFieldName, days);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function getCrawlerSources(req, res) {
    let result = await adminServices.getCrawlerSources();
    return sendResponse(req, res, result);
}

export async function editSource(req, res) {
    let {movie_url, serial_url, crawlCycle, disabled, cookies, reCrawl, description} = req.body;
    let result = await adminServices.editSource(req.params.sourceName, movie_url, serial_url, crawlCycle, disabled, cookies, reCrawl, description, req.jwtUserData);
    return sendResponse(req, res, result);
}

export async function removeSource(req, res) {
    let result = await adminServices.removeSource(req.params.sourceName, req.jwtUserData);
    return sendResponse(req, res, result);
}

export async function addSource(req, res) {
    let {sourceName, movie_url, serial_url, crawlCycle, disabled, cookies} = req.body;
    let result = await adminServices.addSource(sourceName, movie_url, serial_url, crawlCycle, disabled, cookies);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function updateConfigsDb(req, res) {
    let result = await adminServices.updateConfigsDb(req.body, req.get('origin'));
    return sendResponse(req, res, result);
}

export async function getConfigsDb(req, res) {
    let result = await adminServices.getConfigsDb();
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function getServerStatus(req, res) {
    let result = await adminServices.getServerStatus();
    return sendResponse(req, res, result);
}

export async function getRemoteBrowsersStatus(req, res) {
    let result = await adminServices.getRemoteBrowsersStatus();
    return sendResponse(req, res, result);
}

export function mutateRemoteBrowserStatus(req, res) {
    let {mutateType, id} = req.params;
    let {all} = req.query;
    let result = adminServices.mutateRemoteBrowserStatus(mutateType, id, all);
    return sendResponse(req, res, result);
}

export async function checkSourceOnRemoteBrowsers(req, res) {
    let {sourceName, url} = req.params;
    let result = await adminServices.checkSourceOnRemoteBrowsers(sourceName, url);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function setMessage(req, res) {
    let {message, date} = req.body;
    let result = await adminServices.setMessage(message, date);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function addNewAppVersion(req, res) {
    let result = await adminServices.addNewAppVersion(req.query.appData, req.file, req.jwtUserData);
    return sendResponse(req, res, result);
}

export async function removeAppVersion(req, res) {
    let result = await adminServices.removeAppVersion(req.params.vid);
    return sendResponse(req, res, result);
}

export async function getAppVersion(req, res) {
    let result = await adminServices.getAppVersion();
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function check3rdPartApisWorking(req, res) {
    let result = await adminServices.check3rdPartApisWorking();
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function getBots(req, res) {
    let result = await adminServices.getBots(req.query.botId);
    return sendResponse(req, res, result);
}

export async function editBot(req, res) {
    let {botName, botToken, botType, lastUseDate, lastApiCall_news, lastApiCall_updates, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech} = req.body;
    let result = await adminServices.editBot(req.params.botId,
        botName, botType, lastUseDate, lastApiCall_news, lastApiCall_updates,
        disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, botToken,
        req.jwtUserData);
    return sendResponse(req, res, result);
}

export async function addBot(req, res) {
    let {botName, botToken, botType, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech} = req.body;
    let result = await adminServices.addBot(botName, botType, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, botToken, req.jwtUserData);
    return sendResponse(req, res, result);
}

export async function deleteBot(req, res) {
    let result = await adminServices.deleteBot(req.params.botId, req.jwtUserData);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function getCronJobs(req, res) {
    let result = await adminServices.getCronJobs();
    return sendResponse(req, res, result);
}

export async function startCronJob(req, res) {
    let result = await adminServices.startCronJob(req.params.jobName);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function addRelatedTitle(req, res) {
    let {id1, id2, relation} = req.params;
    let result = await adminServices.addRelatedTitle(id1, id2, relation);
    return sendResponse(req, res, result);
}

export async function removeRelatedTitle(req, res) {
    let {id1, id2} = req.params;
    let result = await adminServices.removeRelatedTitle(id1, id2);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------

export async function removeDocsRows(req, res) {
    let {removeType, id} = req.params;
    let result = await adminServices.removeDocsRows(removeType, id);
    return sendResponse(req, res, result);
}

//---------------------------------------------------
//---------------------------------------------------
