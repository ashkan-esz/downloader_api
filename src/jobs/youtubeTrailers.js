import config from "../config/index.js";
import {getMoviesWithNoTrailer} from "../data/db/moviesDbMethods.js";
import {updateMovieByIdDB} from "../data/db/crawlerMethodsDB.js";
import {uploadTitleYoutubeTrailerAndAddToTitleModel} from "../crawlers/posterAndTrailer.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";
import {checkIsCrawling} from "../crawlers/status/crawlerStatus.js";
import PQueue from "p-queue";
import {getTrailerFromYoutube} from "../crawlers/3rdPartyApi/googleYoutubeApi.js";
import {checkCrawlerIsDisabledByConfigsDb} from "../config/configsDb.js";


export default function (agenda) {
    agenda.define("add trailers from youtube", {concurrency: 1}, async (job) => {
        if (!config.crawler.disable && !checkCrawlerIsDisabledByConfigsDb() && !checkIsCrawling() && (Date.now() - config.serverStartTime > 30 * 60 * 1000)) {
            await addTrailersFromYoutubeJobFunc();
        }
    });
}

export async function addTrailersFromYoutubeJobFunc() {
    try {
        updateCronJobsStatus('addTrailersFromYoutube', 'start');
        let result = 'ok';
        const _batchCount = 20;
        const promiseQueue = new PQueue({concurrency: 4});

        let loopCounter = 0;
        let notFoundCount = 0;
        let completedCount = 0;
        let runningCounter = 0;
        let checkedTitles = [];
        while (loopCounter < 5) {
            updateCronJobsStatus('addTrailersFromYoutube',
                `running, checked: ${loopCounter * _batchCount}, notFound: ${notFoundCount}, completed: ${completedCount}, running: ${runningCounter}`);
            loopCounter++;
            let movies = await getMoviesWithNoTrailer(['movie', 'serial'], _batchCount);
            if (movies === 'error' || movies.length === 0) {
                if (movies === 'error') {
                    result = 'error';
                }
                break;
            }

            for (let i = 0; i < movies.length; i++) {
                if (checkedTitles.includes(movies[i].title)) {
                    continue;
                } else {
                    checkedTitles.push(movies[i].title);
                }
                if (Number(movies[i].year) < (new Date().getFullYear() - 1)) {
                    continue;
                }
                runningCounter++;
                promiseQueue.add(() => getTrailerFromYoutube(movies[i].title, movies[i].year).then(async (trailerUrl) => {
                        updateCronJobsStatus('addTrailersFromYoutube',
                            `running, checked: ${loopCounter * _batchCount}, notFound: ${notFoundCount}, completed: ${completedCount}, running: ${runningCounter}`);
                        if (trailerUrl) {
                            let updateFields = await uploadTitleYoutubeTrailerAndAddToTitleModel(movies[i], trailerUrl, {});
                            await updateMovieByIdDB(movies[i]._id, updateFields);
                            completedCount++;
                        } else {
                            notFoundCount++;
                        }
                        runningCounter--;
                        updateCronJobsStatus('addTrailersFromYoutube',
                            `running, checked: ${loopCounter * _batchCount}, notFound: ${notFoundCount}, completed: ${completedCount}, running: ${runningCounter}`);
                    })
                )
            }
        }
        await promiseQueue.onIdle();
        updateCronJobsStatus('addTrailersFromYoutube', 'end');
        return {status: result};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('addTrailersFromYoutube', 'end');
        return {status: 'error'};
    }
}
