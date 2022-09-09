import {
    getGenresFromUserStats,
    getNotComputedUsersId,
    updateComputedFavoriteGenres
} from "../data/db/computeUserData.js";
import {saveError} from "../error/saveError.js";


export default function (agenda) {
    agenda.define("compute users favorite genres", {concurrency: 1}, async (job) => {
        try {
            let result = await computeUsersFavoriteGenres;
            return {status: result};
        } catch (error) {
            saveError(error);
            return {status: 'error'};
        }
    });
}

export async function computeUsersFavoriteGenres() {
    let result = 'ok';
    let promiseArray = [];
    while (true) {
        let users = await getNotComputedUsersId(10);
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
    }
    return result;
}
