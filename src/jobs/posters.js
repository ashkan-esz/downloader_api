import getCollection from "../data/mongoDB.js";
import {deletePosterFromS3} from "../data/cloudStorage.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";
import mongodb from "mongodb";
import * as axiosUtils from "../crawlers/utils/axiosUtils.js";

export async function removeBadPostersJobFunc() {
    let intervalId = null;
    try {
        updateCronJobsStatus('removeBadPosters', 'start');

        let collection = await getCollection('movies');
        await collection.updateMany({}, {
            $set: {
                checkingPoster: true,
            },
        });

        let stats = {
            moviesWithBadPoster: 0,
            badPostersCounter: 0,
            badS3PostersCounter: 0,
            checkedMovies: 0,
            totalMovies: await collection.count(),
            loopCounter: 0,
            loopSize: 20,
        }

        intervalId = setInterval(() => {
            updateCronJobsStatus('removeBadPosters', JSON.stringify(stats));
        }, 1000);

        while (true) {
            stats.loopCounter++;
            let movies = await collection.find({
                checkingPoster: true,
            }, {
                projection: {
                    posters: 1,
                    poster_s3: 1,
                    poster_wide_s3: 1,
                }
            }).limit(stats.loopSize).toArray();
            if (movies.length === 0) {
                break;
            }

            let promiseArray = [];
            for (let i = 0; i < movies.length; i++) {
                let prom = new Promise(async (resolve, reject) => {
                    const index = i;
                    let updateFields = {};

                    // posters array
                    let postersPromArr = [];
                    for (let j = 0; j < movies[index].posters.length; j++) {
                        const j2 = j;
                        let p = axiosUtils.getFileSize(movies[index].posters[j2].url, {
                            ignoreError: true,
                            timeout: 20 * 1000,
                            errorReturnValue: -1,
                        }).then(res => {
                            movies[index].posters[j2].delete = res === -1;
                            if (res === -1) {
                                stats.badPostersCounter++;
                            }
                        });
                        postersPromArr.push(p);
                    }
                    await Promise.allSettled(postersPromArr);

                    if (movies[index].posters.some(p => p.delete === true)) {
                        movies[index].posters = movies[index].posters.filter(p => !p.delete);
                        movies[index].posters = movies[index].posters.map(p => {
                            delete p.delete;
                            return p;
                        });
                        updateFields.posters = movies[index].posters;
                    }

                    //s3 poster
                    if (movies[index].poster_s3) {
                        let fileSize = await axiosUtils.getFileSize(movies[index].poster_s3.url, {
                            ignoreError: true,
                            timeout: 20 * 1000,
                        });
                        if (fileSize === 0) {
                            await deletePosterFromS3(movies[index].poster_s3.url.split('/').pop());
                            movies[index].poster_s3 = null;
                            updateFields.poster_s3 = null;
                            stats.badS3PostersCounter++;
                        }
                    }

                    //s3 wide poster
                    if (movies[index].poster_wide_s3) {
                        let fileSize = await axiosUtils.getFileSize(movies[index].poster_wide_s3.url, {
                            ignoreError: true,
                            timeout: 20 * 1000,
                        });
                        if (fileSize === 0) {
                            await deletePosterFromS3(movies[index].poster_wide_s3.url.split('/').pop());
                            movies[index].poster_wide_s3 = null;
                            updateFields.poster_wide_s3 = null;
                            stats.badS3PostersCounter++;
                        }
                    }

                    if (Object.keys(updateFields).length > 0) {
                        stats.moviesWithBadPoster++;
                    }
                    await collection.updateOne({_id: new mongodb.ObjectId(movies[index]._id)}, {
                        $set: updateFields,
                        $unset: {
                            checkingPoster: '',
                        }
                    });
                    return resolve();
                });
                promiseArray.push(prom);
            }
            await Promise.allSettled(promiseArray);
            stats.checkedMovies = stats.loopCounter * stats.loopSize;
        }

        clearInterval(intervalId);
        updateCronJobsStatus('removeBadPosters', 'end', JSON.stringify(stats));
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeBadPosters', 'end');
        if (intervalId) {
            clearInterval(intervalId);
        }
        return {status: 'error'};
    }
}
