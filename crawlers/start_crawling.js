const film2media = require('./sources/film2media');
const digimovies = require('./sources/digimovies');
const salamdl = require('./sources/salamdl');
const film2movie = require('./sources/film2movie');
const mrmovie = require('./sources/mrmovie');
const topmovies = require('./sources/topmovies');
const valamovie = require('./sources/valamovie');
const getCollection = require("../mongoDB");
const domainChangeHandler = require('./domainChangeHandler');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");

async function start_crawling() {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            let collection = await getCollection('sources');
            let sources = await collection.findOne({title: 'sources'});
            let recentTitles = [];
            await digimovies(sources.digimovies, recentTitles);
            await film2media(sources.film2media, recentTitles);
            await film2movie(sources.film2movie, recentTitles);
            await mrmovie(sources.mrmovie, recentTitles);
            await salamdl(sources.salamdl, recentTitles);
            await topmovies(sources.topmovies, recentTitles);
            await valamovie(sources.valamovie, recentTitles);

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

export default start_crawling;
