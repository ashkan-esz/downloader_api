const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig, extraInfo} = require("./configs");
const {getCache_updates_all, getCache_updates_singleType} = require("../cache");

//updates/getAll/:dataLevel/:page/:count?
router.get('/getAll/:dataLevel/:page/:count?', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let movieSkip = (page === 0) ? 0 : 8 * (page - 1);
    let movieLimit = (page === 0) ? Math.round(count / 2) : 8;
    let serialSkip = (page === 0) ? 0 : 4 * (page - 1);
    let serialLimit = (page === 0) ? count / 2 : 4;

    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_updates_all();
        if (cacheResult) {
            let result = [
                ...cacheResult.updates_movies.slice(movieSkip, movieSkip + movieLimit),
                ...cacheResult.updates_serials.slice(serialSkip, serialSkip + serialLimit)
            ];
            return res.json({data: result, extraInfo});
        }
    }
    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({update_date: -1, premiered: -1})
        .skip(movieSkip)
        .limit(movieLimit)
        .toArray();
    let serialSearch = serialCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({update_date: -1})
        .skip(serialSkip)
        .limit(serialLimit)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]];
    return res.json({data: searchResults, extraInfo});
});

//updates/getSingleType/:type/:dataLevel/:page:/:count?
router.get('/getSingleType/:type/:dataLevel/:page/:count?', async (req, res) => {
    let type = req.params.type;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_updates_singleType(type);
        if (cacheResult) {
            return res.json({data: cacheResult.slice(skip, skip + limit), extraInfo});
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let sortConfig = (type === 'serial') ? {update_date: -1} : {update_date: -1, premiered: -1};
    let searchResults = await collection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .toArray();
    return res.json({data: searchResults, extraInfo});
});


export default router;
