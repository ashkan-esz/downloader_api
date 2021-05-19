const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getAggregationProjectionWithSkipLimits} = require("../utils/routesUtils");
const {ObjectId} = require("mongodb");


//search/searchByTitle/:title/:types/:dataLevel/:page/:count?
router.get('/searchByTitle/:title/:types/:dataLevel/:page/:count?', async (req, res) => {
    let types = JSON.parse(req.params.types);
    let title = req.params.title;
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    let collection = await getCollection('movies');
    let searchResults = await collection.aggregate([
        {
            $search: {
                index: 'default',
                text: {
                    query: title,
                    path: 'title'
                }
            }
        },
        {
            $match: {
                type: {$in: types},
            }
        },
        ...getAggregationProjectionWithSkipLimits(dataLevel, skip, limit),

    ]).toArray();

    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//searchByID/:id/:dataLevel
router.get('/searchByID/:id/:dataLevel', async (req, res) => {
    let {id, dataLevel} = req.params;
    let collection = await getCollection('movies');
    let searchResult = await collection.findOne(
        {_id: new ObjectId(id)},
        {projection: dataConfig[dataLevel],});
    if (searchResult) {
        return res.json(searchResult);
    }
    return res.sendStatus(404);
});

export default router;
