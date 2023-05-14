import {adminServices} from '../services/index.js';

export async function startCrawler(req, res) {
    let {sourceName, mode, handleDomainChange, handleDomainChangeOnly, handleCastUpdate} = req.query;
    let crawlingResult = await adminServices.startCrawler(sourceName, mode, handleDomainChange, handleDomainChangeOnly, handleCastUpdate);

    return res.status(crawlingResult.responseData.code).json(crawlingResult.responseData);
}

export async function getCrawlerStatus(req, res) {
    let result = await adminServices.getCrawlerStatus();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function manualPauseCrawler(req, res) {
    let {duration} = req.params;
    let result = await adminServices.manualPauseCrawler(duration);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function resumeCrawler(req, res) {
    let {force} = req.params;
    let result = await adminServices.resumeCrawler(force);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function manualStopCrawler(req, res) {
    let result = await adminServices.manualStopCrawler();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getCrawlingHistory(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getCrawlingHistory(startTime, endTime, skip, limit);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getCrawlerWarningsHistory(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getCrawlerWarningsHistory(startTime, endTime, skip, limit);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getCrawlerSources(req, res) {
    let result = await adminServices.getCrawlerSources();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getCrawlerWarnings(req, res) {
    let result = await adminServices.getCrawlerWarnings();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function resolveCrawlerWarning(req, res) {
    let result = await adminServices.resolveCrawlerWarning(req.params.id);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getServerLogsInTimes(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getServerLogsHistory(startTime, endTime, skip, limit);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getServerLogs(req, res) {
    let result = await adminServices.getServerLogs();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function removeServerLog(req, res) {
    let result = await adminServices.removeServerLog(req.params.id);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getGoogleCacheCallsInTimes(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getGoogleCacheCallsHistory(startTime, endTime, skip, limit);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getGoogleCacheCalls(req, res) {
    let result = await adminServices.getGoogleCacheCalls();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function removeGoogleCacheCalls(req, res) {
    let result = await adminServices.removeGoogleCacheCalls(req.params.id);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function editSource(req, res) {
    let {movie_url, page_count, serial_url, serial_page_count, crawlCycle, disabled, cookies} = req.body;
    let result = await adminServices.editSource(req.params.sourceName, movie_url, page_count, serial_url, serial_page_count, crawlCycle, disabled, cookies);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function addSource(req, res) {
    let {sourceName, movie_url, page_count, serial_url, serial_page_count, crawlCycle, disabled, cookies} = req.body;
    let result = await adminServices.addSource(sourceName, movie_url, page_count, serial_url, serial_page_count, crawlCycle, disabled, cookies);

    return res.status(result.responseData.code).json(result.responseData);
}

//---------------------------------------------------
//---------------------------------------------------

export async function updateConfigsDb(req, res) {
    let result = await adminServices.updateConfigsDb(req.body, req.get('origin'));

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getConfigsDb(req, res) {
    let result = await adminServices.getConfigsDb();

    return res.status(result.responseData.code).json(result.responseData);
}

//---------------------------------------------------
//---------------------------------------------------


export async function getActiveUsersAnalysis(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getActiveUsersAnalysis(startTime, endTime, skip, limit);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getServerStatus(req, res) {
    let result = await adminServices.getServerStatus();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getRemoteBrowsersStatus(req, res) {
    let result = await adminServices.getRemoteBrowsersStatus();

    return res.status(result.responseData.code).json(result.responseData);
}

export function mutateRemoteBrowserStatus(req, res) {
    let {mutateType, id} = req.params;
    let {all} = req.query;
    let result = adminServices.mutateRemoteBrowserStatus(mutateType, id, all);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function checkSourceOnRemoteBrowsers(req, res) {
    let {sourceName, url} = req.params;
    let result = await adminServices.checkSourceOnRemoteBrowsers(sourceName, url);

    return res.status(result.responseData.code).json(result.responseData);
}