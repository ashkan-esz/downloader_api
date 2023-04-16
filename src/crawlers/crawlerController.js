import config from "../config/index.js";
import {getCpuAverageLoad, getMemoryStatus} from "../utils/serverStatus.js";
import {
    checkForceResume,
    checkForceStopCrawler,
    disableForceResume,
    forceStopCrawler,
    removeCrawlerPause,
    saveCrawlerPause
} from "./crawlerStatus.js";


export const crawlerMemoryLimit = (config.crawler.memoryLimit || (config.crawler.totalMemory * 0.9)) - 10;

let manualPauseStart = 0;
let manualPauseDuration = 0;
let manualPauseUntil = 0;

export async function pauseCrawler_manual(duration) {
    let res = saveCrawlerPause('manual pause', true, duration);
    if (res !== "ok") {
        return res;
    }
    const now = Date.now();
    manualPauseStart = now;
    manualPauseDuration = duration;
    manualPauseUntil = now + duration * 60 * 1000;
    return "ok";
}

export async function resumeCrawler_manual(force) {
    let res = removeCrawlerPause(true, force);
    if (res !== "ok") {
        return res;
    }
    manualPauseStart = 0;
    manualPauseDuration = 0;
    manualPauseUntil = 0;
    return "ok";
}

export async function stopCrawler_manual() {
    forceStopCrawler();
    removeCrawlerPause();
    manualPauseStart = 0;
    manualPauseDuration = 0;
    manualPauseUntil = 0;
    return "ok";
}

//--------------------------------------------------------
//--------------------------------------------------------

export function checkNeedForceStopCrawler() {
    return checkForceStopCrawler();
}

export async function pauseCrawler() {
    while (Date.now() < manualPauseUntil) {
        if (checkForceStopCrawler()) {
            break;
        }
        saveCrawlerPause('manual pause');
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    manualPauseStart = 0;
    manualPauseDuration = 0;
    manualPauseUntil = 0;
    let memoryStatus = await getMemoryStatus(false);
    let cpuAverageLoad = getCpuAverageLoad();
    while (memoryStatus.used >= crawlerMemoryLimit || cpuAverageLoad[0] > config.crawler.cpuLimit) {
        if (checkForceStopCrawler()) {
            break;
        }
        const pauseReason = memoryStatus.used >= crawlerMemoryLimit
            ? `memory/limit: ${memoryStatus.used.toFixed(1)}/${crawlerMemoryLimit.toFixed(1)} `
            : `cpu/limit: ${cpuAverageLoad[0]}/${config.crawler.cpuLimit}`;
        saveCrawlerPause(pauseReason);
        if (checkForceResume()) {
            disableForceResume();
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        memoryStatus = await getMemoryStatus(false);
        cpuAverageLoad = getCpuAverageLoad();
    }
    removeCrawlerPause();
}

export async function checkServerIsIdle() {
    const memoryStatus = await getMemoryStatus(false);
    const cpuAverageLoad = getCpuAverageLoad();
    return (
        memoryStatus.used < crawlerMemoryLimit &&
        memoryStatus.used < (config.crawler.totalMemory * 0.7) &&
        cpuAverageLoad[0] < 50 &&
        cpuAverageLoad[1] < 50
    );
}

