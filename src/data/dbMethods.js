import getCollection from './mongoDB';
import {ObjectId} from 'mongodb';
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

export async function searchForAnimeRelatedTitlesByJikanID(jikanID) {
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

export async function searchStaffAndCharactersDB(collectionName, searchName) {
    try {
        let collection = await getCollection(collectionName);
        return await collection.findOne({name: searchName});
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

export async function updateByIdDB(collectionName, id, updateFields) {
    try {
        let collection = await getCollection(collectionName);
        await collection.findOneAndUpdate({_id: id}, {
            $set: updateFields
        });
    } catch (error) {
        saveError(error);
    }
}

export async function findOneAndUpdateMovieCollection(searchQuery, updateFields) {
    try {
        let collection = await getCollection('movies');
        await collection.findOneAndUpdate(searchQuery, {
            $set: updateFields
        });
    } catch (error) {
        saveError(error);
    }
}

//-----------------------------------
//-----------------------------------

export async function insertToDB(collectionName, dataToInsert, isMany = false) {
    try {
        let collection = await getCollection(collectionName);
        let result = (isMany)
            ? await collection.insertMany(dataToInsert)
            : await collection.insertOne(dataToInsert);
        return (result.insertedId || result.insertedIds);
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function removeTitleByIdDB(id) {
    try {
        let collection = await getCollection('movies');
        await collection.findOneAndDelete({_id: id});
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

export async function getStatusObjDB() {
    try {
        let statesCollection = await getCollection('states');
        return await statesCollection.findOne({name: 'states'});
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function updateStatusObjDB(updateFields) {
    try {
        let statesCollection = await getCollection('states');
        await statesCollection.findOneAndUpdate({name: 'states'}, {
            $set: updateFields
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

//-----------------------------------
//-----------------------------------

export async function getNewMovies(types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        return await collection
            .find({
                releaseState: 'done',
                ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
            }, {projection: projection})
            .sort({year: -1, insert_date: -1})
            .skip(skip)
            .limit(limit)
            .toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getUpdateMovies(types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        return await collection
            .find({
                releaseState: 'done',
                ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
            }, {projection: projection})
            .sort({update_date: -1, year: -1})
            .skip(skip)
            .limit(limit)
            .toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getTopsByLikesMovies(types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        return await collection
            .find({
                releaseState: 'done',
                ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
            }, {projection: projection})
            .sort({like: -1})
            .skip(skip)
            .limit(limit)
            .toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getNewTrailers(types, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        return await collection
            .find({
                releaseState: {$ne: "done"},
                ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
                trailers: {$ne: null},
            }, {projection: projection})
            .sort({year: -1, add_date: -1})
            .skip(skip)
            .limit(limit)
            .toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

//-----------------------------------
//-----------------------------------

export async function getSortedMovies(sortBase, types, imdbScores, malScores, skip, limit, projection) {
    try {
        let searchBase;
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
        }
        let query = {
            releaseState: {$ne: "done"},
            ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
        }
        query[searchBase] = {$ne: -1};
        let sortConfig = {};
        sortConfig[searchBase] = 1;

        let collection = await getCollection('movies');
        return await collection
            .find(query, {projection: projection})
            .sort(sortConfig)
            .skip(skip)
            .limit(limit)
            .toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getSeriesOfDay(dayNumber, types, imdbScores, malScores, skip, limit, projection) {
    try {
        dayNumber = dayNumber % 7;
        let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let collection = await getCollection('movies');
        return await collection
            .find({
                status: {$ne: "ended"},
                releaseDay: daysOfWeek[dayNumber],
                nextEpisode: {$ne: null},
                ...getTypeAndRatingFilterConfig(types, imdbScores, malScores),
            }, {projection: projection})
            .sort({'rating.imdb': -1, 'rating.myAnimeList': -1})
            .skip(skip)
            .limit(limit)
            .toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

//-----------------------------------
//-----------------------------------

export async function searchOnMovieCollectionByTitle(title, types, years, imdbScores, malScores, skip, limit, projection) {
    try {
        let collection = await getCollection('movies');
        let aggregationPipeline = [
            {
                $search: {
                    index: 'default',
                    text: {
                        query: title,
                        path: ['title', 'alternateTitles', 'titleSynonyms'],
                    }
                }
            },
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
            }
        ];
        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
            });
        }
        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function searchOnCollectionById(collectionName, id, projection) {
    try {
        let collection = await getCollection(collectionName);
        return await collection.findOne({_id: new ObjectId(id)}, {projection: projection});
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function searchOnCollectionByName(collectionName, name, skip, limit, projection) {
    try {
        let collection = await getCollection(collectionName);
        let aggregationPipeline = [
            {
                $search: {
                    index: 'default',
                    text: {
                        query: name,
                        path: ['name'],
                    }
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            }
        ];
        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
            });
        }
        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getTypeAndRatingFilterConfig(types, imdbScores, malScores) {
    if (imdbScores.length === 1) {
        imdbScores[1] = 10;
    }
    if (malScores.length === 1) {
        malScores[1] = 10;
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