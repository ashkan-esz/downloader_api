import config from "../../config/index.js";
import {getCpuAverageLoad, getMemoryStatus} from "../../utils/serverStatus.js";
import {
    checkForceResume,
    checkForceStopCrawler,
    disableForceResume,
    forceStopCrawler,
    removeCrawlerPause,
    saveCrawlerPause
} from "./crawlerStatus.js";
import {getCrawlerWarningMessages} from "./crawlerWarnings.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";


export const crawlerMemoryLimit = (config.crawler.memoryLimit || (config.crawler.totalMemory * 0.85)) - 20;

let manualPauseStart = 0;
let manualPauseDuration = 0;
let manualPauseUntil = 0;

export function pauseCrawler_manual(duration) {
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

export function resumeCrawler_manual(force) {
    let res = removeCrawlerPause(true, force);
    if (res !== "ok") {
        return res;
    }
    manualPauseStart = 0;
    manualPauseDuration = 0;
    manualPauseUntil = 0;
    return "ok";
}

export function stopCrawler_manual() {
    forceStopCrawler();
    removeCrawlerPause();
    manualPauseStart = 0;
    manualPauseDuration = 0;
    manualPauseUntil = 0;
    return "ok";
}

//--------------------------------------------------------
//--------------------------------------------------------

// let gcCallTime = null;

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
    const startTime = Date.now();
    while (memoryStatus.used >= crawlerMemoryLimit || cpuAverageLoad[0] > config.crawler.cpuLimit) {
        if (Date.now() - startTime > config.crawler.pauseDurationLimit * 60 * 1000) {
            const warningMessages = getCrawlerWarningMessages(config.crawler.pauseDurationLimit);
            await saveCrawlerWarning(warningMessages.crawlerPauseLimit);
            break;
        }
        if (checkForceStopCrawler()) {
            break;
        }
        const pauseReason = memoryStatus.used >= crawlerMemoryLimit
            ? `memory/limit: ${memoryStatus.used.toFixed(0)}/${crawlerMemoryLimit.toFixed(0)} `
            : `cpu/limit: ${cpuAverageLoad[0]}/${config.crawler.cpuLimit}`;
        saveCrawlerPause(pauseReason);
        if (checkForceResume()) {
            disableForceResume();
            break;
        }
        // if (memoryStatus.used >= crawlerMemoryLimit) {
        //     if (gcCallTime && (Date.now() - gcCallTime) > 5 * 1000) {
        //         global.gc?.();
        //         gcCallTime = Date.now();
        //     }
        // }
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
        memoryStatus.used < (config.crawler.totalMemory * 0.6) &&
        cpuAverageLoad[0] < 50 &&
        cpuAverageLoad[1] < 50
    );
}

