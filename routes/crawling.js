const router = require('express').Router();
const getCollection = require("../mongoDB");
const {crawler} = require("../crawlers/crawler");
const {domainChangeHandler} = require('../crawlers/domainChangeHandler');
const {setCache_all} = require("../cache");

let crawling_flag = false;

router.post('/:password/', async (req, res) => {
    let password = req.params.password;
    let sourceName = req.query.sourceName;
    let mode = req.query.mode ? Number(req.query.mode) : 0;
    let handleDomainChange = req.query.handleDomainChange === 'true' || req.query.handleDomainChange === undefined;
    let handleCastUpdate = req.query.handleCastUpdate === 'true' || req.query.handleCastUpdate === undefined;

    if (!crawling_flag) {
        if (password === process.env["UPDATE_PASSWORD"]) {
            crawling_flag = true;
            let startTime = new Date();
            await crawler(sourceName, mode, handleDomainChange, handleCastUpdate);
            await setCache_all();
            crawling_flag = false;
            let endTime = new Date();
            let crawlingTime = (endTime.getTime() - startTime.getTime()) / 1000;
            return res.json(`crawling ended! (all sources) in ${crawlingTime} s`);
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
            let startTime = new Date();
            await domainChangeHandler(sources, '');
            await setCache_all();
            crawling_flag = false;
            let endTime = new Date();
            let crawlingTime = (endTime.getTime() - startTime.getTime()) / 1000;
            return res.json(`domainChangeHandler api ended in ${crawlingTime} s`);
        } else {
            return res.json('wrong password!');
        }
    } else {
        return res.json('another domainChangeHandler is running');
    }
});

export default router;
