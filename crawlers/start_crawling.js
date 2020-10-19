const film2media = require('./sources/film2media');
const digimovies = require('./sources/digimovies');
const salamdl = require('./sources/salamdl');
const film2movie = require('./sources/film2movie');
const mrmovie = require('./sources/mrmovie');
const topmovies = require('./sources/topmovies');
const valamovie = require('./sources/valamovie');
import getCollection from "../mongoDB";
const posterDomainChange_handler = require('./posterDomainChange_handler');
import {save_error} from "../save_logs";

async function start_crawling() {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            let collection = await getCollection('sources');
            let sources = await collection.findOne({title:'sources'});

            await digimovies(sources.digimovies);
            await film2media(sources.film2media);
            await film2movie(sources.film2movie);
            await mrmovie(sources.mrmovie);
            await salamdl(sources.salamdl);
            await topmovies(sources.topmovies);
            await valamovie(sources.valamovie);

            await posterDomainChange_handler(sources);

            let time2 = new Date();
            let crawling_time = time2.getTime() - time1.getTime();
            save_error({time: time2, crawling_time: crawling_time});
            resolve();

        } catch (error) {
            error.massage = "module: start_crawling >> start_crawling ";
            error.time = new Date();
            save_error(error);
            reject();
        }
    });
}

export default start_crawling;
