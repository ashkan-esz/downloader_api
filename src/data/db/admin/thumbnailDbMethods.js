import getCollection from "../../mongoDB.js";
import {getImageThumbnail} from "../../../utils/sharpImageMethods.js";
import {saveError} from "../../../error/saveError.js";
import {updateCronJobsStatus} from "../../../utils/cronJobsStatus.js";
import prisma from "../../prisma.js";
import PQueue from "p-queue";


export async function createThumbnails() {
    updateCronJobsStatus('createThumbnail', 'start');
    updateCronJobsStatus('createThumbnail', 'movies');
    await createThumbnails_movies();
    updateCronJobsStatus('createThumbnail', 'castImages');
    await createThumbnails_castImages();
    updateCronJobsStatus('createThumbnail', 'profileImages');
    await createThumbnails_profileImages();
}

export async function createThumbnails_movies() {
    try {
        let totalThumbnailsCreated = 0;
        let badLinks = [];
        let noCreationCounter = 0;
        let moviesCollection = await getCollection('movies');
        let loopCounter = 0;
        while (true) {
            updateCronJobsStatus('createThumbnail', `movies, checked: ${loopCounter * 50} created: ${totalThumbnailsCreated}`);
            loopCounter++;
            let movies = await moviesCollection.find({
                $or: [
                    {'posters.thumbnail': ''},
                    {'poster_s3.thumbnail': ''},
                ],
            }, {
                projection: {
                    posters: 1,
                    poster_s3: 1,
                }
            }).limit(50).toArray();
            if (movies.length === 0) {
                break;
            }

            let counter = 0;
            let promiseArray2 = [];
            for (let i = 0; i < movies.length; i++) {
                let posters = movies[i].posters;
                let poster_s3 = movies[i].poster_s3;

                let promiseArray = [];
                for (let j = 0; j < posters.length; j++) {
                    if (!badLinks.includes(posters[j].url) && !posters[j].thumbnail) {
                        let prom = getImageThumbnail(posters[j].url, true).then((thumbnailData) => {
                            if (thumbnailData) {
                                counter++;
                                posters[j].thumbnail = thumbnailData.dataURIBase64;
                                if (!posters[j].size) {
                                    posters[j].size = thumbnailData.fileSize;
                                }
                            } else {
                                badLinks.push(posters[j].url);
                            }
                        });
                        promiseArray.push(prom);
                    }
                }

                if (poster_s3 && !poster_s3.thumbnail && !badLinks.includes(poster_s3.url)) {
                    let prom = getImageThumbnail(poster_s3.url, true).then((thumbnailData) => {
                        if (thumbnailData) {
                            counter++;
                            poster_s3.thumbnail = thumbnailData.dataURIBase64;
                            if (!poster_s3.size) {
                                poster_s3.size = thumbnailData.fileSize;
                            }
                        } else {
                            badLinks.push(poster_s3.url);
                        }
                    });
                    promiseArray.push(prom);
                }

                let pp = Promise.allSettled(promiseArray).then(async () => {
                    await moviesCollection.updateOne({_id: movies[i]._id}, {
                        $set: {
                            posters: movies[i].posters,
                            poster_s3: movies[i].poster_s3,
                        }
                    });
                });
                promiseArray2.push(pp);
            }
            await Promise.allSettled(promiseArray2);
            totalThumbnailsCreated += counter;
            if (counter === 0) {
                noCreationCounter++;
            }
            if (noCreationCounter > 2) {
                break;
            }
        }
        return totalThumbnailsCreated;
    } catch (error) {
        saveError(error);
    }
}

export async function createThumbnails_castImages() {
    try {
        let totalThumbnailsCreated = 0;
        let badLinks = [];
        let noCreationCounter = 0;
        let loopCounter = 0;
        const promiseQueue = new PQueue({concurrency: 20});

        while (true) {
            updateCronJobsStatus('createThumbnail', `castImages, checked: ${loopCounter * 50} created: ${totalThumbnailsCreated}`);
            loopCounter++;
            let castImages = await prisma.castImage.findMany({
                where: {
                    thumbnail: '',
                },
                take: 50,
            });
            if (castImages.length === 0) {
                break;
            }

            let counter = 0;
            for (let i = 0; i < castImages.length; i++) {
                if (!badLinks.includes(castImages[i].url) && !castImages[i].thumbnail) {
                    promiseQueue.add(() => getImageThumbnail(castImages[i].url, true).then(async (thumbnailData) => {
                        if (thumbnailData) {
                            counter++;
                            castImages[i].thumbnail = thumbnailData.dataURIBase64;
                            if (!castImages[i].size) {
                                castImages[i].size = thumbnailData.fileSize;
                            }
                            await prisma.castImage.update({
                                where: {
                                    url: castImages[i].url,
                                },
                                data: {
                                    thumbnail: castImages[i].thumbnail,
                                    size: castImages[i].size,
                                },
                                select: {
                                    thumbnail: true,
                                }
                            });
                        } else {
                            badLinks.push(castImages[i].url);
                        }
                    }));
                }
            }
            await promiseQueue.onIdle();
            totalThumbnailsCreated += counter;
            if (counter === 0) {
                noCreationCounter++;
            }
            if (noCreationCounter > 2) {
                break;
            }
        }
        await promiseQueue.onIdle();
        return totalThumbnailsCreated;
    } catch (error) {
        saveError(error);
    }
}

export async function createThumbnails_profileImages() {
    try {
        let totalThumbnailsCreated = 0;
        let badLinks = [];
        let noCreationCounter = 0;
        const promiseQueue = new PQueue({concurrency: 20});

        while (true) {
            updateCronJobsStatus('createThumbnail', 'profileImages, created: ' + totalThumbnailsCreated);
            let profileImages = await prisma.profileImage.findMany({
                where: {
                    thumbnail: '',
                },
                take: 50,
            });
            if (profileImages.length === 0) {
                break;
            }

            let counter = 0;
            for (let i = 0; i < profileImages.length; i++) {
                if (!badLinks.includes(profileImages[i].url) && !profileImages[i].thumbnail) {
                    promiseQueue.add(() => getImageThumbnail(profileImages[i].url, true).then(async (thumbnailData) => {
                        if (thumbnailData) {
                            counter++;
                            profileImages[i].thumbnail = thumbnailData.dataURIBase64;
                            if (!profileImages[i].size) {
                                profileImages[i].size = thumbnailData.fileSize;
                            }
                            await prisma.profileImage.update({
                                where: {
                                    url: profileImages[i].url,
                                },
                                data: {
                                    thumbnail: profileImages[i].thumbnail,
                                    size: profileImages[i].size,
                                },
                                select: {
                                    thumbnail: true,
                                }
                            });
                        } else {
                            badLinks.push(profileImages[i].url);
                        }
                    }));
                }
            }
            await promiseQueue.onIdle();
            totalThumbnailsCreated += counter;
            if (counter === 0) {
                noCreationCounter++;
            }
            if (noCreationCounter > 2) {
                break;
            }
        }
        await promiseQueue.onIdle();
        return totalThumbnailsCreated;
    } catch (error) {
        saveError(error);
    }
}
