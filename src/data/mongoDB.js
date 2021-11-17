import config from "../config";
import mongodb from "mongodb";
import {saveError} from "../error/saveError";

let database = null;

async function startDatabase() {
    const uri = config.databaseURL;
    const connection = await mongodb.MongoClient.connect(uri, {useUnifiedTopology: true, useNewUrlParser: true});
    database = connection.db();
}

async function getCollection(collection_name) {
    try {
        if (!database) await startDatabase();
        return database.collection(collection_name);
    } catch (error) {
        saveError(error);
        return null;
    }
}

export default getCollection;
