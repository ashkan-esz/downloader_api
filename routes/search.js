const express = require('express');
const router = express.Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {ObjectId} = require("mongodb");

//search/searchAll/:title/:dataLevel/:page/:count?
router.get('/searchAll/:title/:dataLevel/:page/:count?', async (req, res) => {
    let title = req.params.title;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let movieSkip = (page === 0) ? 0 : 8 * (page - 1);
    let movieLimit = (page === 0) ? Math.round(count / 2) : 8;
    let serialSkip = (page === 0) ? 0 : 4 * (page - 1);
    let serialLimit = (page === 0) ? count / 2 : 4;

    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection.find(
        {title: new RegExp(title)},
        {projection: dataConfig[dataLevel],})
        .skip(movieSkip)
        .limit(movieLimit)
        .toArray();
    let serialSearch = serialCollection.find(
        {title: new RegExp(title)},
        {projection: dataConfig[dataLevel],})
        .skip(serialSkip)
        .limit(serialLimit)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [].concat.apply([], searchResults);
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//search/searchSingleType/:type/:title/:dataLevel/:page/:count?
router.get('/searchSingleType/:type/:title/:dataLevel/:page/:count?', async (req, res) => {
    let type = req.params.type;
    let title = req.params.title;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    let collection = await getCollection(type + 's');
    let searchResults = await collection.find(
        {title: new RegExp(title)},
        {projection: dataConfig[dataLevel],})
        .skip(skip)
        .limit(limit)
        .toArray();
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//searchByID/:type/:id/:dataLevel
router.get('/searchByID/:type/:id/:dataLevel', async (req, res) => {
    let {id, type, dataLevel} = req.params;
    let collection = await getCollection(type + 's');
    let searchResult = await collection.findOne(
        {_id: new ObjectId(id)},
        {projection: dataConfig[dataLevel],});
    if (searchResult) {
        return res.json(searchResult);
    }
    return res.sendStatus(404);
});

export default router;
