const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {getCache_Trailers_All, getCache_Trailers_SingleType} = require("../cache");

//trailers/getAll/:page
router.get('/getAll/:page', async (req, res) => {
    let page = Number(req.params.page) || 1;
    //cache
    if (page <= 3) {
        let cacheResult = getCache_Trailers_All();
        if (cacheResult) {
            let movie_startIndex = 4 * (page - 1);
            let serial_startIndex = 2 * (page - 1);
            let result = [
                ...cacheResult.trailers_movies.slice(movie_startIndex, movie_startIndex + 4),
                ...cacheResult.trailers_serials.slice(serial_startIndex, serial_startIndex + 2)
            ];
            if (result.length > 0) {
                return res.json(result);
            }
            return res.sendStatus(404);
        }
    }
    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
        .sort({premiered: -1, insert_date: -1})
        .skip(4 * (page - 1))
        .limit(4)
        .toArray();
    let serialSearch = serialCollection
        .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
        .sort({premiered: -1})
        .skip(2 * (page - 1))
        .limit(2)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]];
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//trailers/getSingleType/:type/:page
router.get('/getSingleType/:type/:page', async (req, res) => {
    let type = req.params.type;
    let page = Number(req.params.page) || 1;
    //cache
    if (page <= 3) {
        let cacheResult = getCache_Trailers_SingleType(type);
        if (cacheResult) {
            let startIndex = 6 * (page - 1);
            let result = cacheResult.slice(startIndex, startIndex + 6);
            if (result.length > 0) {
                return res.json(result);
            }
            return res.sendStatus(404);
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let sortConfig = (type === 'serial') ? {premiered: -1} : {premiered: -1, insert_date: -1};
    let searchResults = await collection
        .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
        .sort(sortConfig)
        .skip(6 * (page - 1))
        .limit(6)
        .toArray();
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});


export default router;
