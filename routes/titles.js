const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';
import {add_cached_titles, search_cached_titles} from "../cache";

router.get('/:type/:title/:accuracy?', async (req, res) => {
    let type = req.params.type;
    let searching_title = req.params.title;
    let accuracy = req.params.accuracy || 'low';

    if (accuracy === 'high') {
        let cached_titles = search_cached_titles(type, searching_title, accuracy);
        if (cached_titles !== null) {
            return res.json(cached_titles);
        }
    }

    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);

    let result = [];
    if (accuracy === 'high') {
        let temp = await collection.findOne({title: searching_title});
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

    if (result.length !== 0) {
        add_cached_titles(type, ...result);
        res.json(result);
    } else {
        res.status(404).send('title not found');
    }
});


export default router;
