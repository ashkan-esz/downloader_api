const router = require('express').Router();
const getCollection = require("../../data/mongoDB");
const {dataLevelConfig} = require("../../models/movie");
const {getCache_SeriesOfDay, getCache_seriesOfWeek} = require("../../data/cache");

//timeLine/day/:spacing/:page/:count?
router.get('/day/:spacing/:page/:count?', async (req, res) => {
    let spacing = Number(req.params.spacing);
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    //cache
    if (spacing >= -1 && spacing <= 1 && page <= 4) {
        let cacheResult = getCache_SeriesOfDay(spacing);
        if (cacheResult) {
            return res.json(cacheResult.slice(skip, skip + limit));
        }
    }
    //database
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let date = new Date();
    date.setDate(date.getDate() + spacing);
    let dayNumber = date.getDay();
    date.setDate(date.getDate() + 8);
    let collection = await getCollection('movies');
    let searchResults = await collection
        .find({
            type: 'serial',
            status: 'running',
            releaseDay: daysOfWeek[dayNumber],
            nextEpisode: {$ne: null},
            'nextEpisode.releaseStamp': {$lte: date.toISOString()}
        }, {projection: dataLevelConfig['medium']})
        .sort({'rating.0.Value': -1})
        .skip(skip)
        .limit(limit)
        .toArray();
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//timeLine/week/:weekCounter
router.get('/week/:weekCounter', async (req, res) => {
    let weekCounter = Number(req.params.weekCounter);

    //cache
    if (weekCounter >= 0 && weekCounter <= 1) {
        let cacheResult = getCache_seriesOfWeek(weekCounter);
        if (cacheResult) {
            return res.json(cacheResult);
        }
    }
    //database
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let date = new Date();
    let dayNumber = date.getDay();
    date.setDate(date.getDate() - dayNumber + 7 * weekCounter + 8); // first day of week
    let daysInfo = [];
    for (let i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        daysInfo.push({
            type: 'serial',
            status: 'running',
            releaseDay: daysOfWeek[i],
            nextEpisode: {$ne: null},
            'nextEpisode.releaseStamp': {$lte: date.toISOString()}
        });
    }
    let collection = await getCollection('movies');
    let searchResults = await collection
        .find({
            $or: daysInfo
        }, {projection: dataLevelConfig['medium']})
        .sort({releaseDay: -1})
        .toArray();

    searchResults = searchResults.sort((a, b) => {
        return (
            Number(b.rating.length > 0 ? b.rating[0].Value : 0) -
            Number(a.rating.length > 0 ? a.rating[0].Value : 0)
        );
    });

    if (searchResults.length > 0) {
        let groupSearchResult = searchResults.reduce((r, a) => {
            r[a.releaseDay] = [...r[a.releaseDay] || [], a];
            return r;
        }, {});
        return res.json(groupSearchResult);
    }
    return res.sendStatus(404);
});


export default router;
