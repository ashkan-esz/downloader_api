import config from "../config/index.js";
import mongodb from "mongodb";
import {saveError} from "../error/saveError.js";

let connection = null;
export let database = null;

async function startDatabase() {
    try {
        const uri = config.dataBases.mongodb.url;
        connection = new mongodb.MongoClient(uri, {compressors: ["zstd", "zlib"]});
        await connection.connect();
        database = connection.db();
    } catch (error) {
        saveError(error);
        connection = null;
        database = null;
    }
}

async function getCollection(collection_name, retryCounter = 0) {
    try {
        if (!database) await startDatabase();
        return database.collection(collection_name);
    } catch (error) {
        if (retryCounter === 0) {
            retryCounter++;
            return await getCollection(collection_name, retryCounter);
        }
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
