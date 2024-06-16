import getCollection from "../data/mongoDB.js";
import {deleteTrailerFromS3} from "../data/cloudStorage.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";
import mongodb from "mongodb";
import * as axiosUtils from "../crawlers/utils/axiosUtils.js";

export async function removeBadTrailersJobFunc() {
    let intervalId = null;
    try {
        updateCronJobsStatus('removeBadTrailers', 'start');

        let collection = await getCollection('movies');
        await collection.updateMany({}, {
            $set: {
                checkingTrailer: true,
            },
        });

        let stats = {
            moviesWithBadTrailer: 0,
            badTrailersCounter: 0,
            badS3TrailersCounter: 0,
            checkedMovies: 0,
            totalMovies: await collection.count(),
            loopCounter: 0,
            loopSize: 30,
        }

        intervalId = setInterval(() => {
            updateCronJobsStatus('removeBadTrailers', JSON.stringify(stats));
        }, 1000);

        while (true) {
            stats.loopCounter++;
            let movies = await collection.find({
                checkingTrailer: true,
            }, {
                projection: {
                    trailers: 1,
                    trailer_s3: 1,
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

                    // trailers array
                    let trailersPromArr = [];
                    for (let j = 0; j < movies[index].trailers.length; j++) {
                        if (movies[index].trailers[j].vpnStatus === "noVpn") {
                            continue;
                        }
                        const j2 = j;
                        let p = axiosUtils.getFileSize(movies[index].trailers[j2].url, {
                            ignoreError: true,
                            timeout: 20 * 1000,
                            errorReturnValue: -1,
                        }).then(res => {
                            movies[index].trailers[j2].delete = res === -1;
                            if (res === -1) {
                                stats.badTrailersCounter++;
                            }
                        });
                        trailersPromArr.push(p);
                    }
                    await Promise.allSettled(trailersPromArr);

                    if (movies[index].trailers.some(p => p.delete === true)) {
                        movies[index].trailers = movies[index].trailers.filter(p => !p.delete);
                        movies[index].trailers = movies[index].trailers.map(p => {
                            delete p.delete;
                            return p;
                        });
                        updateFields.trailers = movies[index].trailers;
                    }

                    //s3 trailer
                    if (movies[index].trailer_s3 && movies[index].trailer_s3.vpnStatus !== "noVpn") {
                        let fileSize = await axiosUtils.getFileSize(movies[index].trailer_s3.url, {
                            ignoreError: true,
                            timeout: 20 * 1000,
                        });
                        if (fileSize === 0) {
                            await deleteTrailerFromS3(movies[index].trailer_s3.url.split('/').pop());
                            movies[index].trailer_s3 = null;
                            updateFields.trailer_s3 = null;
                            stats.badS3TrailersCounter++;
                        }
                    }

                    if (Object.keys(updateFields).length > 0) {
                        stats.moviesWithBadTrailer++;
                    }
                    await collection.updateOne({_id: new mongodb.ObjectId(movies[index]._id)}, {
                        $set: updateFields,
                        $unset: {
                            checkingTrailer: '',
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
        updateCronJobsStatus('removeBadTrailers', 'end', JSON.stringify(stats));
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeBadTrailers', 'end');
        if (intervalId) {
            clearInterval(intervalId);
        }
        return {status: 'error'};
    }
}
