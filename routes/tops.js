const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {
    getCache_Tops_Likes_All, getCache_Tops_Likes_SingleType,
    getCache_tops_popularNames, getCache_tops_popularShows,
    setCache_tops_popularNames
} = require("../cache");

//tops/byLikes/getAll/:dataLevel/:page/:count?
router.get('/byLikes/getAll/:dataLevel/:page/:count?', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let movieSkip = (page === 0) ? 0 : 8 * (page - 1);
    let movieLimit = (page === 0) ? Math.round(count / 2) : 8;
    let serialSkip = (page === 0) ? 0 : 4 * (page - 1);
    let serialLimit = (page === 0) ? count / 2 : 4;

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_Tops_Likes_All();
        if (cacheResult) {
            let result = [
                ...cacheResult.tops_likes_movies.slice(movieSkip, movieSkip + movieLimit),
                ...cacheResult.tops_likes_serials.slice(serialSkip, serialSkip + serialLimit)
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
        .skip(movieSkip)
        .limit(movieLimit)
        .toArray();
    let serialSearch = serialCollection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({like: -1})
        .skip(serialSkip)
        .limit(serialLimit)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]].sort((a, b) => b.like - a.like);
    return res.json(searchResults);
});

//tops/byLikes/getSingleType/:type/:dataLevel/:page/:count?
router.get('/byLikes/getSingleType/:type/:dataLevel/:page/:count?', async (req, res) => {
    let type = req.params.type;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_Tops_Likes_SingleType(type);
        if (cacheResult) {
            return res.json(cacheResult.slice(skip, skip + limit));
        }
    }
    //database
    let collection = await getCollection(type + 's');
    let searchResults = await collection
        .find({}, {projection: dataConfig[dataLevel]})
        .sort({like: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
    return res.json(searchResults);
});

//tops/popularShows/:dataLevel/:page/:count?
router.get('/popularShows/:dataLevel/:page/:count?', async (req, res) => {
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    let popularNames = getCache_tops_popularNames();
    if (popularNames.length === 0) {
        //retry to get popular show names
        await setCache_tops_popularNames();
    }
    if (popularNames.length === 0 || page > 10) {
        return res.sendStatus(404);
    }
    let searchNames = popularNames.slice(skip, skip + limit);
    if (searchNames.length !== 12) {
        return res.sendStatus(404);
    }
    //cache
    if (dataLevel === 'low' && page <= 4) {
        let cacheResult = getCache_tops_popularShows();
        if (cacheResult.length > 0) {
            return res.json(cacheResult.slice(skip, skip + limit));
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
