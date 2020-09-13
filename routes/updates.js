const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';
import {get_cached_news, update_cached_news} from "../cache";

//host/updates/movie/news/false/false/10
router.get('/:type/:mode/:old/:titles/:count?', async (req, res) => {
    let type = req.params.type;
    let mode = req.params.mode;
    let old = req.params.old;
    let titles = req.params.titles;
    let count = Number(req.params.count) || 25;

    //cache
    if (mode === 'news') {
        let cached_news = get_cached_news(type, count);
        if (cached_news !== null) {
            cached_news = cached_news.slice(0, count);
            if (old === 'false' && type !== 'serial') {//new movies from 2020
                cached_news = cached_news.filter(value => Number(value.year) >= 2020);
            }
            if (titles === 'true') {//titles only
                cached_news = cached_news.map(value => value.title);
            }
            return res.json(cached_news);
        }
    }

    //database
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);

    let result;
    if (mode === 'news') { //news
        if (type === 'serial') {
            result = await collection.find({}).sort({insert_date: -1}).limit(count).toArray();
        } else {
            if (old === 'true') {
                result = await collection.find({}).sort({insert_date: -1}).limit(count).toArray();
            } else {
                result = await collection.find({}).sort({year: -1, insert_date: -1}).limit(count).toArray();
            }
        }
    } else { //update
        if (type === 'serial') {
            result = await collection.find({}).sort({update_date: -1}).limit(count).toArray();
        } else {
            if (old === 'true') {
                result = await collection.find({}).sort({update_date: -1}).limit(count).toArray();
            } else {
                result = await collection.find({}).sort({year: -1, update_date: -1}).limit(count).toArray();
            }
        }
    }

    if (mode === 'news') {
        update_cached_news(type, result, true);
    }


    if (titles === 'true') {
        result = result.map(thisTitle => thisTitle.title);
    }

    return res.json(result);
});

export default router;