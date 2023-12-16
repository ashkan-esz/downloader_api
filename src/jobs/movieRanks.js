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
        if (cronJobsStatus.find(job => job.jobName === 'updateJikanData')?.running) {
            updateCronJobsStatus('updateMovieRanks', 'end');
            return {status: 'ok'};
        }

        updateCronJobsStatus('updateMovieRanks', 'rank.like');
        await crawlerMethodsDB.resetTempRank();
        await updateRank('like');
        await crawlerMethodsDB.replaceRankWithTempRank('like');
        updateCronJobsStatus('updateMovieRanks', 'rank.like -end');

        updateCronJobsStatus('updateMovieRanks', 'rank.like_month');
        await crawlerMethodsDB.resetTempRank();
        await updateRank('like_month');
        await crawlerMethodsDB.replaceRankWithTempRank('like_month');
        updateCronJobsStatus('updateMovieRanks', 'rank.like_month -end');

        updateCronJobsStatus('updateMovieRanks', 'rank.follow_month');
        await crawlerMethodsDB.resetTempRank();
        await updateRank('follow_month');
        await crawlerMethodsDB.replaceRankWithTempRank('follow_month');
        updateCronJobsStatus('updateMovieRanks', 'rank.follow_month -end');

        updateCronJobsStatus('updateMovieRanks', 'rank.view_month');
        await crawlerMethodsDB.resetTempRank();
        await updateRank('view_month');
        await crawlerMethodsDB.replaceRankWithTempRank('view_month');
        updateCronJobsStatus('updateMovieRanks', 'rank.view_month -end');

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
        const updatePromiseQueue = new PQueue({concurrency: 300});
        let movies = [];
        if (rankField === 'like') {
            movies = await moviesDbMethods.getTopMoviesIdsByLikes();
        } else if (rankField === 'like_month') {
            movies = await moviesDbMethods.getTopMoviesIdsByLikeMonth();
        } else if (rankField === 'follow_month') {
            movies = await moviesDbMethods.getTopMoviesIdsByFollowMonth();
        } else if (rankField === 'view_month') {
            movies = await moviesDbMethods.getTopMoviesIdsByViewMonth();
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