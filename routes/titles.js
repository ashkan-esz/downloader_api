const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';
import { ObjectId } from "mongodb";
import {search_cached_titles, add_cached_titles} from "../cache";

//host/titles/550010/movie?
router.get('/:id/:type?', async (req, res,next) => {
    let id = req.params.id;
    let type = req.params.type || null;
    if (id === 'movie' || id === 'serial') {
        return next();
    }
    if (type) { //todo check again
        let collection_name = (type === 'serial') ? 'serials' : 'movies';
        let collection = await getCollection(collection_name);
        let result = await collection.findOne({_id: new ObjectId(id)});
        if (result === null) {
            return res.sendStatus(404);
        }
        return res.json(result);
    }
    let collection = await getCollection('movies');
    let result = await collection.findOne({_id: new ObjectId(id)});
    if (result === null) {
        let collection = await getCollection('serials');
        let result = await collection.findOne({_id: new ObjectId(id)});
        if (result === null) {
            return res.sendStatus(404);
        }
        return res.json(result);
    }
    return res.json(result);

});

//host/titles/movie/the cove/high
router.get('/:type/:title/:accuracy?', async (req, res) => {
    let type = req.params.type;
    let searching_title = req.params.title;
    let accuracy = req.params.accuracy || 'low';
    //cache
    if (accuracy === 'high') {
        let cached_titles = search_cached_titles(type, searching_title, accuracy); //todo : add year to search
        if (cached_titles !== null) {
            return res.json(cached_titles);
        }
    }
    //database
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);

    let result = [];
    if (accuracy === 'high') {  //todo : add year to query
        let temp = await collection.findOne({title: searching_title});
        if (temp !== null) {
            result.push(temp);
        }
    } else if (accuracy === 'low') {
        searching_title = searching_title.replace(/-/g, ' ');
        let splitted_title = searching_title.split(' ');
        let phrase = (splitted_title.length > 1) ? splitted_title[0] + ' ' + splitted_title[1] : splitted_title[0];
        searching_title = searching_title.replace(phrase, `\"${phrase}\"`);
        result = await collection.find({$text: {$search: searching_title}}, {limit: 12}).toArray();
    } else {
        result = await collection.find({$text: {$search: searching_title}}, {limit: 16}).toArray();
    }

    if (result.length === 0) {
        return res.sendStatus(404);
    }

    if (accuracy === 'high') {
        add_cached_titles(type, result);
    }
    return res.json(result);
});


export default router;
