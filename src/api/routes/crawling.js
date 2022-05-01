import config from "../../config/index.js";
import {Router} from "express";
import {crawler} from "../../crawlers/crawler.js";

const router = Router();

//todo : add validation --> role:admin

router.put('/:password/', async (req, res) => {
    let password = req.params.password;
    let sourceName = req.query.sourceName;
    let mode = req.query.mode ? Number(req.query.mode) : 0;
    let handleDomainChange = req.query.handleDomainChange !== 'false';
    let handleCastUpdate = req.query.handleCastUpdate !== 'false';

    if (password === config.crawlerStarterPassword) {
        let crawlingResult = await crawler(sourceName, mode, {
            handleDomainChange,
            handleCastUpdate
        });
        return res.json(crawlingResult);
    } else {
        return res.json('wrong password!');
    }
});

router.put('/domainChange/:password', async (req, res) => {
    let password = req.params.password;

    if (password === config.crawlerStarterPassword) {
        let crawlingResult = await crawler('', 2, {
            handleDomainChangeOnly: true,
        });
        return res.json(crawlingResult);
    } else {
        return res.json('wrong password!');
    }
});


export default router;
