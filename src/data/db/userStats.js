import mongodb from "mongodb";
import getCollection, {getSession} from "../mongoDB.js";
import * as dbMethods from "../dbMethods.js";
import {saveError} from "../../error/saveError.js";
import {getLookupOnMoviesStage} from "../dbMethods.js";
import {userStats} from "../../models/movie.js";
import {userStats_character} from "../../models/character.js";
import {userStats_staff} from "../../models/person.js";

const bucketSizePerArray = 1000;

//todo : fix/add feature score

export async function handleRemoveUserStatsTransaction(userId, statType, id, retryCounter = 0) {
    const collectionName = 'userStats';
    const session = await getSession();
    try {
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: {level: 'local'},
            writeConcern: {w: 'majority'}
        };

        let internalResult;

        const transactionResults = await session.withTransaction(async () => {

            let removeResult = await removeUserStatDB(collectionName, userId, statType, id, {session});
            if (removeResult === 'error' || removeResult === 'notfound') {
                //error on removing movie from user list
                internalResult = removeResult;
                return;
            }

            const statCounterField = `${statType}_count`;
            const relatedCollection = statType.includes('staff') ? 'staff' : statType.includes('character') ? 'characters' : 'movies';
            let statUpdateResult = await dbMethods.changeUserStatOnRelatedCollection(
                relatedCollection, id, statCounterField, -1, '', 0, {session}, retryCounter);
            internalResult = statUpdateResult; //'error' | 'notfound' | 'ok'
            //'notfound' --> movieId exist in user list but movie doesnt exist
            if (statUpdateResult === 'error') {
                //error on reducing movie like/dislike number
                await session.abortTransaction();
            }

        }, transactionOptions);

        await session.endSession();
        if (internalResult === 'error' && retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            internalResult = await handleRemoveUserStatsTransaction(userId, statType, id, retryCounter);
        }
        return internalResult;
    } catch (error) {
        saveError(error);
        await session.endSession();
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            return await handleRemoveUserStatsTransaction(userId, statType, id, retryCounter);
        }
        return 'error';
    }
}

export async function handleAddUserStatsTransaction(userId, statType, id, retryCounter = 0) {
    const collectionName = 'userStats';
    const session = await getSession();
    try {
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: {level: 'local'},
            writeConcern: {w: 'majority'}
        };

        let internalResult;

        const transactionResults = await session.withTransaction(async () => {

            const statCounterField = `${statType}_count`;
            let statCounterField2 = ''; //use for transformation between like/dislike

            //handle like/dislike
            if (statType.includes('like')) {
                let statType2 = statType.includes('dislike')
                    ? statType.replace('dislike', 'like')
                    : statType.replace('like', 'dislike');
                let checkStatExist = await checkUserStatExist_likeOrDislike(collectionName, userId, id, statType, statType2, {session});
                if (checkStatExist && checkStatExist[statType] === true) {
                    //already liked/disliked
                    internalResult = 'already exist';
                    return;
                } else if (checkStatExist && checkStatExist[statType2] === true) {
                    //fix conflict between prev state (like/dislike)
                    statCounterField2 = statType2 + '_count';
                    let removeResult = await removeUserStatDB(collectionName, userId, statType2, id, {session});
                    if (removeResult === 'error') {
                        internalResult = 'error';
                        return;
                    }
                }
            } else {
                //todo : check a way to insert to array if not exist (check its not full and exist)
                let checkLikeExist = await checkUserStatExist(collectionName, userId, statType, id, {session});
                if (checkLikeExist) {
                    //already saved this movie
                    internalResult = 'already exist';
                    return;
                }
            }

            let result = await addUserStatDB(collectionName, userId, statType, id, {session}, retryCounter);
            if (result === 'error') {
                await session.abortTransaction();
                internalResult = 'error';
                return;
            }

            const relatedCollection = statType.includes('staff') ? 'staff' : statType.includes('character') ? 'characters' : 'movies';
            let statUpdateResult = await dbMethods.changeUserStatOnRelatedCollection(
                relatedCollection, id, statCounterField, 1, statCounterField2, -1, {session}, retryCounter);
            //notfound --> movie doesnt exist
            internalResult = statUpdateResult;
            if (statUpdateResult === 'error' || statUpdateResult === 'notfound') {
                await session.abortTransaction();
            }

        }, transactionOptions);

        await session.endSession();
        if (internalResult === 'error' && retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            internalResult = await handleAddUserStatsTransaction(userId, statType, id, retryCounter);
        }
        return internalResult;
    } catch (error) {
        saveError(error);
        await session.endSession();
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            return await handleAddUserStatsTransaction(userId, statType, id, retryCounter);
        }
        return 'error';
    }
}

