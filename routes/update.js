const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getCache_updates_all, getCache_updates_singleType} = require("../cache");

//updates/getAll/:dataLevel/:page
router.get('/getAll/:dataLevel/:page', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_updates_all();
        if (cacheResult) {
            let movie_startIndex = 8 * (page - 1);
            let serial_startIndex = 4 * (page - 1);
            let result = [
                ...cacheResult.updates_movies.slice(movie_startIndex, movie_startIndex + 8),
                ...cacheResult.updates_serials.slice(serial_startIndex, serial_startIndex + 4)
            ];
            return res.json(result);
        }
    }
    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({update_date: -1})
        .skip(8 * (page - 1))
        .limit(8)
        .toArray();
    let serialSearch = serialCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({update_date: -1})
        .skip(4 * (page - 1))
        .limit(4)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]];
    return res.json(searchResults);
});

//updates/getSingleType/:type/:dataLevel/:page
router.get('/getSingleType/:type/:dataLevel/:page', async (req, res) => {
    let type = req.params.type;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_updates_singleType(type);
        if (cacheResult) {
            let startIndex = 12 * (page - 1);
            return res.json(cacheResult.slice(startIndex, startIndex + 12));
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let searchResults = await collection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({update_date: -1})
        .skip(12 * (page - 1))
        .limit(12)
        .toArray();
    return res.json(searchResults);
});


export default router;
