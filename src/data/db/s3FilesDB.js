import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";


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
