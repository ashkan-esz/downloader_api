import getCollection from "../data/mongoDB.js";
import prisma from "../data/prisma.js";
import PQueue from "p-queue";
import {deletePosterFromS3, deleteTrailerFromS3, removeProfileImageFromS3} from "../data/cloudStorage.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";

export async function removeS3PosterJobFunc() {
    try {
        updateCronJobsStatus('removeS3Poster', 'start');

        let removedCounter = 0;
        const promiseQueue = new PQueue({concurrency: 60});
        const collection = await getCollection('movies');
        while (true) {
            updateCronJobsStatus('removeS3Poster', 'posters, removed: ' + removedCounter);
            let movies = await collection.find({
                poster_s3: {$ne: null},
            }, {
                projection: {
                    posters: 1,
                    poster_s3: 1,
                }
            }).limit(150).toArray();
            if (movies.length === 0) {
                break;
            }

            for (let i = 0; i < movies.length; i++) {
                promiseQueue.add(() => deletePosterFromS3(movies[i].poster_s3.url.split('/').pop()).then(async () => {
                    let newPosters = movies[i].posters.filter(item => !item.info.includes('s3Poster'));
                    await collection.updateOne({_id: movies[i]._id}, {
                        $set: {
                            posters: newPosters,
                            poster_s3: null,
                        }
                    });
                    removedCounter++;
                    updateCronJobsStatus('removeS3Poster', 'posters, removed: ' + removedCounter);
                }));
            }
            await promiseQueue.onSizeLessThan(150);
        }
        await promiseQueue.onIdle();
        updateCronJobsStatus('removeS3Poster', 'end', removedCounter.toString());
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeS3Poster', 'end');
        return {status: 'error'};
    }
}

export async function removeS3WidePosterJobFunc() {
    try {
        updateCronJobsStatus('removeS3WidePoster', 'start');

        let removedCounter = 0;
        const promiseQueue = new PQueue({concurrency: 60});
        const collection = await getCollection('movies');
        while (true) {
            updateCronJobsStatus('removeS3WidePoster', 'widePosters, removed: ' + removedCounter);
            let movies = await collection.find({
                poster_wide_s3: {$ne: null},
            }, {
                projection: {
                    poster_wide_s3: 1,
                }
            }).limit(150).toArray();
            if (movies.length === 0) {
                break;
            }

            for (let i = 0; i < movies.length; i++) {
                promiseQueue.add(() => deletePosterFromS3(movies[i].poster_wide_s3.url.split('/').pop()).then(async () => {
                    await collection.updateOne({_id: movies[i]._id}, {
                        $set: {
                            poster_wide_s3: null,
                        }
                    });
                    removedCounter++;
                    updateCronJobsStatus('removeS3WidePoster', 'widePosters, removed: ' + removedCounter);
                }));
            }
            await promiseQueue.onSizeLessThan(150);
        }
        await promiseQueue.onIdle();
        updateCronJobsStatus('removeS3WidePoster', 'end', removedCounter.toString());
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeS3WidePoster', 'end');
        return {status: 'error'};
    }
}

export async function removeS3TrailerJobFunc() {
    try {
        updateCronJobsStatus('removeS3Trailer', 'start');

        let removedCounter = 0;
        const promiseQueue = new PQueue({concurrency: 60});
        const collection = await getCollection('movies');
        while (true) {
            updateCronJobsStatus('removeS3Trailer', 'trailers, removed: ' + removedCounter);
            let movies = await collection.find({
                trailer_s3: {$ne: null},
            }, {
                projection: {
                    trailers: 1,
                    trailer_s3: 1,
                    trailerDate: 1,
                }
            }).limit(150).toArray();
            if (movies.length === 0) {
                break;
            }

            for (let i = 0; i < movies.length; i++) {
                promiseQueue.add(() => deleteTrailerFromS3(movies[i].trailer_s3.url.split('/').pop()).then(async () => {
                    let newTrailers = movies[i].trailers.filter(item => !item.info.includes('s3Trailer'));
                    let trailerDate = newTrailers.length === 0 ? 0 : movies[i].trailerDate;
                    await collection.updateOne({_id: movies[i]._id}, {
                        $set: {
                            trailers: newTrailers,
                            trailer_s3: null,
                            trailerDate: trailerDate,
                        }
                    });
                    removedCounter++;
                    updateCronJobsStatus('removeS3Trailer', 'trailers, removed: ' + removedCounter);
                }));
            }
            await promiseQueue.onSizeLessThan(150);
        }
        await promiseQueue.onIdle();
        updateCronJobsStatus('removeS3Trailer', 'end', removedCounter.toString());
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeS3Trailer', 'end');
        return {status: 'error'};
    }
}

export async function removeS3ProfileImageJobFunc() {
    try {
        updateCronJobsStatus('removeS3ProfileImage', 'start');

        let removedCounter = 0;
        const promiseQueue = new PQueue({concurrency: 60});

        while (true) {
            updateCronJobsStatus('removeS3ProfileImage', 'profileImages, removed: ' + removedCounter);
            let profileImages = await prisma.profileImage.findMany({
                where: {},
                take: 150,
                select: {
                    url: true,
                    userId: true,
                }
            });
            if (profileImages.length === 0) {
                break;
            }

            for (let i = 0; i < profileImages.length; i++) {
                promiseQueue.add(() => removeProfileImageFromS3(profileImages[i].url.split('/').pop()).then(async () => {
                    await prisma.profileImage.delete({
                        where: {
                            url: profileImages[i].url,
                        }
                    });
                    removedCounter++;
                    updateCronJobsStatus('removeS3ProfileImage', 'profileImages, removed: ' + removedCounter);
                }));
            }
            await promiseQueue.onSizeLessThan(150);
        }
        await promiseQueue.onIdle();
        updateCronJobsStatus('removeS3ProfileImage', 'end', removedCounter.toString());
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeS3ProfileImage', 'end');
        return {status: 'error'};
    }
}