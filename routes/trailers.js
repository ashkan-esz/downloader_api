const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getCache_Trailers} = require("../cache");


//trailers/:types/:page/:count?
router.get('/:types/:page/:count?', async (req, res) => {
    let types = JSON.parse(req.params.types);
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 6 * (page - 1);
    let limit = (page === 0) ? count : 6;

    //cache
    if (page <= 6) {
        let cacheResult = getCache_Trailers(types);
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 6) {
            return res.json(result);
        }
    }
    //database
    let collection = await getCollection('movies');
    let searchResults = await collection
        .find({
            type: {$in: types},
            trailers: {$ne: null},
        }, {projection: dataConfig['medium']})
        .sort({insert_date: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});


export default router;
