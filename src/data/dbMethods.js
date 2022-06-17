import getCollection from './mongoDB.js';
import mongodb from 'mongodb';
import {saveError} from "../error/saveError.js";
import {userStats} from "../models/movie.js";
import {userStats_staff} from "../models/person.js";
import {userStats_character} from "../models/character.js";

//todo : npm install express-mongo-sanitize

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
            try {
                let temp = titleObj.title
                    .split('').map(item => item.trim() + '\\s?').join('')
                    .replace(/\*/g, '\\*')
                    .replace(/\\s\?$/, '');
                searchObj['$or'].push({
                    title: new RegExp('^' + temp + '$')
                });

                let temp2 = titleObj.title
                    .split('')
                    .map(item => {
                        if (item === ' ') {
                            item = ':?' + item;
                        }
                        return item;
                    })
                    .join('')
                    .replace(/\*/g, '\\*');
                searchObj['$or'].push({
                    alternateTitles: new RegExp('^' + temp2 + '$')
                });
            } catch (error2) {
                saveError(error2);
            }
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
export async function getAllS3PostersDB() {
    try {
        let collection = await getCollection('movies');
        return await collection.find({poster_s3: {$ne: null}}, {projection: {'poster_s3.url': 1}}).toArray();
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getAllS3TrailersDB() {
    try {
        let collection = await getCollection('movies');
        return await collection.find({trailer_s3: {$ne: null}}, {projection: {'trailer_s3.url': 1}}).toArray();
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getAllS3CastImageDB() {
    try {
        let staffCollection = await getCollection('staff');
        let charactersCollection = await getCollection('characters');
        let temp = await Promise.allSettled([
            staffCollection.find({imageData: {$ne: null}}, {projection: {'imageData.url': 1}}).toArray(),
            charactersCollection.find({imageData: {$ne: null}}, {projection: {'imageData.url': 1}}).toArray(),
        ]);
        return [...temp[0].value, ...temp[1].value];
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
                    'userStats.like_movie': -1,
                    _id: -1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
        types = types.filter(item => item.includes('serial'));
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let collection = await getCollection('movies');

        let lastWeek = new Date();
        const year = lastWeek.getFullYear().toString();
        let passedDays = Math.max(0, lastWeek.getDay() - dayNumber);
        lastWeek.setDate(lastWeek.getDate() - 7 - passedDays);
        lastWeek.setHours(0, 0, 0, 0);
        let twoWeekInFuture = new Date();
        twoWeekInFuture.setDate(twoWeekInFuture.getDate() + 15);

        let filter = {
            $or: [
                {
                    status: "running",
                    $or: [
                        {
                            'nextEpisode.releaseStamp': {
                                $gte: lastWeek.toISOString(),
                                $lte: twoWeekInFuture.toISOString()
                            }
                        },
                        {update_date: {$gte: lastWeek}}
                    ]
                },
                {
                    status: {$ne: "running"},
                    update_date: {$gte: lastWeek},
                    endYear: year,
                }
            ],
        }

        let aggregationPipeline = [
            {
                $match: {
                    ...filter,
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
        genres = genres
            .filter(item => item.genre !== 'n/a')
            .map(item => {
            item.genre = item.genre.replace('-', '_');
            return item;
        });
        return genres;
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
            ...getLookupOnUserStatsStage(userId, 'movies'),
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
                $project: projection,
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
            ...getLookupOnUserStatsStage(userId, collectionName),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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
            ...getLookupOnUserStatsStage(userId, collectionName),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
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

export async function changeUserStatOnRelatedCollection(collectionName, id, statCounterField, value, statCounterField2, value2, opts = {}, retryCounter) {
    try {
        let collection = await getCollection(collectionName);

        const dataUpdate = {
            [`userStats.${statCounterField}`]: value
        }
        if (statCounterField2) {
            dataUpdate[`userStats.${statCounterField2}`] = value2;
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
        if (
            retryCounter !== 0 ||
            error.message !== 'WriteConflict error: this operation conflicted with another operation. Please retry your operation or multi-document transaction.') {
            saveError(error);
        }
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

function getLookupOnUserStatsStage(userId, collectionName) {
    //----------------------
    let {defaultFieldValues, projection} = getDefaultFieldValuesAndProjection(collectionName);
    //----------------------
    let stats = Object.keys({...defaultFieldValues});
    let checkStatArray = [];
    let addStatFieldsArray = {
        $addFields: {}
    };
    for (let i = 0; i < stats.length; i++) {
        let stat = stats[i];
        checkStatArray.push({
            $in: ["$$movieId", `$${stat}`]
        });
        addStatFieldsArray["$addFields"][stat] = {
            $cond: [{$in: ["$$movieId", `$${stat}`]}, true, false]
        }
    }
    //----------------------
    return [
        {
            $lookup: {
                let: {movieId: "$_id"},
                from: 'userStats',
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {$eq: ["$userId", new mongodb.ObjectId(userId)]},
                                    {$or: checkStatArray},
                                ],
                            }
                        }
                    },
                    addStatFieldsArray,
                    {
                        $project: projection,
                    },
                    {$limit: 1}
                ],
                as: 'userStats2',
            }
        },
        {
            $addFields: {
                userStats: {
                    $mergeObjects: [defaultFieldValues, {$arrayElemAt: ['$userStats2', 0]}, '$userStats']
                }
            }
        },
        {
            $project: {
                userStats2: 0,
            }
        }
    ];
}

function getDefaultFieldValuesAndProjection(collectionName) {
    let defaultFieldValues; //booleans --> all false
    let projection;
    if (collectionName.includes('staff')) {
        defaultFieldValues = {...userStats_staff};
        projection = {...userStats, ...userStats_character};
    } else if (collectionName.includes('character')) {
        defaultFieldValues = {...userStats_character};
        projection = {...userStats, ...userStats_staff};
    } else {
        defaultFieldValues = {...userStats};
        projection = {...userStats_staff, ...userStats_character};
    }

    let defaultKeys = Object.keys(defaultFieldValues);
    for (let i = 0; i < defaultKeys.length; i++) {
        let temp = defaultKeys[i].replace('_count', '');
        defaultFieldValues[temp] = false;
        delete defaultFieldValues[defaultKeys[i]];
    }

    let projectionKeys = Object.keys(projection);
    for (let i = 0; i < projectionKeys.length; i++) {
        let temp = projectionKeys[i].replace('_count', '');
        projection[temp] = 0;
    }
    projection._id = 0;
    projection.userId = 0;
    projection.pageNumber = 0;

    return {defaultFieldValues, projection};
}

export function getLookupOnMoviesStage(collectionName, localField, projection) {
    //used in getting user stats list
    let lookupConfig = {
        $lookup: {
            from: collectionName,
            localField: localField,
            foreignField: '_id',
            pipeline: [
                {$limit: 1}
            ],
            as: 'data',
        }
    }
    if (projection && Object.keys(projection).length > 0) {
        lookupConfig['$lookup']['pipeline'].push({$project: projection});
    }
    return lookupConfig;
}
