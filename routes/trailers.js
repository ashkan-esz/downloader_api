const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getCache_Trailers_All, getCache_Trailers_SingleType} = require("../cache");

//trailers/getAll/:page/:count?
router.get('/getAll/:page/:count?', async (req, res) => {
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let movieSkip = (page === 0) ? 0 : 4 * (page - 1);
    let movieLimit = (page === 0) ? Math.round(count / 2) : 4;
    let serialSkip = (page === 0) ? 0 : 2 * (page - 1);
    let serialLimit = (page === 0) ? count / 2 : 2;

    //cache
    if (page <= 3) {
        let cacheResult = getCache_Trailers_All();
        if (cacheResult) {
            let result = [
                ...cacheResult.trailers_movies.slice(movieSkip, movieSkip + movieLimit),
                ...cacheResult.trailers_serials.slice(serialSkip, serialSkip + serialLimit)
            ];
            return res.json(result);
        }
    }
    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
        .sort({premiered: -1, insert_date: -1})
        .skip(movieSkip)
        .limit(movieLimit)
        .toArray();
    let serialSearch = serialCollection
        .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
        .sort({premiered: -1})
        .skip(serialSkip)
        .limit(serialLimit)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]];
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//trailers/getSingleType/:type/:page/:count?
router.get('/getSingleType/:type/:page/:count?', async (req, res) => {
    let type = req.params.type;
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 6 * (page - 1);
    let limit = (page === 0) ? count : 6;

    //cache
    if (page <= 3) {
        let cacheResult = getCache_Trailers_SingleType(type);
        if (cacheResult) {
            let result = cacheResult.slice(skip, skip + limit);
            return res.json(result);
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let sortConfig = (type === 'serial') ? {premiered: -1} : {premiered: -1, insert_date: -1};
    let searchResults = await collection
        .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .toArray();
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});


export default router;
