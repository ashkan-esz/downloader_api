import config from "../config/index.js";
import {resetMonthLikeAndViewDB} from "../data/db/crawlerMethodsDB.js";
import Agenda from "agenda";
import {crawler, crawlerCycle} from "../crawlers/crawler.js";
import {updateImdbData} from "../crawlers/3rdPartyApi/imdbApi.js";
import {updateJikanData} from "../crawlers/3rdPartyApi/jikanApi.js";
import {deleteUnusedFiles} from "../data/cloudStorage.js";
import {saveError} from "../error/saveError.js";

let agenda = new Agenda({
    db: {address: config.databaseURL, collection: 'agendaJobs'},
    processEvery: '1 minute',
});

const jobTypes = ["email", "computeUserJob", "userAnalysisJob"];

export async function startAgenda() {
    try {
        agenda.define("start crawler cycle", {
            concurrency: 1,
            priority: "highest",
            shouldSaveResult: true
        }, async (job) => {
            if (!config.crawler.disable) {
                await removeCompletedJobs();
                await crawlerCycle();
            }
        });

        agenda.define("start crawler", {concurrency: 1, priority: "highest", shouldSaveResult: true}, async (job) => {
            if (!config.crawler.disable) {
                await removeCompletedJobs();
                await crawler('', {crawlMode: 0});
            }
        });

        agenda.define("update jikan/imdb data", {concurrency: 1, priority: "high"}, async (job) => {
            if (!config.crawler.disable) {
                await removeCompletedJobs();
                await Promise.allSettled([
                    updateImdbData(),
                    updateJikanData(),
                ]);
            }
        });

        agenda.define("reset month likes", async (job) => {
            await resetMonthLikeAndViewDB();
        });

        agenda.define("remove unused files from s3", async (job) => {
            await deleteUnusedFiles();
        });

        for (let i = 0; i < jobTypes.length; i++) {
            let job = await import("../jobs/" + jobTypes[i] + '.js');
            job.default(agenda);
        }

        await agenda.start();
        await removeCompletedJobs();
        //for more info check https://crontab.guru
        await agenda.every("0 2 * * *", "start crawler cycle", {}); //At 02:00.
        await agenda.every("0 */3 * * *", "start crawler", {}, {timezone: "Asia/Tehran"});
        await agenda.every("0 */12 * * *", "update jikan/imdb data");
        await agenda.every("0 1 1 * *", "reset month likes");
        await agenda.every("0 0 * * 0", "remove unused files from s3"); //At 00:00 on Sunday.
        await agenda.every("0 1 * * 0", "compute users favorite genres"); //At 01:00 on Sunday.
        await agenda.every("0 23 * * *", "save total/active users count"); //At 23:00.

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
