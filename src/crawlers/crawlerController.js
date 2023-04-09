import config from "../config/index.js";
import {getCpuAverageLoad, getMemoryStatus} from "../utils/serverStatus.js";
import {removeCrawlerPause, saveCrawlerPause} from "./crawlerStatus.js";

const crawlerMemoryLimit = (config.crawler.memoryLimit || (config.crawler.totalMemory * 0.8)) - 10;

export async function pauseCrawler() {
    let memoryStatus = await getMemoryStatus(false);
    let cpuAverageLoad = getCpuAverageLoad();
    while (memoryStatus.used >= crawlerMemoryLimit || cpuAverageLoad[0] > config.crawler.cpuLimit) {
        saveCrawlerPause();
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

