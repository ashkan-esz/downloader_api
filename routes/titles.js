const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';
import {search_cached_titles, add_cached_titles} from "../cache";

//host/titles/movie/the cove/high
router.get('/:type/:title/:accuracy?', async (req, res) => {
    let type = req.params.type;
    let searching_title = req.params.title;
    let accuracy = req.params.accuracy || 'low';
    //cache
    if (accuracy === 'high') {
        let cached_titles = search_cached_titles(type, searching_title, accuracy);
        if (cached_titles !== null) {
            return res.json(cached_titles);
        }
    }
    //database
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);

    let result = [];
    if (accuracy === 'high') {
        let temp = await collection.find({title: searching_title}).limit(4).toArray();
        result.push(temp);
    } else if (accuracy === 'low') {
        searching_title = searching_title.replace(/-/g, ' ');
        let splitted_title = searching_title.split(' ');
        let phrase = (splitted_title.length > 1) ? splitted_title[0] + ' ' + splitted_title[1] : splitted_title[0];
        searching_title = searching_title.replace(phrase, `\"${phrase}\"`);
        result = await collection.find({$text: {$search: searching_title}}, {limit: 8}).toArray();
    } else {
        result = await collection.find({$text: {$search: searching_title}}, {limit: 8}).toArray();
    }

    if (result.length === 0) {
        return res.sendStatus(404);
    }

    if (accuracy === 'high') {
        add_cached_titles(type, ...result);
    }
    return res.json(result);
});


export default router;
