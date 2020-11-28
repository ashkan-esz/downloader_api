const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';

//search/:title/:count?
router.get('/searchAll/:title/:count?', async (req, res) => {
    let title = req.params.title;
    let count = req.params.count;
    count = count ? Number(count) : 20;
    title = title.replace(/-/g, ' ');
    let splitted_title = title.split(' ');//todo : need better way
    let phrase = (splitted_title.length > 1) ? splitted_title[0] + ' ' + splitted_title[1] : splitted_title[0];
    title = title.replace(phrase, `\"${phrase}\"`);

    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let projectionConfig = {
        title: 1,
        year: 1,
        poster: 1,
        type: 1,
        rawTitle: 1,
    }

    let movieSearch = movieCollection.find({
        $text: {$search: title}}, {
        projection: projectionConfig,
        limit: count
    }).toArray();
    let serialSearch = serialCollection.find({
        $text: {$search: title}}, {
        projection: projectionConfig,
        limit: count
    }).toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [...searchResults[0],...searchResults[1]];
    return res.json(searchResults);
});

export default router;
