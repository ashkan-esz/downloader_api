const getCollection = require('./mongoDB');
const {saveError} = require("./saveError");


export async function searchTitleDB(titleObj, type, searchTypes, searchYears, dataConfig) {
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
        if (type.includes('movie')) {
            searchObj.premiered = {$in: searchYears};
        }
        return await collection.find(searchObj, {projection: dataConfig}).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function insertTitleDB(titleModel) {
    try {
        let collection = await getCollection('movies');
        await collection.insertOne(titleModel);
    } catch (error) {
        saveError(error);
    }
}

export async function updateTitleByIdDB(id, updateFields) {
    try {
        let collection = await getCollection('movies');
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
