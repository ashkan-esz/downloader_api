import {getCronJobsStatus, updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";
import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as moviesDbMethods from "../data/db/moviesDbMethods.js";
import PQueue from "p-queue";
import mongodb from "mongodb";


export default function (agenda) {
    agenda.define("update movie ranks", {concurrency: 1}, async (job) => {
        await updateMovieRanksJobFunc();
    });
}

export async function updateMovieRanksJobFunc() {
    try {
        updateCronJobsStatus('updateMovieRanks', 'start');
        let cronJobsStatus = getCronJobsStatus();
        if (cronJobsStatus.find(job => job.jobName === 'updateJikanImdbData')?.running) {
            updateCronJobsStatus('updateMovieRanks', 'end');
            return {status: 'ok'};
        }

        updateCronJobsStatus('updateMovieRanks', 'rank.like');
        await crawlerMethodsDB.resetTempRank();
        await updateRank('like');
        await crawlerMethodsDB.replaceRankWithTempRank('like');
        updateCronJobsStatus('updateMovieRanks', 'rank.like -end');


        updateCronJobsStatus('updateMovieRanks', 'end');
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('updateMovieRanks', 'end');
        return {status: 'error'};
    }
}

async function updateRank(rankField) {
    try {
        const updatePromiseQueue = new PQueue({concurrency: 25});
        let movies = [];
        if (rankField === 'like') {
            movies = await moviesDbMethods.getTopMoviesIdsByLikes();
        }
        for (let i = 0; i < movies.length; i++) {
            const rank = i + 1;
            updatePromiseQueue.add(() => crawlerMethodsDB.updateMovieByIdDB(new mongodb.ObjectId(movies[i].movieId), {tempRank: rank}));
        }
        await updatePromiseQueue.onIdle();
    } catch (error) {
        saveError(error);
    }
}