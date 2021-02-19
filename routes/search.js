const express = require('express');
const router = express.Router();
const getCollection = require("../mongoDB");
const {dataConfig} = require("./configs");
const {ObjectId} = require("mongodb");

//search/searchAll/:title/:dataLevel/:page
router.get('/searchAll/:title/:dataLevel/:page', async (req, res) => {
    let title = req.params.title;
    let dataLevel = req.params.dataLevel || 'low';
    let page = Number(req.params.page) || 1;

    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');

    let movieSearch = movieCollection.find(
        {title: new RegExp(title)},
        {projection: dataConfig[dataLevel],})
        .skip(8 * (page - 1))
        .limit(8)
        .toArray();
    let serialSearch = serialCollection.find(
        {title: new RegExp(title)},
        {projection: dataConfig[dataLevel],})
        .skip(4 * (page - 1))
        .limit(4)
        .toArray();
    let searchResults = await Promise.all([movieSearch, serialSearch]);
    searchResults = [].concat.apply([], searchResults);
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }
    return res.sendStatus(404);
});

//searchByID/:type/:id/:dataLevel
router.get('/searchByID/:type/:id/:dataLevel', async (req, res) => {
    let {id, type, dataLevel} = req.params;
    let collection = await getCollection(type + 's');
    let searchResult = await collection.findOne({
        _id: new ObjectId(id)
    }, {
        projection: dataConfig[dataLevel],
    });
    if (searchResult) {
        return res.json(searchResult);
    }
    return res.sendStatus(404);
});

export default router;
