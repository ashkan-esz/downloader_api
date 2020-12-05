const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';

let globalProjectionConfig = {
    title: 1,
    year: 1,
    poster: 1,
    type: 1,
    rawTitle: 1,
    rating: 1,
    genres: 1,
    like: 1,
    dislike: 1
};

//update/getAll
router.get('/getAll/:lowData/:olds/:count?', async (req, res) => {
    let lowData = req.params.lowData;
    let olds = req.params.olds;
    let count = Number(req.params.count) || 25;

    let projectionConfig = (lowData === 'true') ? globalProjectionConfig : null;
    let movieSortConfig = (olds === 'true') ? {update_date: -1} : {year: -1, update_date: -1};

    //database
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');

    let movieSearch = movieCollection
        .find({}, {projection: projectionConfig})
        .sort(movieSortConfig)
        .limit(count / 2)
        .toArray();

    let serialSearch = serialCollection
        .find({}, {projection: projectionConfig})
        .sort({update_date: -1})
        .limit(count / 2)
        .toArray();

    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0], ...searchResults[1]];
    return res.json(searchResults);
});

//update/getMovies
router.get('/getMovies/:lowData/:olds/:count?', async (req, res) => {
    let lowData = req.params.lowData;
    let olds = req.params.olds;
    let count = Number(req.params.count) || 25;

    let projectionConfig = (lowData === 'true') ? globalProjectionConfig : null;
    let movieSortConfig = (olds === 'true') ? {update_date: -1} : {year: -1, update_date: -1};

    //database
    let movieCollection = await getCollection('movies');

    let movieSearch = await movieCollection
        .find({}, {projection: projectionConfig})
        .sort(movieSortConfig)
        .limit(count)
        .toArray();

    return res.json(movieSearch);
});

//update/getSerials
router.get('/getSerials/:lowData/:count?', async (req, res) => {
    let lowData = req.params.lowData;
    let count = Number(req.params.count) || 25;
    let projectionConfig = (lowData === 'true') ? globalProjectionConfig : null;

    //database
    let serialCollection = await getCollection('serials');

    let serialSearch = await serialCollection
        .find({}, {projection: projectionConfig})
        .sort({update_date: -1})
        .limit(count)
        .toArray();

    return res.json(serialSearch);
});

export default router;
