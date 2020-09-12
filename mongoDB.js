const MongoClient = require('mongodb').MongoClient;

let database = null;

async function startDatabase() {
    const uri = process.env["DATABASE_URL"]
    const connection = await MongoClient.connect(uri, {useUnifiedTopology: true, useNewUrlParser: true});
    database = connection.db();
}

async function getCollection(collection_name) {
    if (!database) await startDatabase();
    return database.collection(collection_name);
}

module.exports = getCollection;
