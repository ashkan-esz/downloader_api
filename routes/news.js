const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getCache_news_all, getCache_news_singleType} = require("../cache");

//news/getAll/:dataLevel/:page
router.get('/getAll/:dataLevel/:page', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_news_all();
        if (cacheResult) {
            let movie_startIndex = 8 * (page - 1);
            let serial_startIndex = 4 * (page - 1);
            let result = [
                ...cacheResult.news_movies.slice(movie_startIndex, movie_startIndex + 8),
                ...cacheResult.news_serials.slice(serial_startIndex, serial_startIndex + 4)
            ];
            return res.json(result);
        }
    }
    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({premiered: -1, insert_date: -1})
        .skip(8 * (page - 1))
        .limit(8)
        .toArray();
    let serialSearch = serialCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({premiered: -1})
        .skip(4 * (page - 1))
        .limit(4)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]];
    return res.json(searchResults);
});

//news/getSingleType/:type/:dataLevel/:page
router.get('/getSingleType/:type/:dataLevel/:page', async (req, res) => {
    let type = req.params.type;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_news_singleType(type);
        if (cacheResult) {
            let startIndex = 12 * (page - 1);
            return res.json(cacheResult.slice(startIndex, startIndex + 12));
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let sortConfig = (type === 'serial') ? {premiered: -1} : {premiered: -1, insert_date: -1};
    let searchResults = await collection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort(sortConfig)
        .skip(12 * (page - 1))
        .limit(12)
        .toArray();
    return res.json(searchResults);
});


export default router;
