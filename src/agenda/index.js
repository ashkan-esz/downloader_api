import config from "../config";
import {resetMonthLikeAndViewDB} from "../data/dbMethods";
import Agenda from "agenda";
import {crawler} from "../crawlers/crawler";
import {updateImdbData} from "../crawlers/3rdPartyApi/imdbApi";
import {updateJikanData} from "../crawlers/3rdPartyApi/jikanApi";
import {saveError} from "../error/saveError";

let agenda = new Agenda({
    db: {address: config.databaseURL, collection: 'agendaJobs'},
    processEvery: '1 minute',
});

const jobTypes = ["email"];

export async function startAgenda() {
    try {
        agenda.define("start crawler", {concurrency: 1, priority: "highest", shouldSaveResult: true}, async (job) => {
            await removeCompletedJobs();
            await crawler('', 0);
        });

        agenda.define("update jikan/imdb data", {concurrency: 1, priority: "high"}, async (job) => {
            await removeCompletedJobs();
            await updateImdbData();
            await updateJikanData();
        });

        agenda.define("reset month likes", async (job) => {
            await resetMonthLikeAndViewDB();
        });

        for (let i = 0; i < jobTypes.length; i++) {
            let job = await import("../jobs/" + jobTypes[i]);
            job.default(agenda);
        }

        await agenda.start();
        await removeCompletedJobs();
        await agenda.every("0 */3 * * *", "start crawler", {}, {timezone: "Asia/Tehran"});
        await agenda.every("0 */12 * * *", "update jikan/imdb data");
        await agenda.every("0 1 1 * *", "reset month likes");

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
