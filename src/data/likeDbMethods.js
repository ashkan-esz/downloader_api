import mongodb from "mongodb";
import getCollection, {getSession} from "./mongoDB.js";
import * as dbMethods from "./dbMethods.js";
import {saveError} from "../error/saveError.js";


export async function checkMovieLikedOrDisliked(userId, collectionName, id, opts = {}) {
    try {
        let collection = await getCollection(collectionName);
        return await collection.findOne({
            userId: new mongodb.ObjectId(userId),
            likes: new mongodb.ObjectId(id)
        }, {
            projection: {pageNumber: 1, type: 1},
            ...opts,
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function handleRemoveLikeOrDislikeTransaction(userId, docType, id, type, retryCounter = 0) {
    const collectionName = docType + 'LikeBucket';
    const session = await getSession();
    try {
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: {level: 'local'},
            writeConcern: {w: 'majority'}
        };

        let internalResult;

        const transactionResults = await session.withTransaction(async () => {

            let removeResult = await removeLikeOrDislikeDB(userId, collectionName, id, type, {session});
            if (removeResult === 'error' || removeResult === 'notfound') {
                //error on removing movie from user list
                internalResult = removeResult;
                return;
            }

            let likeUpdateResult = await dbMethods.changeMoviesLikeOrDislike(docType, id, type, -1, '', 0, {session});
            internalResult = likeUpdateResult; //'error' | 'notfound' | 'ok'
            //'notfound' --> movieId exist in user list but movie doesnt exist
            if (likeUpdateResult === 'error') {
                //error on reducing movie like/dislike number
                await session.abortTransaction();
            }

        }, transactionOptions);

        await session.endSession();
        if (internalResult === 'error' && retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            internalResult = await handleRemoveLikeOrDislikeTransaction(userId, docType, id, type, retryCounter);
        }
        return internalResult;
    } catch (error) {
        saveError(error);
        await session.endSession();
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            return await handleRemoveLikeOrDislikeTransaction(userId, docType, id, type, retryCounter);
        }
        return 'error';
    }
}

export async function handleLikeOrDislikeTransaction(userId, docType, id, type, retryCounter = 0) {
    const collectionName = docType + 'LikeBucket';
    const session = await getSession();
    try {
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: {level: 'local'},
            writeConcern: {w: 'majority'}
        };

        let internalResult;

        const transactionResults = await session.withTransaction(async () => {

            let oppositeType = '';
            let checkLikeExist = await checkMovieLikedOrDisliked(userId, collectionName, id, {session});
            if (checkLikeExist && checkLikeExist.type === type) {
                //already liked/disliked this movie
                internalResult = 'already exist';
                return;
            } else if (checkLikeExist && checkLikeExist.type !== type) {
                //conflict between prev state (like/dislike)
                oppositeType = type === 'like' ? 'dislike' : 'like';
                let removeResult = await removeLikeOrDislikeDB(userId, collectionName, id, oppositeType, {session});
                if (removeResult === 'error') {
                    internalResult = 'error';
                    return;
                }
            }

            let result = await likeOrDislikeDB(userId, collectionName, id, type, {session});
            if (result === 'error') {
                await session.abortTransaction();
                internalResult = 'error';
                return;
            }

            let likeUpdateResult = await dbMethods.changeMoviesLikeOrDislike(docType, id, type, 1, oppositeType, -1, {session});
            internalResult = likeUpdateResult;
            if (likeUpdateResult === 'error' || likeUpdateResult === 'notfound') {
                //notfound --> movie doesnt exist
                await session.abortTransaction();
            }

        }, transactionOptions);

        await session.endSession();
        if (internalResult === 'error' && retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            internalResult = await handleLikeOrDislikeTransaction(userId, docType, id, type, retryCounter);
        }
        return internalResult;
    } catch (error) {
        saveError(error);
        await session.endSession();
        if (retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
            retryCounter++;
            return await handleLikeOrDislikeTransaction(userId, docType, id, type, retryCounter);
        }
        return 'error';
    }
}

export async function likeOrDislikeDB(userId, collectionName, id, type, opts = {}) {
    try {
        let collection = await getCollection(collectionName);

        let updateResult = await collection.updateOne({
            userId: new mongodb.ObjectId(userId),
            type: type,
            itemCount: {$lt: 10000},
        }, {
            $push: {
                likes: new mongodb.ObjectId(id),
            },
            $inc: {
                itemCount: 1,
            }
        }, opts);

        if (updateResult.modifiedCount === 0) {
            //need new bucket
            let lastBucket = await collection.find({
                    userId: new mongodb.ObjectId(userId),
                    type: type,
                },
                {
                    projection: {pageNumber: 1},
                    ...opts
                }).sort({pageNumber: -1}).limit(1).toArray();
            let nextBucketNumber = lastBucket.length > 0 ? lastBucket[0].pageNumber + 1 : 1;
            await collection.insertOne({
                userId: new mongodb.ObjectId(userId),
                type: type,
                pageNumber: nextBucketNumber,
                itemCount: 1,
                likes: [new mongodb.ObjectId(id)],
            }, opts);
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeLikeOrDislikeDB(userId, collectionName, id, type, opts = {}) {
    try {
        let collection = await getCollection(collectionName);

        let updateResult = await collection.updateOne({
            userId: new mongodb.ObjectId(userId),
            type: type,
            likes: new mongodb.ObjectId(id)
        }, {
            $pull: {
                likes: new mongodb.ObjectId(id),
            },
            $inc: {
                itemCount: -1,
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

export async function removeUserLikeBuckets(userId, docType) {
    try {
        const collectionName = docType + 'LikeBucket';
        let collection = await getCollection(collectionName);
        let result = await collection.deleteMany({userId: new mongodb.ObjectId(userId)});
        return result.value;
    } catch (error) {
        saveError(error);
    }
}
