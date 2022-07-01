import getCollection from "../mongoDB.js";
import mongodb from "mongodb";
import {getLookupOnMoviesStage} from "../dbMethods.js";
import {saveError} from "../../error/saveError.js";

export async function getNotComputedUsersId(limit = 10) {
    try {
        const collectionName = 'users';
        let collection = await getCollection(collectionName);

        let lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 6);
        lastWeek.setHours(0, 0, 0, 0);

        return collection.find({
                'computed.lastUpdate': {$lte: lastWeek}
            }, {
                projection: {
                    _id: 1
                }
            }
        ).limit(limit).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateComputedFavoriteGenres(userId, genres) {
    try {
        const collectionName = 'users';
        let collection = await getCollection(collectionName);

        let lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 6);
        lastWeek.setHours(0, 0, 0, 0);

        let result = await collection.updateOne({
                _id: new mongodb.ObjectId(userId)
            },
            {
                $set: {
                    'computed.favoriteGenres': genres,
                    'computed.lastUpdate': new Date(),
                }
            });
        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getGenresFromUserStats(userId) {
    try {
        const collectionName = 'userStats';
        let collection = await getCollection(collectionName);

        let aggregationPipeline = [
            {
                $match: {
                    userId: new mongodb.ObjectId(userId),
                    $or: [
                        {like_movie_count: {$ne: 0}},
                        {follow_movie_count: {$ne: 0}},
                        {save_count: {$ne: 0}},
                        {finished_count: {$ne: 0}},
                    ]
                }
            },
            {
                $sort: {
                    pageNumber: -1
                }
            },
            {
                $project: {
                    res: {
                        $setUnion: ["$like_movie", "$save", "$follow_movie", "$finished"]
                    }
                }
            },
            {
                $unwind: '$res',
            },
            {
                $sort: {
                    res: -1,
                }
            },
            {
                $limit: 500,
            },
            getLookupOnMoviesStage('movies', 'res', {genres: 1}),
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [{res: '$res'}, {$arrayElemAt: ['$data', 0]}]
                    }
                }
            },
            {
                $unwind: '$genres'
            },
            {
                $group: {
                    _id: null,
                    count: {$sum: 1},
                    "data": {"$push": "$$ROOT"}
                }
            },
            {
                $unwind: '$data'
            },
            {
                $group: {
                    _id: '$data.genres',
                    count: {$sum: 1},
                    total: {$first: "$count"}
                }
            },
            {
                $addFields: {
                    percent: {
                        $round: [{$multiply: [{$divide: ["$count", "$total"]}, 100]}, 2]
                    },
                    genre: '$_id',
                }
            },
            {
                $sort: {
                    count: -1
                }
            },
            {
                $limit: 8
            },
            {
                $project: {
                    _id: 0,
                    total: 0,
                }
            }
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
