import config from "../config";
import mongodb from "mongodb";
import {saveError} from "../error/saveError";

let connection = null;
let database = null;

async function startDatabase() {
    try {
        const uri = config.databaseURL;
        connection = await mongodb.MongoClient.connect(uri);
        database = connection.db();
    } catch (error) {
        saveError(error);
        connection = null;
        database = null;
    }
}

async function getCollection(collection_name) {
    try {
        if (!database) await startDatabase();
        return database.collection(collection_name);
    } catch (error) {
        saveError(error);
        database = null;
        return null;
    }
}

export async function getSession() {
    try {
        if (!database) await startDatabase();
        return await connection.startSession();
    } catch (error) {
        saveError(error);
        database = null;
        return null;
    }
}

export default getCollection;
