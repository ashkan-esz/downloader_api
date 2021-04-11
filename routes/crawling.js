const router = require('express').Router();
const getCollection = require("../mongoDB");
const {startCrawling} = require("../crawlers/startCrawling");
const {domainChangeHandler} = require('../crawlers/domainChangeHandler');
const {setCache_all} = require("../cache");

let crawling_flag = false;

router.post('/crawlAll/:password/:mode?', async (req, res) => {
    let password = req.params.password;
    let mode = req.params.mode;
    mode = mode ? Number(mode) : 0;
    mode = mode > 2 ? 2 : mode;
    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            crawling_flag = true;
            await startCrawling('all', mode);
            await setCache_all();
            crawling_flag = false;
            return res.json('crawling ended! (all sources)');
        } else {
            return res.json('wrong password!');
        }
    } else {
        return res.json('another crawling is running');
    }
});

router.post('/crawlSingleSource/:sourceNumber/:password/:mode?', async (req, res) => {
    let sourceNumber = Number(req.params.sourceNumber);
    let password = req.params.password;
    let mode = req.params.mode;
    mode = mode ? Number(mode) : 0;
    mode = mode > 2 ? 2 : mode;
    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            crawling_flag = true;
            await startCrawling(sourceNumber, mode);
            await setCache_all();
            crawling_flag = false;
            return res.json(`crawling ended! (source : ${sourceNumber})`);
        } else {
            return res.json('wrong password!');
        }
    } else {
        return res.json('another crawling is running');
    }
});

router.post('/domainChange/:password', async (req, res) => {
    let password = req.params.password;
    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            let collection = await getCollection('sources');
            let sources = await collection.findOne({title: 'sources'});
            crawling_flag = true;
            await domainChangeHandler(sources);
            await setCache_all();
            crawling_flag = false;
            return res.json('domainChangeHandler api ended!');
        } else {
            return res.json('wrong password!');
        }
    } else {
        return res.json('another domainChangeHandler is running');
    }
});

export default router;
