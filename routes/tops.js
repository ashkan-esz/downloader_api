const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {
    getCache_Tops_Likes_All, getCache_Tops_Likes_SingleType,
    getCache_tops_popularNames, getCache_tops_popularShows,
    setCache_tops_popularNames
} = require("../cache");

//tops/byLikes/getAll/:dataLevel/:page
router.get('/byLikes/getAll/:dataLevel/:page', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_Tops_Likes_All();
        if (cacheResult) {
            let movie_startIndex = 8 * (page - 1);
            let serial_startIndex = 4 * (page - 1);
            let result = [
                ...cacheResult.tops_likes_movies.slice(movie_startIndex, movie_startIndex + 8),
                ...cacheResult.tops_likes_serials.slice(serial_startIndex, serial_startIndex + 4)
            ];
            result = result.sort((a, b) => b.like - a.like);
            return res.json(result);
        }
    }
    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({like: -1})
        .skip(8 * (page - 1))
        .limit(8)
        .toArray();
    let serialSearch = serialCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({like: -1})
        .skip(4 * (page - 1))
        .limit(4)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]].sort((a, b) => b.like - a.like);
    return res.json(searchResults);
});

//tops/byLikes/getSingleType/:type/:dataLevel/:page
router.get('/byLikes/getSingleType/:type/:dataLevel/:page', async (req, res) => {
    let type = req.params.type;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    //cache
    if (dataLevel === 'low' && page <= 3) {
        let cacheResult = getCache_Tops_Likes_SingleType(type);
        if (cacheResult) {
            let startIndex = 12 * (page - 1);
            return res.json(cacheResult.slice(startIndex, startIndex + 12));
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let searchResults = await collection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({like: -1})
        .skip(12 * (page - 1))
        .limit(12)
        .toArray();
    return res.json(searchResults);
});

//tops/popularShows/:dataLevel/:page
router.get('/popularShows/:dataLevel/:page', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;
    let popularNames = getCache_tops_popularNames();
    if (popularNames.length === 0) {
        //retry to get popular show names
        await setCache_tops_popularNames();
    }
    if (popularNames.length === 0 || page > 10) {
        return res.sendStatus(404);
    }
    let startIndex = 12 * (page - 1);
    let searchNames = popularNames.slice(startIndex, startIndex + 12);
    if (searchNames.length !== 12) {
        return res.sendStatus(404);
    }
    //cache
    if (dataLevel === 'low' && page <= 2) {
        let cacheResult = getCache_tops_popularShows();
        if (cacheResult.length > 0) {
            return res.json(cacheResult.slice(startIndex, startIndex + 12));
        }
    }
    //database
    let collection = await getCollection('serials');
    let searchResults = await collection
        .find({title: {$in: searchNames}}, {projection: dataConfig[dataLevel]})
        .toArray();
    searchResults = searchResults.sort((a, b) => searchNames.indexOf(a.title) - searchNames.indexOf(b.title));
    return res.json(searchResults);
});

export default router;
