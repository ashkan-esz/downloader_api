const router = require('express').Router();
const getCollection = require("../../data/mongoDB");
const {dataLevelConfig} = require("../../models/movie");
const {
    getCache_TopLikes,
    getCache_popularIMDBShowsNames, getCache_popularIMDBShows,
    setCache_popularIMDBShowsNames
} = require("../../data/cache");

//tops/byLikes/:types/:dataLevel/:page/:count?
router.get('/byLikes/:types/:dataLevel/:page/:count?', async (req, res) => {
    let types = JSON.parse(req.params.types);
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_TopLikes(types);
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
        }, {projection: dataLevelConfig[dataLevel]})
        .sort({like: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
    return res.json(searchResults);
});

//tops/IMDBShows/:dataLevel/:page/:count?
router.get('/IMDBShows/:dataLevel/:page/:count?', async (req, res) => {
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    let popularNames = getCache_popularIMDBShowsNames();
    if (popularNames.length === 0) {
        //retry to get popular show names
        await setCache_popularIMDBShowsNames();
        popularNames = getCache_popularIMDBShowsNames();
    }
    if (popularNames.length === 0 || page > 8) {
        return res.sendStatus(404);
    }

    let searchNames = popularNames.slice(skip, skip + limit);
    if (searchNames.length !== 12) {
        return res.sendStatus(404);
    }

    //cache
    if (dataLevel === 'low' && page <= 4) {
        let cacheResult = getCache_popularIMDBShows();
        if (cacheResult.length > 0) {
            return res.json(cacheResult.slice(skip, skip + limit));
        }
    }

    //database
    let collection = await getCollection('movies');
    let searchResults = await collection
        .find({title: {$in: searchNames}}, {projection: dataLevelConfig[dataLevel]})
        .toArray();
    searchResults = searchResults.sort((a, b) => searchNames.indexOf(a.title) - searchNames.indexOf(b.title));
    return res.json(searchResults);
});


export default router;
