const express = require('express')
const router = express.Router();
import {getSerialFiles,getMovieFiles} from '../data';

router.get('/:type/:title/:accuracy', (req, res) => {
    let type = req.params.type;
    let seraching_title = req.params.title;
    let accuracy = req.params.accuracy;
    let files = (type === 'serial') ? getSerialFiles() : getMovieFiles();

    let result = []; // todo handle very low accuracy search : spider-man || spider man
    for (const file of files) {
        for (const thisTitle of file) {
            if ((accuracy === 'low' && thisTitle.title.includes(seraching_title)) ||
                (accuracy === 'high' && thisTitle.title === seraching_title)) {
                result.push(thisTitle);
            }
        }
    }

    if (result.length !== 0) {
        res.json(result);
    } else {
        res.status(404).send('title not found');
    }

});



export default router;
