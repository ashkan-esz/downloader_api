const express = require('express')
const router = express.Router()
import {getSerialLikes, getMovieLikes, updateLikes} from '../data';


router.get('/:type/top',(req,res) =>{
    let type = req.params.type;
    let likes = (type === 'serial') ? getSerialLikes() : getMovieLikes();
    let top = likes.sort((a,b)=> b.like - a.like).slice(0,21);
    res.json(top);
});

router.get('/:type/:title', (req, res,next) => {
    let type = req.params.type;
    let title = req.params.title;
    let likes = (type === 'serial') ? getSerialLikes() : getMovieLikes();
    let result = [];
    for (const like of likes) {
        if (like.title === title) {
            result.push(like);
        }
    }

    if (result.length !== 0) {
        res.json(result);
    } else {
        res.status(404).send('title not found');
    }
});


router.put('/:type/:title/:mode/:dislike?', (req, res) => {
    let type = req.params.type;
    let title = req.params.title;
    let mode = req.params.mode;
    let dis = req.params.dislike;
    let likes = (type === 'serial') ? getSerialLikes() : getMovieLikes();
    for (const like of likes) {
        if (like.title === title) {

            if (mode === 'inc') {
                if (dis === 'dislike')
                    like.dislike++;
                else like.like++;
            } else {
                if (dis === 'dislike') {
                    if (like.dislike !== 0)
                        like.dislike--;
                } else if (like.like !== 0)
                    like.like--;
            }
            updateLikes(likes, type);
            res.json(like)
            return;
        }
    }
    res.status(404).send('title not found');
});


export default router;
