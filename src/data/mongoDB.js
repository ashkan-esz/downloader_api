import config from "../config";
import mongodb from "mongodb";
import {saveError} from "../error/saveError";

let database = null;

async function startDatabase() {
    const uri = config.databaseURL;
    const connection = await mongodb.MongoClient.connect(uri);
    database = connection.db();
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

export default getCollection;
