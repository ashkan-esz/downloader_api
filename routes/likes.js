const express = require('express');
const router = express.Router();
import getCollection from "../mongoDB";
import {get_cached_likes,update_cashed_likes} from "../cache";

router.get('/:type/top/titles/:count?', async (req, res) => {
    let type = req.params.type;
    let count = Number(req.params.count) || 25;

    let cached_likes = get_cached_likes(type, count);
    if (cached_likes !== null) {
        let top = cached_likes.map((thisCachedLike) => {
            return {title: thisCachedLike.title, like: thisCachedLike.like, dislike: thisCachedLike.dislike}
        })
        return res.json(top);
    }

    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let top = await collection.find({}).sort({like: -1}).limit(count).toArray();
    update_cashed_likes(type, top, 'likeUpdate');
    top = top.map((thisTop) => {
        return {title: thisTop.title, like: thisTop.like, dislike: thisTop.dislike}
    })
    res.json(top);
});

router.get('/:type/top/:count?', async (req, res) => {
    let type = req.params.type;
    let count = Number(req.params.count) || 25;

    let cached_likes = get_cached_likes(type, count);
    if (cached_likes !== null) {
        return res.json(cached_likes);
    }

    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let top = await collection.find({}).sort({like: -1}).limit(count).toArray();
    update_cashed_likes(type, top, 'likeUpdate');
    res.json(top);
});

router.get('/:type/:title', async (req, res, next) => {
    let type = req.params.type;
    let title = req.params.title;

    let cached_likes = get_cached_likes(type, 0);
    if (cached_likes !== null) {
        for (const cachedLike of cached_likes) {
            if (cachedLike.title === title) {
                return res.json(cachedLike);
            }
        }
    }

    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let search_result = await collection.findOne({title: title});

    if (search_result !== null) {
        res.json({title: search_result.title, like: search_result.like, dislike: search_result.dislike});
    } else {
        res.status(404).send('title not found');
    }
});


router.put('/:type/:title/:mode/:dislike?', async (req, res) => {
    let type = req.params.type;
    let title = req.params.title;
    let mode = req.params.mode;
    let dis = req.params.dislike;
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let search_result = await collection.findOne({title: title});
    if (search_result === null) {
        return res.status(404).send('title not found');
    }

    if (mode === 'inc') {
        if (dis === 'dislike')
            search_result.dislike++;
        else search_result.like++;
    } else {
        if (dis === 'dislike' && search_result.dislike !== 0) {
            search_result.dislike--;
        } else if (dis !== 'dislike' && search_result.like !== 0)
            search_result.like--;
    }

    update_cashed_likes(type, [search_result],'likeUpdate');
    await collection.findOneAndReplace({title: title}, search_result);
    res.json({title: search_result.title, like: search_result.like, dislike: search_result.dislike});
});


export default router;
