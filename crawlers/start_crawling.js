const film2media = require('./sources/film2media');
const digimovies = require('./sources/digimovies');
const salamdl = require('./sources/salamdl');
const film2movie = require('./sources/film2movie');
const mrmovie = require('./sources/mrmovie');
const topmovies = require('./sources/topmovies');
const valamovie = require('./sources/valamovie');
const getCollection = require("../mongoDB");
const {domainChangeHandler} = require('./domainChangeHandler');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");

export async function start_crawling(sourceNumber, crawlMode = 0) {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            let collection = await getCollection('sources');
            let sources = await collection.findOne({title: 'sources'});
            let recentTitles = [];
            if (crawlMode === 0) {
                if (sourceNumber === 'all') {
                    await digimovies(sources.digimovies, recentTitles);
                    await film2media(sources.film2media, recentTitles);
                    await film2movie(sources.film2movie, recentTitles);
                    await salamdl(sources.salamdl, recentTitles);
                    await valamovie(sources.valamovie, recentTitles);
                    await Sentry.captureMessage('source crawling done! (valamovie)');
                } else if (sourceNumber === 0) {
                    await digimovies(sources.digimovies, recentTitles);
                } else if (sourceNumber === 1) {
                    await film2media(sources.film2media, recentTitles);
                } else if (sourceNumber === 2) {
                    await film2movie(sources.film2movie, recentTitles);
                } else if (sourceNumber === 3) {
                    await salamdl(sources.salamdl, recentTitles);
                } else if (sourceNumber === 4) {
                    await valamovie(sources.valamovie, recentTitles);
                }
                // await mrmovie(sources.mrmovie, recentTitles);
                // await topmovies(sources.topmovies, recentTitles);
            } else {
                if (sourceNumber === 'all') {
                    let reCrawl = crawlMode === 2;
                    await digimovies({
                        ...sources.digimovies,
                        page_count: crawlMode === 1 ? 20 : 310,
                        serial_page_count: crawlMode === 1 ? 5 : 50
                    }, recentTitles, reCrawl);
                    await film2media({
                        ...sources.film2media,
                        page_count: crawlMode === 1 ? 30 : 380,
                    }, recentTitles, reCrawl);
                    await film2movie({
                        ...sources.film2movie,
                        page_count: crawlMode === 1 ? 30 : 1345,
                    }, recentTitles, reCrawl);
                    await salamdl({
                        ...sources.salamdl,
                        page_count: crawlMode === 1 ? 30 : 1155,
                    }, recentTitles, reCrawl);
                    await valamovie({
                        ...sources.valamovie,
                        page_count: crawlMode === 1 ? 20 : 870,
                        serial_page_count: crawlMode === 1 ? 5 : 55
                    }, recentTitles, reCrawl);
                    await Sentry.captureMessage('source crawling done! (valamovie)');
                } else if (sourceNumber === 0) {
                    await digimovies({
                        ...sources.digimovies,
                        page_count: crawlMode === 1 ? 20 : 310,
                        serial_page_count: crawlMode === 1 ? 5 : 50
                    }, recentTitles, reCrawl);
                } else if (sourceNumber === 1) {
                    await film2media({
                        ...sources.film2media,
                        page_count: crawlMode === 1 ? 30 : 380,
                    }, recentTitles, reCrawl);
                } else if (sourceNumber === 2) {
                    await film2movie({
                        ...sources.film2movie,
                        page_count: crawlMode === 1 ? 30 : 1345,
                    }, recentTitles, reCrawl);
                } else if (sourceNumber === 3) {
                    await salamdl({
                        ...sources.salamdl,
                        page_count: crawlMode === 1 ? 30 : 1155,
                    }, recentTitles, reCrawl);
                } else if (sourceNumber === 4) {
                    await valamovie({
                        ...sources.valamovie,
                        page_count: crawlMode === 1 ? 20 : 870,
                        serial_page_count: crawlMode === 1 ? 5 : 55
                    }, recentTitles, reCrawl);
                }
            }

            await domainChangeHandler(sources);

            let time2 = new Date();
            let crawling_time = time2.getTime() - time1.getTime();
            Sentry.captureMessage(`crawling done in : ${crawling_time}s`);
            resolve();
        } catch (error) {
            saveError(error);
            reject();
        }
    });
}