export async function checkUserStatExist(collectionName, userId, statType, id, opts = {}) {
    try {
        let collection = await getCollection(collectionName);
        return await collection.findOne({
            userId: new mongodb.ObjectId(userId),
            [statType]: new mongodb.ObjectId(id)
        }, {
            projection: {pageNumber: 1},
            ...opts,
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function checkUserStatExist_likeOrDislike(collectionName, userId, id, statType, statType2, opts = {}) {
    try {
        id = new mongodb.ObjectId(id);
        let collection = await getCollection(collectionName);

        let aggregationPipeline = [
            {
                $match: {
                    userId: new mongodb.ObjectId(userId),
                    $or: [
                        {[statType]: id},
                        {[statType2]: id}
                    ]
                }
            },
            {
                $limit: 1,
            },
            {
                $addFields: {
                    [statType]: {$cond: [{$in: [id, `$${statType}`]}, true, false]},
                    [statType2]: {$cond: [{$in: [id, `$${statType2}`]}, true, false]}
                }
            },
            {
                $project: {
                    pageNumber: 1,
                    [statType]: 1,
                    [statType2]: 1,
                }
            },
        ];

        let result = await collection.aggregate(aggregationPipeline).toArray();
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function addUserStatDB(collectionName, userId, statType, id, opts = {}, retryCounter) {
    try {
        let collection = await getCollection(collectionName);
        const statCounterField = `${statType}_count`;

        let firstBucketWithSpace = await collection.find({
            userId: new mongodb.ObjectId(userId),
            [statCounterField]: {$lt: bucketSizePerArray}
        }, {
            projection: {pageNumber: 1}
        }).sort({pageNumber: 1}).limit(1).toArray();

        if (firstBucketWithSpace.length > 0) {
            let updateResult = await collection.updateOne({
                _id: firstBucketWithSpace[0]._id,
            }, {
                $push: {
                    [statType]: new mongodb.ObjectId(id),
                },
                $inc: {
                    [statCounterField]: 1,
                }
            }, opts);
        } else {
            //need new bucket
            let lastBucket = await getLastBucket(collection, userId, statCounterField, opts);
            let nextBucketNumber = lastBucket.length > 0 ? lastBucket[0].pageNumber + 1 : 1;
            const statsObject = createUserStatsObject(userId, nextBucketNumber);
            statsObject[statType] = [new mongodb.ObjectId(id)];
            statsObject[statCounterField] = 1;
            await collection.insertOne(statsObject, opts);
        }
        return 'ok';
    } catch (error) {
        if (
            retryCounter !== 0 ||
            error.message !== 'WriteConflict error: this operation conflicted with another operation. Please retry your operation or multi-document transaction.') {
            saveError(error);
        }
        return 'error';
    }
}

export function createUserStatsObject(userId, pageNumber) {
    return ({
        userId: new mongodb.ObjectId(userId),
        pageNumber: pageNumber,
        //like,dislike
        like_movie: [],
        like_movie_count: 0,
        dislike_movie: [],
        dislike_movie_count: 0,
        like_staff: [],
        like_staff_count: 0,
        dislike_staff: [],
        dislike_staff_count: 0,
        like_character: [],
        like_character_count: 0,
        dislike_character: [],
        dislike_character_count: 0,
        //follow
        follow_movie: [],
        follow_movie_count: 0,
        follow_staff: [],
        follow_staff_count: 0,
        //others
        save: [],
        save_count: 0,
        future_list: [],
        future_list_count: 0,
        dropped: [],
        dropped_count: 0,
        finished: [],
        finished_count: 0,
        score: [],
        score_count: 0,
    });
}

export async function removeUserStatDB(collectionName, userId, statType, id, opts = {}) {
    try {
        let collection = await getCollection(collectionName);
        const statCounterField = `${statType}_count`;
        let updateResult = await collection.updateOne({
            userId: new mongodb.ObjectId(userId),
            [statType]: new mongodb.ObjectId(id)
        }, {
            $pull: {
                [statType]: new mongodb.ObjectId(id),
            },
            $inc: {
                [statCounterField]: -1,
            }
        }, opts);

        if (updateResult.modifiedCount === 0) {
            return 'notfound';
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeUserStatsBucketsAll(userId) {
    try {
        const collectionName = 'userStats';
        let collection = await getCollection(collectionName);
        let result = await collection.deleteMany({userId: new mongodb.ObjectId(userId)});
        return result.value;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getUserStatsListDB(userId, statType, skip, limit, projection) {
    try {
        const collectionName = 'userStats';
        let collection = await getCollection(collectionName);
        const relatedCollection = statType.includes('staff')
            ? 'staff'
            : statType.includes('character') ? 'characters' : 'movies';
        const statCounterField = `${statType}_count`;

        let lastBucketNumber = 1;
        let bucketNumberSkip = 0;
        if (skip > bucketSizePerArray) {
            let lastBucket = await getLastBucket(collection, userId, statCounterField);
            lastBucketNumber = lastBucket[0].pageNumber;
            let lastBucketItemsCount = lastBucket[0][statCounterField];
            skip -= lastBucketItemsCount;
            bucketNumberSkip = Math.floor(skip / bucketSizePerArray) + 1;
            skip = skip % bucketSizePerArray;
        }
        let bucketNumberLimit = Math.floor((skip + limit) / bucketSizePerArray) + 1;

        //--------------------------------------
        let stats;
        if (statType.includes('staff')) {
            stats = Object.keys((projection && projection.userStats) || userStats_staff);
        } else if (statType.includes('character')) {
            stats = Object.keys((projection && projection.userStats) || userStats_character);
        } else {
            stats = Object.keys((projection && projection.userStats) || userStats);
        }
        //--------------------------------------

        let aggregationPipeline = [
            {
                $match: {
                    userId: new mongodb.ObjectId(userId),
                    pageNumber: {$lte: lastBucketNumber}
                }
            },
            {
                $sort: {
                    pageNumber: -1
                }
            },
            {
                $skip: bucketNumberSkip,
            },
            {
                $limit: bucketNumberLimit,
            },
            {
                $unwind: `$${statType}`
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnMoviesStage(relatedCollection, statType, projection),
            {
                $addFields: {
                    data: {$arrayElemAt: ['$data', 0]},
                }
            },
            userStatsList_addFieldsPipeline(stats, statType, '$data._id'),
            {
                $replaceRoot: {
                    newRoot: "$data",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

function userStatsList_addFieldsPipeline(stats, statType, id) {
    let addStatFieldsArray = {
        $addFields: {}
    };
    for (let i = 0; i < stats.length; i++) {
        let stat = stats[i].replace('_count', '');
        if (stat === statType) {
            addStatFieldsArray["$addFields"][`data.userStats.${stat}`] = true;
        } else {
            addStatFieldsArray["$addFields"][`data.userStats.${stat}`] = {
                $cond: [{$in: [id, `$${stat}`]}, true, false]
            }
        }
    }
    return addStatFieldsArray;
}

export async function getLastBucket(collection, userId, statCounterField, opts = {}) {
    return await collection.find({
            userId: new mongodb.ObjectId(userId),
            [statCounterField]: {$ne: 0}
        },
        {
            projection: {pageNumber: 1, [statCounterField]: 1},
            ...opts
        })
        .sort({pageNumber: -1})
        .limit(1)
        .toArray();
}
