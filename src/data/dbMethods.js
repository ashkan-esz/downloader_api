import getCollection from './mongoDB';
import mongodb from 'mongodb';
import {saveError} from "../error/saveError";


export async function searchTitleDB(titleObj, searchTypes, year, dataConfig) {
    try {
        let collection = await getCollection('movies');
        let searchObj = {
            $or: [
                {title: titleObj.title},
                {title: {$in: titleObj.alternateTitles}},
                {title: {$in: titleObj.titleSynonyms}},
                {alternateTitles: titleObj.title},
                {titleSynonyms: titleObj.title},
            ],
            type: {$in: searchTypes}
        };
        if (year) {
            searchObj.year = year;
            let temp = titleObj.title.split('').map(item => item.trim() + '\\s?').join('').replace(/\\s\?$/, '');
            searchObj['$or'].push({
                title: new RegExp('^' + temp + '$')
            });
        }
        return await collection.find(searchObj, {projection: dataConfig}).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function searchOnMovieCollectionDB(searchQuery, projection = {}) {
    try {
        let collection = await getCollection('movies');
        return await collection.findOne(searchQuery, {projection: projection});
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function searchForAnimeRelatedTitlesByJikanIDDB(jikanID) {
    try {
        let collection = await getCollection('movies');
        return await collection.find({
            "relatedTitles.jikanID": jikanID,
        }, {projection: {relatedTitles: 1}}).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function searchStaffAndCharactersDB(collectionName, searchName, tvmazePersonID, jikanPersonID) {
    try {
        let collection = await getCollection(collectionName);
        return await collection.findOne({
            name: searchName,
            $or: [
                {
                    $and: [
                        {tvmazePersonID: {$ne: 0}},
                        {tvmazePersonID: tvmazePersonID}
                    ]
                },
                {
                    $and: [
                        {jikanPersonID: {$ne: 0}},
                        {jikanPersonID: jikanPersonID}
                    ]
                },
            ],
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

//-----------------------------------
//-----------------------------------

export async function updateMovieCollectionDB(updateFields) {
    try {
        let collection = await getCollection('movies');
        await collection.updateMany({}, {
            $set: updateFields
        });
    } catch (error) {
        saveError(error);
    }
}

export async function resetMonthLikeAndViewDB() {
    try {
        let collection = await getCollection('movies');
        await collection.updateMany({}, {
            $set: {
                like_month: 0,
                view_month: 0,
            }
        });
    } catch (error) {
        saveError(error);
    }
}

export async function updateByIdDB(collectionName, id, updateFields) {
    try {
        let collection = await getCollection(collectionName);
        let result = await collection.updateOne({_id: id}, {
            $set: updateFields
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

export async function findOneAndUpdateMovieCollection(searchQuery, updateFields) {
    try {
        let collection = await getCollection('movies');
        let result = await collection.updateOne(searchQuery, {
            $set: updateFields
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

//-----------------------------------
//-----------------------------------

export async function insertToDB(collectionName, dataToInsert) {
    try {
        let collection = await getCollection(collectionName);
        let result = await collection.insertOne(dataToInsert);
        return result.insertedId;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function removeByIdDB(collectionName, id) {
    try {
        let collection = await getCollection(collectionName);
        let result = await collection.findOneAndDelete({_id: id});
        return result.value;
    } catch (error) {
        saveError(error);
    }
}

//-----------------------------------
//-----------------------------------

export async function getSourcesObjDB() {
    try {
        let collection = await getCollection('sources');
        return await collection.findOne({title: 'sources'});
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function updateSourcesObjDB(updateFields) {
    try {
        let collection = await getCollection('sources');
        let result = await collection.findOneAndUpdate({title: 'sources'}, {
            $set: updateFields
        });
        return result.value;
    } catch (error) {
        saveError(error);
        return null;
    }
}

//-----------------------------------
//-----------------------------------

export async function getNewMovies(userId, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    releaseState: 'done',
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                }
            },
            {
                $sort: {
                    year: -1,
                    insert_date: -1
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    releaseState: 'done',
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                }
            },
            {
                $sort: {
                    update_date: -1,
                    year: -1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getTopsByLikesMovies(userId, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    releaseState: 'done',
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                }
            },
            {
                $sort: {
                    likesCount: -1,
                    _id: -1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getNewTrailers(userId, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    releaseState: {$ne: "done"},
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                    trailers: {$ne: null},
                }
            },
            {
                $sort: {
                    year: -1,
                    add_date: -1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------
//-----------------------------------

export async function getSortedMovies(userId, sortBase, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let searchBase;
        sortBase = sortBase.toLowerCase();
        if (sortBase === 'animetopcomingsoon') {
            searchBase = "rank.animeTopComingSoon";
        } else if (sortBase === 'animetopairing') {
            searchBase = "rank.animeTopAiring";
        } else if (sortBase === 'comingsoon') {
            searchBase = "rank.comingSoon";
        } else if (sortBase === 'intheaters') {
            searchBase = "rank.inTheaters";
        } else if (sortBase === 'boxoffice') {
            searchBase = "rank.boxOffice";
        } else if (sortBase === 'top') {
            searchBase = "rank.top";
        } else if (sortBase === 'popular') {
            searchBase = "rank.popular";
        } else {
            return [];
        }

        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    [searchBase]: {$ne: -1},
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                }
            },
            {
                $sort: {
                    [searchBase]: 1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, skip, limit, projection) {
    try {
        dayNumber = dayNumber % 7;
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    status: "running",
                    releaseDay: daysOfWeek[dayNumber],
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                }
            },
            {
                $sort: {
                    'rating.imdb': -1,
                    'rating.myAnimeList': -1,
                    _id: -1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getGenresStatusDB() {
    try {
        let collection = await getCollection('movies');
        let aggregationPipeline = [
            {
                $sort: {
                    year: -1,
                    insert_date: -1,
                }
            },
            {
                $unwind: "$genres"
            },
            {
                $group:
                    {
                        _id: "$genres",
                        poster: {$first: {$arrayElemAt: ['$posters', 0]}},
                        count: {$sum: 1}
                    }
            },
            {
                $sort: {
                    _id: 1,
                }
            },
            {
                $project: {
                    _id: 0,
                    genre: "$_id",
                    poster: 1,
                    count: 1,
                }
            }
        ];

        let genres = await collection.aggregate(aggregationPipeline).toArray();
        return genres.filter(item => item.genre !== 'n/a');
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getGenresMoviesDB(userId, genres, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        let aggregationPipeline = [
            {
                $match: {
                    genres: {$all: genres},
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                }
            },
            {
                $sort: {
                    year: -1,
                    insert_date: -1
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------
//-----------------------------------

export async function searchOnMovieCollectionByTitle(userId, title, types, years, genres, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        let aggregationPipeline = [
            {
                $match: {
                    type: {$in: types},
                    year: {
                        $gte: years[0],
                        $lte: years[1],
                    },
                    "rating.imdb": {
                        $gte: imdbScores[0],
                        $lte: imdbScores[1],
                    },
                    "rating.myAnimeList": {
                        $gte: malScores[0],
                        $lte: malScores[1],
                    },
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, 'movies'),
        ];

        if (title) {
            aggregationPipeline.unshift({
                $search: {
                    index: 'default',
                    text: {
                        query: title,
                        path: ['title', 'alternateTitles', 'titleSynonyms'],
                    }
                }
            });
        }

        if (genres.length > 0) {
            let matchIndex = title ? 1 : 0;
            aggregationPipeline[matchIndex]['$match'].genres = {$all: genres};
        }

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function searchOnCollectionById(collectionName, userId, id, projection) {
    try {
        let collection = await getCollection(collectionName);

        let aggregationPipeline = [
            {
                $match: {
                    _id: new mongodb.ObjectId(id)
                }
            },
            {
                $limit: 1,
            },
            getLookupOnLikeBucketStage(userId, collectionName),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        let result = await collection.aggregate(aggregationPipeline).toArray();
        return result.length === 0 ? null : result[0];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function searchOnCollectionByName(collectionName, userId, name, skip, limit, projection) {
    try {
        let collection = await getCollection(collectionName);

        let aggregationPipeline = [
            {
                $search: {
                    index: 'default',
                    text: {
                        query: name,
                        path: ['name', 'rawName'],
                    }
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            getLookupOnLikeBucketStage(userId, collectionName),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: {...projection, likeBucket: 1},
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------
//-----------------------------------

export async function changeMoviesLikeOrDislike(collectionName, id, type, value, type2, value2, opts = {}) {
    try {
        let collection = await getCollection(collectionName);

        //like --> likesCount
        //dislike --> dislikesCount
        const dataUpdate = {
            [`${type}sCount`]: value
        }
        if (type2) {
            dataUpdate[`${type2}sCount`] = value2;
        }

        let updateResult = await collection.updateOne({
            _id: new mongodb.ObjectId(id)
        }, {
            $inc: dataUpdate,
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

//-----------------------------------
//-----------------------------------

function getTypeAndRatingFilterConfig(types, imdbScores, malScores) {
    if (imdbScores.length === 1) {
        imdbScores.push(10);
    }
    if (malScores.length === 1) {
        malScores.push(10);
    }
    return {
        type: {$in: types},
        "rating.imdb": {
            $gte: imdbScores[0],
            $lte: imdbScores[1],
        },
        "rating.myAnimeList": {
            $gte: malScores[0],
            $lte: malScores[1],
        },
    };
}

function getLookupOnLikeBucketStage(userId, collectionName) {
    return ({
        $lookup: {
            let: {movieId: "$_id"},
            from: (collectionName + 'LikeBucket'),
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {$eq: ["$userId", new mongodb.ObjectId(userId)]},
                                {$in: ["$$movieId", "$likes"]}
                            ]
                        }
                    }
                },
                {$project: {"type": 1}},
                {$limit: 1}
            ],
            as: 'likeBucket',
        }
    });
}
