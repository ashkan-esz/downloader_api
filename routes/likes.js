const express = require('express');
const router = express.Router();
import getCollection from "../mongoDB";
import {get_cached_likes, update_cached_news, update_cached_titles, update_cashed_likes} from "../cache";

//host/likes/movie/top/true/5
router.get('/:type/top/:titles/:count?', async (req, res) => {
    let type = req.params.type;
    let titles = req.params.titles;
    let count = Number(req.params.count) || 25;
    //cache
    let cached_likes = get_cached_likes(type, count);
    if (cached_likes !== null) {
        cached_likes = cached_likes.slice(0, count);
        if (titles === 'true') {
            cached_likes = cached_likes.map((thisCachedLike) => {
                return {title: thisCachedLike.title, like: thisCachedLike.like, dislike: thisCachedLike.dislike}
            });
        }
        return res.json(cached_likes);
    }
    //database
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let top = await collection.find({}).sort({like: -1}).limit(count).toArray();
    update_cashed_likes(type, top);
    if (titles === 'true') {
        top = top.map((thisTop) => {
            return {title: thisTop.title, like: thisTop.like, dislike: thisTop.dislike}
        })
    }
    return res.json(top);
});

//host/likes/movie/the cove
router.get('/:type/:title', async (req, res) => {
    let type = req.params.type;
    let title = req.params.title;
    //cache
    let cached_likes = get_cached_likes(type, 0);
    if (cached_likes !== null) {
        for (const cachedLike of cached_likes) {
            if (cachedLike.title === title) {
                return res.json({title: cachedLike.title, like: cachedLike.like, dislike: cachedLike.dislike});
            }
        }
    }
    //database
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let search_result = await collection.findOne({title: title});
    if (search_result === null) {
        return res.sendStatus(404);
    }
    update_cashed_likes(type, [search_result]);
    return res.json({title: search_result.title, like: search_result.like, dislike: search_result.dislike});
});

//host/likes/movie/joker/like.inc
router.put('/:type/:title/:like.:inc', async (req, res) => {
    let type = req.params.type;
    let title = req.params.title;
    let like_dislike = req.params.like;
    let inc_dec = req.params.inc;

    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let search_result = await collection.findOne({title: title});
    if (search_result === null) {
        return res.status(404).send(null);
    }

    if (inc_dec === 'inc') {
        if (like_dislike === 'dislike')
            search_result.dislike++;
        else search_result.like++;
    } else {
        if (like_dislike === 'dislike' && search_result.dislike !== 0) {
            search_result.dislike--;
        } else if (like_dislike !== 'dislike' && search_result.like !== 0)
            search_result.like--;
    }

    update_cashed_likes(type, [search_result]);
    update_cached_titles(type, search_result);
    update_cached_news(type, search_result);
    await collection.findOneAndUpdate({_id: search_result._id}, {
        $set: {
            like: search_result.like,
            dislike: search_result.dislike
        }
    });
    res.json({title: search_result.title, like: search_result.like, dislike: search_result.dislike});
});


export default router;
