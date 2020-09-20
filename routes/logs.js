import {get_saved_crawling_time, get_saved_error} from "../save_logs";
const express = require('express');
const router = express.Router();

router.get('/:type/:count?', async (req, res) => {
    let type = req.params.type;
    let count = Number(req.params.count) || 0;

    let data = (type === 'error') ? await get_saved_error(count) : await get_saved_crawling_time(count);
    return res.json(data);
});


export default router;
