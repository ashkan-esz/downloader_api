import start_crawling from "../crawlers/start_crawling";
import {set_cached_news, set_cached_updates} from "../cache";
const express = require('express');
const router = express.Router();

let crawling_flag = false;
router.post('/:password', async (req, res) => {
    let password = req.params.password;
    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            crawling_flag = true;
            await start_crawling();
            crawling_flag = false;
            //reset cached data
            await set_cached_news();
            await set_cached_updates();
            return res.json('crawling ended');
        }
    } else {
        return res.json('another crawling is running');
    }
    return res.json('wrong password!');
});


export default router;
