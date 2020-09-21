const getCollection = require("./mongoDB");

module.exports.save_error = async function (data) {
    let collection = await getCollection('errors');
    try {
        delete data.request;
        delete data.writable;
        delete data.writable;
        collection.insertOne(data).then(() => {});
    } catch (e) {
        e.massage2 = "module: save_logs >> save_error ";
        collection.insertOne(data).then(() => {});
    }
}

module.exports.get_saved_error = async function (count) {
    let collection = await getCollection('errors');
    let top = await collection.find({}).sort({time: -1}).limit(count).toArray();
    return top;
}
