const express = require('express');
const router = express.Router();
import getCollection from '../mongoDB';


router.get('/:type/:mode/titles/:count?', async (req, res) => {
    let type = req.params.type;
    let mode = req.params.mode;
    let count = Number(req.params.count) || 25;
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let result = (mode === 'news') ? await collection.find({}).sort({insert_date: -1}).limit(count).toArray() :
        await collection.find({}).sort({update_date: -1}).limit(count).toArray();
    result = result.map(thisTitle => thisTitle.title);
    return res.json(result);
});

router.get('/:type/:mode/:count?', async (req, res) => {
    let type = req.params.type;
    let mode = req.params.mode;
    let count = Number(req.params.count) || 25;
    let collection_name = (type === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let result = (mode === 'news') ? await collection.find({}).sort({insert_date: -1}).limit(count).toArray() :
        await collection.find({}).sort({update_date: -1}).limit(count).toArray();
    return res.json(result);
});

export default router;