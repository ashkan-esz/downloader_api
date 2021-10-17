const getCollection = require('./mongoDB');
const {saveError} = require("./saveError");


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

export async function removeTitleByIdDB(id) {
    try {
        let collection = await getCollection('movies');
        await collection.findOneAndDelete({_id: id});
    } catch (error) {
        saveError(error);
    }
}

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
