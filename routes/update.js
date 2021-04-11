const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getCache_updates} = require("../cache");


//updates/:types/:dataLevel/:page:/:count?
router.get('/:types/:dataLevel/:page/:count?', async (req, res) => {
    let types = JSON.parse(req.params.types);
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_updates(types);
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return res.json(result);
        }
    }
    //database
    let collection = await getCollection('movies');
    let searchResults = await collection
        .find({
            type: {$in: types},
        }, {projection: dataConfig[dataLevel]})
        .sort({update_date: -1, premiered: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
    return res.json(searchResults);
});


export default router;
