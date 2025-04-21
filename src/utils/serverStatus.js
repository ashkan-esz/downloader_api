import config from "../config/index.js";
import {fileURLToPath} from "url";
import os from "os";
import nou from "node-os-utils";
import checkDiskSpace from 'check-disk-space';
import {getCrawlerStatusObj} from "../crawlers/status/crawlerStatus.js";
import {getJikanCacheSize} from "../crawlers/3rdPartyApi/jikanApi.js";
import {getCronJobsStatus} from "./cronJobsStatus.js";

const interval = 1000; // 1 second
const cpuLimit = getCpuLimit();
let lastMeasure = { time: process.hrtime(), usage: process.cpuUsage() };
const samples = [];
const SAMPLE_WINDOW = 5; // Average over 5 samples
export let averageCpu = 0;
nou.options.INTERVAL = 11000;

schedule();

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
            getCronJobsStatus: await getCronJobsStatus(),
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
        _averageCpu: averageCpu,
    }
    if (includeUsage) {
        result.usage = await nou.cpu.usage(1000);
        result.free = await nou.cpu.free(1000);
    }
    return result;
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
            userStats: {},
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

// Use setImmediate to avoid timer drift
function schedule() {
    logCpuUsage();
    setTimeout(schedule, interval - (performance.now() % interval));
}

function logCpuUsage() {
    const cpu = getCpuUsage();

    samples.push(cpu);
    if (samples.length > SAMPLE_WINDOW) samples.shift();

    averageCpu = samples.reduce((a, b) => a + b, 0) / samples.length;
    // console.log(`Avg CPU (${SAMPLE_WINDOW}s): ${averageCpu.toFixed(2)}%`);
}

function getCpuUsage() {
    const currentTime = process.hrtime();
    const currentUsage = process.cpuUsage();

    // Calculate elapsed time in microseconds
    const elapsedTime =
        (currentTime[0] - lastMeasure.time[0]) * 1e6 + // Seconds to microseconds
        (currentTime[1] - lastMeasure.time[1]) / 1e3;  // Nanoseconds to microseconds

    const elapsedUsage = {
        user: currentUsage.user - lastMeasure.usage.user,
        system: currentUsage.system - lastMeasure.usage.system,
    };

    // Update last measurement
    lastMeasure = { time: currentTime, usage: currentUsage };

    // Calculate CPU percentage relative to the 0.8 CPU limit
    const cpuPercent =
        (elapsedUsage.user + elapsedUsage.system) / (elapsedTime * cpuLimit) * 100;

    return cpuPercent;
}

function getCpuLimit() {
    // Read from environment variable
    // if (process.env.CONTAINER_CPU_LIMIT) {
    //     return parseFloat(process.env.CONTAINER_CPU_LIMIT);
    // }

    return 1;
}