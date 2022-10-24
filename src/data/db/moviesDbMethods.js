import mongodb from 'mongodb';
import getCollection from '../mongoDB.js';
import * as lookupDbMethods from "./lookupDbMethods.js";
import {saveError} from "../../error/saveError.js";
import {getGenresStatusFromCache} from "../../api/middlewares/moviesCache.js";


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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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

export async function getNewMoviesWithDate(userId, insertDate, types, imdbScores, malScores, skip, limit, projection, dontLookupUserStats = false) {
    try {
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    releaseState: 'done',
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                    insert_date: {$gt: insertDate},
                    update_date: 0,
                }
            },
            {
                $sort: {
                    insert_date: 1
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies', dontLookupUserStats),
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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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

export async function getUpdateMoviesWithDate(userId, updateDate, types, imdbScores, malScores, skip, limit, projection, dontLookupUserStats = false) {
    try {
        let collection = await getCollection('movies');

        let aggregationPipeline = [
            {
                $match: {
                    releaseState: 'done',
                    ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                    update_date: {$gt: updateDate},
                }
            },
            {
                $sort: {
                    update_date: 1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies', dontLookupUserStats),
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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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
        } else if (sortBase === 'animeseasonnow') {
            searchBase = "rank.animeSeasonNow";
        } else if (sortBase === 'animeseasonupcoming') {
            searchBase = "rank.animeSeasonUpcoming";
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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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

export async function getGenresStatusDB() {
    try {
        const collection = await getCollection('movies');
        const aggregationPipeline = [
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

        let genresPosters = genres.map(item => item.poster && item.poster.url).filter(item => item);

        //fix genres with no poster
        for (let i = 0; i < genres.length; i++) {
            if (!genres[i].poster) {
                let temp = await getGenreTop5MoviePoster(genres[i].genre);
                let found = false;
                for (let j = 0; j < temp.length; j++) {
                    if (!genresPosters.includes(temp[j].posters[0].url)) {
                        genres[i].poster = temp[j].posters[0];
                        genresPosters.push(temp[j].posters[0].url);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    genres[i].poster = temp[0].posters[0];
                    genresPosters.push(temp[0].posters[0].url);
                }
            }
        }

        return genres;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getGenreTop5MoviePoster(genre) {
    try {
        const collection = await getCollection('movies');
        const aggregationPipeline = [
            {
                $match: {
                    genres: genre,
                    posters: {$ne: []},
                }
            },
            {
                $sort: {
                    year: -1,
                    insert_date: -1,
                }
            },
            {
                $project: {
                    title: 1,
                    posters: 1,
                }
            },
            {
                $limit: 5,
            }
        ];
        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return [];
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
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
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

export async function searchOnMovieCollectionWithFilters(userId, filters, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        let aggregationPipeline = [
            {
                $match: {}
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, 'movies'),
        ];

        if (filters.title) {
            aggregationPipeline[0]['$match'].$text = {
                $search: '\"' + filters.title + '\"',
            }
        }
        if (filters.types) {
            aggregationPipeline[0]['$match'].type = {$in: filters.types};
        }
        if (filters.years) {
            aggregationPipeline[0]['$match'].year = {
                $gte: filters.years[0],
                $lte: filters.years[1],
            }
        }
        if (filters.imdbScores) {
            aggregationPipeline[0]['$match']["rating.imdb"] = {
                $gte: filters.imdbScores[0],
                $lte: filters.imdbScores[1],
            }
        }
        if (filters.malScores) {
            aggregationPipeline[0]['$match']["rating.myAnimeList"] = {
                $gte: filters.malScores[0],
                $lte: filters.malScores[1],
            }
        }
        if (filters.genres?.length > 0) {
            aggregationPipeline[0]['$match'].genres = {$all: filters.genres};
        }
        if (filters.country) {
            aggregationPipeline[0]['$match'].country = new RegExp(filters.country);
        }
        if (filters.movieLang) {
            aggregationPipeline[0]['$match'].movieLang = new RegExp(filters.movieLang);
        }
        if (filters.dubbed) {
            aggregationPipeline[0]['$match']['latestData.dubbed'] = filters.dubbed === 'true' ? {$ne: ''} : '';
        }
        if (filters.hardSub) {
            aggregationPipeline[0]['$match']['latestData.hardSub'] = filters.hardSub === 'true' ? {$ne: ''} : '';
        }
        if (filters.censored) {
            aggregationPipeline[0]['$match']['latestData.censored'] = filters.censored === 'true' ? {$ne: ''} : '';
        }
        if (filters.subtitle) {
            aggregationPipeline[0]['$match']['latestData.subtitle'] = filters.subtitle === 'true' ? {$ne: ''} : '';
        }
        if (filters.watchOnlineLink) {
            aggregationPipeline[0]['$match']['latestData.watchOnlineLink'] = filters.watchOnlineLink === 'true' ? {$ne: ''} : '';
        }
        if (filters.numberOfSeason) {
            aggregationPipeline[0]['$match']['$expr'] = {
                $and: [
                    {$gte: [{$arrayElemAt: ["$seasons.seasonNumber", -1]}, filters.numberOfSeason[0]]},
                    {$lte: [{$arrayElemAt: ["$seasons.seasonNumber", -1]}, filters.numberOfSeason[1]]},
                ],
            }
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

export async function searchOnCollectionById(collectionName, userId, id, filters, projection, dataLevel = '') {
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
            {
                $addFields: {}
            },
            {
                $addFields: {}
            },
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, collectionName),
        ];

        if (collectionName === 'movies' && filters.seasons) {
            aggregationPipeline[2]['$addFields'].seasons = {
                $filter: {
                    input: "$seasons",
                    cond: {
                        $and: [
                            {$gte: ["$$this.seasonNumber", filters.seasons[0]]},
                            {$lte: ["$$this.seasonNumber", filters.seasons[1]]},
                        ]
                    }
                }
            };
            if (filters.episodes && filters.seasons[0] === filters.seasons[1] && (dataLevel === 'dlink' || dataLevel === 'high')) {
                aggregationPipeline[3]['$addFields']['seasons.episodes'] = {
                    $filter: {
                        input: {
                            $getField: {
                                input: {
                                    $arrayElemAt: ["$seasons", 0]
                                },
                                field: "episodes",
                            }
                        },
                        cond: {
                            $and: [
                                {$gte: ["$$this.episodeNumber", filters.episodes[0]]},
                                {$lte: ["$$this.episodeNumber", filters.episodes[1]]},
                            ]
                        }
                    }
                };
            }
        }
        if (collectionName === 'movies' && filters.qualities) {
            aggregationPipeline[2]['$addFields'].qualities = {
                $filter: {
                    input: "$qualities",
                    cond: {
                        $in: ['$$this.quality', filters.qualities],
                    }
                }
            };
        }
        if (filters.embedDownloadLinksConfig) {
            aggregationPipeline.push(
                {
                    $lookup: {
                        from: 'users',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", new mongodb.ObjectId(userId)],
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    downloadLinksSettings: 1,
                                },
                            },
                            {$limit: 1}
                        ],
                        as: 'downloadLinksConfig',
                    }
                },
                {
                    $addFields: {
                        downloadLinksConfig: {
                            $getField: {
                                input: {
                                    $arrayElemAt: ['$downloadLinksConfig', 0],
                                },
                                field: "downloadLinksSettings",
                            }
                        },
                    }
                });
        }

        if (Object.keys(projection).length > 0) {
            if (Object.values(projection).every(item => item === 1)) {
                aggregationPipeline.push({
                    $project: {...projection, downloadLinksConfig: 1},
                });
            } else {
                aggregationPipeline.push({
                    $project: projection,
                });
            }
        }

        let result = await collection.aggregate(aggregationPipeline).limit(1).toArray();
        result = result.length === 0 ? null : result[0];

        if (result && result.genres && result.genres.length > 0 && dataLevel !== 'telbot') {
            let genresWithImage = await getGenresStatusFromCache();
            genresWithImage = genresWithImage?.filter(item => result.genres.includes(item.genre.replace(/[\s_]/g, '-'))) || [];
            result.genresWithImage = genresWithImage;
        }

        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function searchOnStaffOrCharactersWithFilters(collectionName, userId, filters, skip, limit, projection) {
    try {
        let collection = await getCollection(collectionName);

        let aggregationPipeline = [
            {
                $match: {}
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, collectionName),
        ];

        if (filters.name) {
            aggregationPipeline[0]['$match'].$text = {
                $search: '\"' + filters.name + '\"',
            }
        }
        if (filters.gender) {
            aggregationPipeline[0]['$match'].gender = filters.gender;
        }
        if (filters.country) {
            aggregationPipeline[0]['$match'].country = filters.country;
        }
        if (filters.hairColor) {
            aggregationPipeline[0]['$match'].hairColor = filters.hairColor;
        }
        if (filters.eyeColor) {
            aggregationPipeline[0]['$match'].eyeColor = filters.eyeColor;
        }
        if (filters.age) {
            aggregationPipeline[0]['$match'].age = {
                $gte: filters.age[0],
                $lte: filters.age[1],
            }
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
