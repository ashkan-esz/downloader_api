const MongoClient = require('mongodb').MongoClient;

let database = null;

async function startDatabase() {
    const uri = "mongodb://ashkanaz2828:AshkAnAz2828@cluster0-shard-00-00.hbba0.mongodb.net:27017,cluster0-shard-00-01.hbba0.mongodb.net:27017,cluster0-shard-00-02.hbba0.mongodb.net:27017/download?ssl=true&replicaSet=atlas-10ry9r-shard-0&authSource=admin&retryWrites=true&w=majority";
    const connection = await MongoClient.connect(uri, {useUnifiedTopology: true,useNewUrlParser: true});
    database = connection.db();
}

async function getDatabase() {
    if (!database) await startDatabase();
    return database;
}

module.exports = getDatabase;
