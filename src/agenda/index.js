import config from "../config/index.js";
import {resetMonthLikeAndViewDB} from "../data/dbMethods.js";
import Agenda from "agenda";
import {crawler} from "../crawlers/crawler.js";
import {updateImdbData} from "../crawlers/3rdPartyApi/imdbApi.js";
import {updateJikanData} from "../crawlers/3rdPartyApi/jikanApi.js";
import {deleteUnusedFiles} from "../data/cloudStorage.js";
import {saveError} from "../error/saveError.js";

let agenda = new Agenda({
    db: {address: config.databaseURL, collection: 'agendaJobs'},
    processEvery: '1 minute',
});

const jobTypes = ["email", "computeUserJob"];

export async function startAgenda() {
    try {
        agenda.define("start crawler", {concurrency: 1, priority: "highest", shouldSaveResult: true}, async (job) => {
            if (config.disableCrawler !== 'true') {
                await removeCompletedJobs();
                await crawler('', 0);
            }
        });

        agenda.define("update jikan/imdb data", {concurrency: 1, priority: "high"}, async (job) => {
            if (config.disableCrawler !== 'true') {
                await removeCompletedJobs();
                await updateImdbData();
                await updateJikanData();
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
        await agenda.every("0 */3 * * *", "start crawler", {}, {timezone: "Asia/Tehran"});
        await agenda.every("0 */12 * * *", "update jikan/imdb data");
        await agenda.every("0 1 1 * *", "reset month likes");
        await agenda.every("0 0 * * 0", "remove unused files from s3"); //At 00:00 on Sunday.
        await agenda.every("0 1 * * 0", "compute users favorite genres"); //At 01:00 on Sunday.

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
    await agenda.stop();
    process.exit(0);
}
