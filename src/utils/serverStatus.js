import config from "../config/index.js";
import {fileURLToPath} from "url";
import os from "os";
import nou from "node-os-utils";
import checkDiskSpace from 'check-disk-space';
import {getCrawlerStatusObj} from "../crawlers/status/crawlerStatus.js";
import {getJikanCacheSize} from "../crawlers/3rdPartyApi/jikanApi.js";
import {getUserStatsCacheSize} from "../data/db/userStatsDbMethods.js";

nou.options.INTERVAL = 10000;

export async function getServerResourcesStatus() {
    try {
        return ({
            now: new Date(),
            server: {
                hostName: os.hostname(),
                upTime: os.uptime() / 60,
                nodeUpTime: process.uptime() / 60,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
            },
            crawlerStatus: getCrawlerStatusObj(),
            cpu: await getCpuStatus(),
            memoryStatus: await getMemoryStatus(),
            diskStatus: await getDiskStatus(),
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getCpuStatus(includeUsage = true) {
    const cpu = nou.cpu;
    const result = {
        count: cpu.count(),
        model: cpu.model(),
        loadAvg: cpu.loadavg(),
        loadAvgTime: cpu.loadavgTime(),
    }
    if (includeUsage) {
        result.usage = await nou.cpu.usage(1000);
        result.free = await nou.cpu.free(1000);
    }
    return result;
}

export function getCpuAverageLoad() {
    return nou.cpu.loadavg();
}

export async function getMemoryStatus(includeAll = true) {
    const memoryStatus = process.memoryUsage();
    Object.keys(memoryStatus).forEach(key => {
        memoryStatus[key] = memoryStatus[key] / (1024 * 1024)
    });
    const result = {
        total: config.crawler.totalMemory,
        used: memoryStatus.rss,
        free: config.crawler.totalMemory - memoryStatus.rss,
        allData: memoryStatus,
    };
    if (includeAll) {
        const memoryStatus_os = await nou.mem.info();
        result.memoryStatus_os = {
            total: memoryStatus_os.totalMemMb,
            used: memoryStatus_os.usedMemMb,
            free: memoryStatus_os.freeMemMb,
        }
        result.memoryStatus_os2 = {
            total: os.totalmem() / (1024 * 1024),
            used: (os.totalmem() - os.freemem()) / (1024 * 1024),
            free: os.freemem() / (1024 * 1024),
        }
        result.cache = {
            jikan: getJikanCacheSize(),
            userStats: getUserStatsCacheSize(),
        }
    }
    return result;
}

export async function getDiskStatus() {
    // const dir = await fs.promises.readdir(path.join('.', 'downloadFiles'));
    // const filesPromise = dir.map(file => fs.promises.stat(path.join('.', 'downloadFiles', file)));
    // const files = (await Promise.allSettled(filesPromise)).map(item => item.value);
    // const filesTotalSize = files.reduce((acc, file) => acc + (file?.size || 0), 0) / (1024 * 1024);

    const filesTotalSize = 0;
    const __filename = fileURLToPath(import.meta.url);
    let diskStatus_os = await checkDiskSpace('/' + (__filename.split('/')[1] || ''));

    return ({
        total: config.diskSpace.totalDiskSpace,
        used: config.diskSpace.defaultUsedDiskSpace + filesTotalSize,
        free: config.diskSpace.totalDiskSpace - (config.diskSpace.defaultUsedDiskSpace + filesTotalSize),
        diskStatus_os: {
            diskPath: diskStatus_os.diskPath,
            total: diskStatus_os.size / (1024 * 1024),
            used: (diskStatus_os.size - diskStatus_os.free) / (1024 * 1024),
            free: diskStatus_os.free / (1024 * 1024),
        },
    });
}