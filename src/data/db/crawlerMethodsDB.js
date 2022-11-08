import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";

//todo : npm install express-mongo-sanitize

export async function searchTitleDB(titleObj, searchTypes, year, dataConfig) {
    try {
        let collection = await getCollection('movies');
        let searchObj = {
            $or: [
                {title: titleObj.title},
                {title: titleObj.title.replace('uu', 'u')},
                {title: titleObj.title.replace('u', 'uu')},
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

                if (!titleObj.title.startsWith('the ')) {
                    searchObj['$or'].push({
                        title: 'the ' + titleObj.title,
                    });
                }
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

export async function updateSourceActivation(sourceName, disable) {
    try {
        let collection = await getCollection('sources');
        let result = await collection.updateOne({title: 'sources'}, {
            $set: {
                [sourceName + '.disabled']: disable,
                disabledDate: disable ? new Date() : 0,
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

//-----------------------------------
//-----------------------------------

export async function resetTempRank(isAnime = false) {
    try {
        let tempRankFieldName = isAnime ? 'tempRank_anime' : 'tempRank';
        let collection = await getCollection('movies');
        await collection.updateMany({}, {
            $set: {
                [tempRankFieldName]: -1,
            }
        });
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function replaceRankWithTempRank(rankField, isAnime = false) {
    try {
        let tempRankFieldName = isAnime ? 'tempRank_anime' : 'tempRank';
        let collection = await getCollection('movies');
        await collection.updateMany({
            [tempRankFieldName]: {$exists: true},
        }, [
            {
                $set: {
                    [`rank.${rankField}`]: `$${tempRankFieldName}`,
                },
            },
            {
                $unset: tempRankFieldName,
            }
        ]);
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function changeMoviesReleaseStateDB(currentState, newState, types) {
    try {
        let collection = await getCollection('movies');
        await collection.updateMany({
            releaseState: currentState,
            type: {$in: types},
        }, {
            $set: {
                releaseState: newState
            }
        });
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------
//-----------------------------------

export async function getDuplicateTitleInsertion(sourceName) {
    try {
        let collection = await getCollection('movies');
        return await collection.aggregate([
            {
                $match: {
                    sources: [sourceName],
                }
            },
            {
                $group: {
                    _id: {
                        title: "$title",
                        year: "$year",
                        premiered: "$premiered",
                        endYear: "$endYear",
                    },
                    count: {"$sum": 1},
                    insert_dates: {$push: "$insert_date"},
                    ids: {$push: "$_id"},
                    userStats: {$push: "$userStats"},
                }
            },
            {
                $match: {
                    _id: {"$ne": null},
                    count: {"$gt": 1}
                }
            },
            {
                $sort: {count: -1}
            },
            {
                $project: {
                    title: "$_id",
                    _id: 0,
                    count: 1,
                    insert_dates: 1,
                    ids: 1,
                    userStats: 1,
                }
            }
        ]).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function removeMovieById(id) {
    try {
        let collection = await getCollection('movies');
        await collection.deleteOne({_id: id});
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
