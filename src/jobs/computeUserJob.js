import {
    getGenresFromUserStats,
    getNotComputedUsersId,
    updateComputedFavoriteGenres
} from "../data/db/computeUserData.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";


export default function (agenda) {
    agenda.define("compute users favorite genres", {concurrency: 1}, async (job) => {
        await computeUsersFavoriteGenresJobFunc();
    });
}

export async function computeUsersFavoriteGenresJobFunc() {
    try {
        updateCronJobsStatus('computeUserFavoriteGenres', 'start');
        let result = 'ok';
        let promiseArray = [];
        const _batchCount = 10;
        let completedCount = 0;
        while (true) {
            updateCronJobsStatus('computeUserFavoriteGenres', 'running', completedCount);
            let users = await getNotComputedUsersId(_batchCount);
            if (users === 'error' || users.length === 0) {
                if (users === 'error') {
                    result = 'error';
                }
                break;
            }

            for (let i = 0; i < users.length; i++) {
                let prom = getGenresFromUserStats(users[i]._id).then(async (genres) => {
                    let temp = await updateComputedFavoriteGenres(users[i]._id, genres);
                    if (temp === 'error') {
                        result = 'error';
                    }
                });
                promiseArray.push(prom);
            }
            await Promise.allSettled(promiseArray);
            promiseArray = [];
            completedCount += _batchCount;
        }
        updateCronJobsStatus('computeUserFavoriteGenres', 'end', completedCount);
        return {status: result};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('computeUserFavoriteGenres', 'end');
        return {status: 'error'};
    }
}
