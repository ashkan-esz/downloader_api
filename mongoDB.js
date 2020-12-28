const MongoClient = require('mongodb').MongoClient;
const {saveError} = require("./saveError");

let database = null;

async function startDatabase() {
    const uri = process.env["DATABASE_URL"]
    const connection = await MongoClient.connect(uri, {useUnifiedTopology: true, useNewUrlParser: true});
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

module.exports = getCollection;
