import config from "../config/index.js";
import Agenda from "agenda";
import {crawler, crawlerCycle} from "../crawlers/crawler.js";
import {updateJikanData} from "../crawlers/3rdPartyApi/jikanApi.js";
import {deleteUnusedFiles} from "../data/cloudStorage.js";
import {checkCrawlerIsDisabledByConfigsDb} from "../config/configsDb.js";
import {saveError} from "../error/saveError.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {resetMoviesMonthView} from "../data/db/userStatsDbMethods.js";

let agenda = new Agenda({
    db: {address: config.dataBases.mongodb.url, collection: 'agendaJobs'},
    processEvery: '1 minute',
});

const jobTypes = Object.freeze(["computeUserJob", "userAnalysisJob", "checkSourceDomains", "youtubeTrailers", "movieRanks", "dbBackup"]);

export async function startAgenda() {
    try {
        agenda.define("start crawler cycle", {
            concurrency: 1,
            priority: "highest",
            shouldSaveResult: true
        }, async (job) => {
            if (!config.crawler.disable && !checkCrawlerIsDisabledByConfigsDb() && (Date.now() - config.serverStartTime > 30 * 60 * 1000)) {
                await removeCompletedJobs();
                await crawlerCycle();
            }
        });

        agenda.define("start crawler", {concurrency: 1, priority: "highest", shouldSaveResult: true}, async (job) => {
            if (!config.crawler.disable && !checkCrawlerIsDisabledByConfigsDb() && (Date.now() - config.serverStartTime > 30 * 60 * 1000)) {
                await removeCompletedJobs();
                await crawler('', {
                    crawlMode: 0,
                    torrentState: "ignore", // dont crawl torrent sources
                });
            }
        });

        agenda.define("start torrent crawler", {
            concurrency: 1,
            priority: "highest",
            shouldSaveResult: true
        }, async (job) => {
            if (!config.crawler.disable && !config.crawler.torrentDisable && !checkCrawlerIsDisabledByConfigsDb() && (Date.now() - config.serverStartTime > 30 * 60 * 1000)) {
                await crawler('', {
                    crawlMode: 0,
                    torrentState: 'only', // only crawl torrent sources
                });
            }
        });

        agenda.define("update jikan data", {concurrency: 1, priority: "high"}, async (job) => {
            if (!config.crawler.disable && !checkCrawlerIsDisabledByConfigsDb() && (Date.now() - config.serverStartTime > 30 * 60 * 1000)) {
                await updateJikanDataJobFunc();
            }
        });

        agenda.define("reset month likes", async (job) => {
            await resetMonthLikesJobFunc();
        });

        agenda.define("remove unused files from s3", async (job) => {
            await removeS3UnusedFilesJobFunc();
        });

        for (let i = 0; i < jobTypes.length; i++) {
            let job = await import("../jobs/" + jobTypes[i] + '.js');
            job.default(agenda);
        }

        await agenda.start();
        await removeCompletedJobs();
        //for more info check https://crontab.guru
        await agenda.every("0 2 * * *", "start crawler cycle", {}, {timezone: "Asia/Tehran"}); //At 02:00.
        await agenda.every("0 */3 * * *", "start crawler", {}, {timezone: "Asia/Tehran"});
        await agenda.every("5-59/10 * * * *", "start torrent crawler", {}, {timezone: "Asia/Tehran"});
        await agenda.every("15 * * * *", "check movie source domains", {}, {timezone: "Asia/Tehran"});// Every hour - **:15
        await agenda.every("0 */12 * * *", "update jikan data", {}, {timezone: "Asia/Tehran"}); //Every day at 12:00 and 24:00
        await agenda.every("30 */12 * * *", "update movie ranks", {}, {timezone: "Asia/Tehran"}); //Every day at 12:30 and 00:30
        await agenda.every("30 11 1 * *", "reset month likes", {}, {timezone: "Asia/Tehran"});
        await agenda.every("0 0 * * 0", "remove unused files from s3", {}, {timezone: "Asia/Tehran"}); //At 00:00 on Sunday.
        await agenda.every("0 1 * * 0", "compute users favorite genres", {}, {timezone: "Asia/Tehran"}); //At 01:00 on Sunday.
        await agenda.every("0 23 * * *", "save total/active users count", {}, {timezone: "Asia/Tehran"}); //At 23:00.
        await agenda.every("0 0 7 * *", "remove server analysis old logs", {}, {timezone: "Asia/Tehran"}); //At 00:00 on day-of-month 7.
        await agenda.every("0 */8 * * *", "add trailers from youtube", {}, {timezone: "Asia/Tehran"}); //Every 8 hours
        await agenda.every("0 */8 * * *", "backup db", {}, {timezone: "Asia/Tehran"}); //Every 8 hours

    } catch (error) {
        saveError(error);
    }
}

async function removeCompletedJobs() {
    try {
        await agenda.cancel({nextRunAt: null, failedAt: null});
    } catch (error) {
        saveError(error);
    }
}


export async function updateJikanDataJobFunc() {
    updateCronJobsStatus('updateJikanData', 'start');
    await removeCompletedJobs();
    await updateJikanData(true);
    updateCronJobsStatus('updateJikanData', 'end');
}

export async function resetMonthLikesJobFunc() {
    updateCronJobsStatus('resetMonthLikes', 'start');
    await resetMoviesMonthView();
    updateCronJobsStatus('resetMonthLikes', 'end');
}

export async function removeS3UnusedFilesJobFunc() {
    updateCronJobsStatus('removeS3UnusedFiles', 'start');
    await deleteUnusedFiles();
    updateCronJobsStatus('removeS3UnusedFiles', 'end');
}

//----------------------------------------------------------
//----------------------------------------------------------

export default agenda;

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);

async function graceful() {
    try {
        await agenda.stop();
        process.exit(0);
    } catch (error) {
    }
}
