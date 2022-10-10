import getCollection from "../../mongoDB.js";
import {getImageThumbnail} from "../../../utils/sharpImageMethods.js";
import {saveError} from "../../../error/saveError.js";


export async function createThumbnails() {
    let cachedResult = [];
    await createThumbnails_movies(cachedResult);
    await createThumbnails_StaffAndCharacter("staff", cachedResult);
    await createThumbnails_StaffAndCharacter("characters", cachedResult);
    cachedResult = [];
    await createThumbnails_profileImages();
}

export async function createThumbnails_movies(cachedResult) {
    try {
        let totalThumbnailsCreated = 0;
        let badLinks = [];
        let noCreationCounter = 0;
        let moviesCollection = await getCollection('movies');
        while (true) {
            let movies = await moviesCollection.find({
                $or: [
                    {'posters.thumbnail': ''},
                    {'poster_s3.thumbnail': ''},
                    {
                        $and: [
                            {'actorsAndCharacters.image': {$ne: ""}},
                            {'actorsAndCharacters.thumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'actorsAndCharacters.characterData': {$ne: null}},
                            {'actorsAndCharacters.characterData.image': {$ne: ""}},
                            {'actorsAndCharacters.characterData.thumbnail': ''},
                        ],
                    },

                    {
                        $and: [
                            {'staff.directors.image': {$ne: ""}},
                            {'staff.directors.thumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'staff.directors.characterData': {$ne: null}},
                            {'staff.directors.characterData.image': {$ne: ""}},
                            {'staff.directors.characterData.thumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'staff.writers.image': {$ne: ""}},
                            {'staff.writers.thumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'staff.writers.characterData': {$ne: null}},
                            {'staff.writers.characterData.image': {$ne: ""}},
                            {'staff.writers.characterData.thumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'staff.others.image': {$ne: ""}},
                            {'staff.others.thumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'staff.others.characterData': {$ne: null}},
                            {'staff.others.characterData.image': {$ne: ""}},
                            {'staff.others.characterData.thumbnail': ''},
                        ],
                    },
                ],
            }, {
                projection: {
                    posters: 1,
                    poster_s3: 1,
                    actorsAndCharacters: 1,
                    staff: 1,
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
                let actorsAndCharacters = movies[i].actorsAndCharacters;
                let staff = movies[i].staff;

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

                //---------------------------------------
                let rs = await Promise.allSettled([
                    createThumbnails_movies_staffAndCharacters(actorsAndCharacters, badLinks, cachedResult, promiseArray),
                    createThumbnails_movies_staffAndCharacters(staff.directors, badLinks, cachedResult, promiseArray),
                    createThumbnails_movies_staffAndCharacters(staff.writers, badLinks, cachedResult, promiseArray),
                    createThumbnails_movies_staffAndCharacters(staff.others, badLinks, cachedResult, promiseArray),
                ]);
                for (let j = 0; j < rs.length; j++) {
                    counter += (rs[j].value || 0);
                }
                //---------------------------------------

                let pp = Promise.allSettled(promiseArray).then(async () => {
                    await moviesCollection.updateOne({_id: movies[i]._id}, {
                        $set: {
                            posters: movies[i].posters,
                            poster_s3: movies[i].poster_s3,
                            actorsAndCharacters: movies[i].actorsAndCharacters,
                            staff: movies[i].staff,
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

export async function createThumbnails_movies_staffAndCharacters(staffAndCharacters, badLinks, cachedResult) {
    let counter = 0;
    let promiseArray = [];
    for (let i = 0; i < staffAndCharacters.length; i++) {
        if (staffAndCharacters[i].image && !badLinks.includes(staffAndCharacters[i].image) && !staffAndCharacters[i].thumbnail) {
            let prom = createThumbnails_movies_staff(staffAndCharacters[i], badLinks, cachedResult).then(res => {
                counter += res;
            });
            promiseArray.push(prom);
        }
        if (
            staffAndCharacters[i].characterData &&
            staffAndCharacters[i].characterData.image &&
            !badLinks.includes(staffAndCharacters[i].characterData.image) &&
            !staffAndCharacters[i].characterData.thumbnail) {
            let prom = createThumbnails_movies_staff(staffAndCharacters[i].characterData, badLinks, cachedResult).then(res => {
                counter += res;
            });
            promiseArray.push(prom);
        }
    }
    await Promise.allSettled(promiseArray);
    return counter;
}

export async function createThumbnails_movies_staff(staffOrCharacterData, badLinks, cachedResult) {
    let checkCache = cachedResult.find(item => item.url === staffOrCharacterData.image);
    if (checkCache) {
        staffOrCharacterData.thumbnail = checkCache.thumbnailData.dataURIBase64;
        return 1;
    }

    let thumbnailData = await getImageThumbnail(staffOrCharacterData.image, true);
    if (thumbnailData) {
        cachedResult.push({
            url: staffOrCharacterData.image,
            thumbnailData: {
                dataURIBase64: thumbnailData.dataURIBase64,
                fileSize: thumbnailData.fileSize,
            }
        });
        staffOrCharacterData.thumbnail = thumbnailData.dataURIBase64;
        return 1;
    } else {
        badLinks.push(staffOrCharacterData.image);
        return 0;
    }
}

export async function createThumbnails_StaffAndCharacter(collectionName, cachedResult) {
    try {
        let totalThumbnailsCreated = 0;
        let badLinks = [];
        let noCreationCounter = 0;
        let collection = await getCollection(collectionName);
        while (true) {
            let result = await collection.find({
                $or: [
                    {'imageData.thumbnail': ''},
                    {'credits.movieThumbnail': ''},
                    {
                        $and: [
                            {'credits.characterImage': {$exists: true}},
                            {'credits.characterImage': {$ne: ""}},
                            {'credits.characterThumbnail': ''},
                        ],
                    },
                    {
                        $and: [
                            {'credits.actorImage': {$exists: true}},
                            {'credits.actorImage': {$ne: ""}},
                            {'credits.actorThumbnail': ''},
                        ],
                    },
                ],
            }, {
                projection: {
                    imageData: 1,
                    credits: 1,
                }
            }).limit(50).toArray();
            if (result.length === 0) {
                break;
            }

            let counter = 0;
            let promiseArray2 = [];
            for (let i = 0; i < result.length; i++) {
                let imageData = result[i].imageData;
                let credits = result[i].credits;

                let promiseArray = [];
                if (imageData && !imageData.thumbnail && !badLinks.includes(imageData.url)) {
                    let checkCache = cachedResult.find(item => item.url === imageData.url);
                    if (checkCache) {
                        counter++;
                        imageData.thumbnail = checkCache.thumbnailData.dataURIBase64;
                        if (!imageData.size) {
                            imageData.size = checkCache.thumbnailData.fileSize;
                        }
                    } else {
                        let prom = getImageThumbnail(imageData.url, true).then((thumbnailData) => {
                            if (thumbnailData) {
                                cachedResult.push({
                                    url: imageData.url,
                                    thumbnailData: {
                                        dataURIBase64: thumbnailData.dataURIBase64,
                                        fileSize: thumbnailData.fileSize,
                                    }
                                });
                                counter++;
                                imageData.thumbnail = thumbnailData.dataURIBase64;
                                if (!imageData.size) {
                                    imageData.size = thumbnailData.fileSize;
                                }
                            } else {
                                badLinks.push(imageData.url);
                            }
                        });
                        promiseArray.push(prom);
                    }
                }

                for (let j = 0; j < credits.length; j++) {
                    if (credits[j].moviePoster && !badLinks.includes(credits[j].moviePoster) && !credits[j].movieThumbnail) {
                        let checkCache = cachedResult.find(item => item.url === credits[j].moviePoster);
                        if (checkCache) {
                            counter++;
                            credits[j].movieThumbnail = checkCache.thumbnailData.dataURIBase64;
                        } else {
                            let prom = getImageThumbnail(credits[j].moviePoster, true).then((thumbnailData) => {
                                if (thumbnailData) {
                                    cachedResult.push({
                                        url: credits[j].moviePoster,
                                        thumbnailData: {
                                            dataURIBase64: thumbnailData.dataURIBase64,
                                            fileSize: thumbnailData.fileSize,
                                        }
                                    });
                                    counter++;
                                    credits[j].movieThumbnail = thumbnailData.dataURIBase64;
                                } else {
                                    badLinks.push(credits[j].moviePoster);
                                }
                            });
                            promiseArray.push(prom);
                        }
                    }
                    if (collectionName === "staff") {
                        if (credits[j].characterImage && !badLinks.includes(credits[j].characterImage) && !credits[j].characterThumbnail) {
                            let checkCache = cachedResult.find(item => item.url === credits[j].characterImage);
                            if (checkCache) {
                                counter++;
                                credits[j].characterThumbnail = checkCache.thumbnailData.dataURIBase64;
                            } else {
                                let prom = getImageThumbnail(credits[j].characterImage, true).then((thumbnailData) => {
                                    if (thumbnailData) {
                                        cachedResult.push({
                                            url: credits[j].characterImage,
                                            thumbnailData: {
                                                dataURIBase64: thumbnailData.dataURIBase64,
                                                fileSize: thumbnailData.fileSize,
                                            }
                                        });
                                        counter++;
                                        credits[j].characterThumbnail = thumbnailData.dataURIBase64;
                                    } else {
                                        badLinks.push(credits[j].characterImage);
                                    }
                                });
                                promiseArray.push(prom);
                            }
                        }
                    } else {
                        if (credits[j].actorImage && !badLinks.includes(credits[j].actorImage) && !credits[j].actorThumbnail) {
                            let checkCache = cachedResult.find(item => item.url === credits[j].actorImage);
                            if (checkCache) {
                                counter++;
                                credits[j].actorThumbnail = checkCache.thumbnailData.dataURIBase64;
                            } else {
                                let prom = getImageThumbnail(credits[j].actorImage, true).then((thumbnailData) => {
                                    if (thumbnailData) {
                                        cachedResult.push({
                                            url: credits[j].actorImage,
                                            thumbnailData: {
                                                dataURIBase64: thumbnailData.dataURIBase64,
                                                fileSize: thumbnailData.fileSize,
                                            }
                                        });
                                        counter++;
                                        credits[j].actorThumbnail = thumbnailData.dataURIBase64;
                                    } else {
                                        badLinks.push(credits[j].actorImage);
                                    }
                                });
                                promiseArray.push(prom);
                            }
                        }
                    }
                }

                let pp = Promise.allSettled(promiseArray).then(async () => {
                    await collection.updateOne({_id: result[i]._id}, {
                        $set: {
                            imageData: result[i].imageData,
                            credits: result[i].credits,
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

export async function createThumbnails_profileImages() {
    try {
        let totalThumbnailsCreated = 0;
        let badLinks = [];
        let noCreationCounter = 0;
        let collection = await getCollection("users");
        while (true) {
            let result = await collection.find({
                'profileImages.thumbnail': '',
            }, {
                projection: {
                    profileImages: 1,
                }
            }).limit(50).toArray();
            if (result.length === 0) {
                break;
            }

            let counter = 0;
            let promiseArray2 = [];
            for (let i = 0; i < result.length; i++) {
                let profileImages = result[i].profileImages;

                let promiseArray = [];
                for (let j = 0; j < profileImages.length; j++) {
                    if (!badLinks.includes(profileImages[j].url) && !profileImages[j].thumbnail) {
                        let prom = getImageThumbnail(profileImages[j].url, true).then((thumbnailData) => {
                            if (thumbnailData) {
                                counter++;
                                profileImages[j].thumbnail = thumbnailData.dataURIBase64;
                                if (!profileImages[j].size) {
                                    profileImages[j].size = thumbnailData.fileSize;
                                }
                            } else {
                                badLinks.push(profileImages[j].url);
                            }
                        });
                        promiseArray.push(prom);
                    }
                }

                let pp = Promise.allSettled(promiseArray).then(async () => {
                    await collection.updateOne({_id: result[i]._id}, {
                        $set: {
                            profileImages: result[i].profileImages,
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
