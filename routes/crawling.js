const router = require('express').Router();
const {start_crawling} = require("../crawlers/start_crawling");
const {resetCache_all, setCache_all} = require("../cache");

let crawling_flag = false;
router.post('/:password/:mode?', async (req, res) => {
    let password = req.params.password;
    let mode = req.params.mode;
    mode = mode ? Number(mode) : 0;
    mode = mode > 2 ? 2 : mode;
    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            crawling_flag = true;
            await start_crawling(mode);
            //handle cache
            await resetCache_all();
            await setCache_all();
            crawling_flag = false;
            console.log('crawling api ended!');
            return res.json('crawling ended');
        } else {
            return res.json('wrong password!');
        }
    } else {
        return res.json('another crawling is running');
    }
});


export default router;
