import {adminServices} from '../services/index.js';

export async function startCrawler(req, res) {
    let sourceName = req.query.sourceName;
    let mode = req.query.mode ? Number(req.query.mode) : 0;
    let handleDomainChange = req.query.handleDomainChange !== 'false';
    let handleDomainChangeOnly = req.query.handleDomainChangeOnly === 'true';
    let handleCastUpdate = req.query.handleCastUpdate !== 'false';
    let crawlingResult = await adminServices.startCrawler(sourceName, mode, handleDomainChange, handleDomainChangeOnly, handleCastUpdate);

    return res.status(crawlingResult.responseData.code).json(crawlingResult.responseData);
}

export async function getCrawlerStatus(req, res) {
    let result = await adminServices.getCrawlerStatus();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getCrawlingHistory(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getCrawlingHistory(new Date(startTime), new Date(endTime), Number(skip), Number(limit));

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getCrawlerSources(req, res) {
    let result = await adminServices.getCrawlerSources();

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getActiveUsersAnalysis(req, res) {
    let {startTime, endTime, skip, limit} = req.params;
    let result = await adminServices.getActiveUsersAnalysis(new Date(startTime), new Date(endTime), Number(skip), Number(limit));

    return res.status(result.responseData.code).json(result.responseData);
}
