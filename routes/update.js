const express = require('express')
const router = express.Router();
import {getSerialUpdates, getMovieUpdates} from "../data";
const fs = require('fs');

router.get('/:type/titles/:count?', (req, res) => {
    let type = req.params.type;
    let count = req.params.count || 50;
    count = Math.min(count, 50);
    let updates = (type === 'serial') ? getSerialUpdates() : getMovieUpdates();

    let result = [];
    for (let i = 0; i < count && i < updates.length; i++) {
        result.push(updates[i].title);
    }

    if (result.length !== 0) {
        res.json(result);
    } else {
        res.status(404).send('title not found');
    }

});

router.get('/:type/title/:title', (req, res) => {
    let type = req.params.type;
    let searching_title = req.params.title;

    let updates = (type === 'serial') ? getSerialUpdates() : getMovieUpdates();

    for (const update of updates) {
        if (update.title === searching_title) {
            res.json(update);
            return;
        }
    }

    res.status(404).send('title not found');
});


router.get('/:type/:count?', (req, res) => {
    let type = req.params.type;
    let count = req.params.count || 50;


    try {
        let json_file = fs.readFileSync('crawlers/serial_files/serial_updates.json', 'utf8')
        let serial_updates = JSON.parse(json_file);
        res.json(serial_updates)
    }catch (error){
        let temp = [];
        temp.push(fs.readdirSync('./'))
        temp.push(fs.readdirSync('../'))
        temp.push(fs.readdirSync('../../'))
        res.json(temp);
    }

    // res.json(type);

    // let updates = (type === 'serial') ? getSerialUpdates() : getMovieUpdates();
    //
    // let result = updates.slice(0, Math.min(Number(count), 51, updates.length))
    //
    // if (result.length !== 0) {
    //     res.json(result);
    // } else {
    //     res.status(404).send('title not found');
    // }
});


export default router;