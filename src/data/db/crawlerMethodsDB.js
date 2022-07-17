import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";

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
