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

            await digimovies(sources.digimovies);
            await film2media(sources.film2media);
            await film2movie(sources.film2movie);
            await mrmovie(sources.mrmovie);
            await salamdl(sources.salamdl);
            await topmovies(sources.topmovies);
            await valamovie(sources.valamovie);

            await domainChangeHandler(sources);

            let time2 = new Date();
            let crawling_time = time2.getTime() - time1.getTime();
            Sentry.captureMessage(crawling_time.toString());
            resolve();
        } catch (error) {
            saveError(error);
            reject();
        }
    });
}

export default start_crawling;
