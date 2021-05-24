const digimoviez = require('./sources/1digimoviez');
const film2media = require('./sources/2film2media');
const salamdl = require('./sources/4salamdl');
const film2movie = require('./sources/3film2movie');
const valamovie = require('./sources/5valamovie');
const zarmovie = require('./sources/6zarmovie');
const bia2hd = require('./sources/7bia2hd');
const golchindl = require('./sources/8golchindl');
const getCollection = require("../mongoDB");
const {domainChangeHandler} = require('./domainChangeHandler');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");


export async function startCrawling(sourceNumber, crawlMode = 0) {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            let collection = await getCollection('sources');
            let sources = await collection.findOne({title: 'sources'});
            let valaMovieTrailerUrl = "";

            if (sourceNumber === 'all') {
                await digimoviez({
                    ...sources.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 330,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 50,
                });
                await film2media({
                    ...sources.film2media,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 390,
                });
                await film2movie({
                    ...sources.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 1380,
                });
                await salamdl({
                    ...sources.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 100,
                });
                valaMovieTrailerUrl = await valamovie({
                    ...sources.valamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 895,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 57,
                });
                await zarmovie({
                    ...sources.zarmovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 845,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 50,
                });
                await bia2hd({
                    ...sources.bia2hd,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 555,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 115,
                });
                await golchindl({
                    ...sources.golchindl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 305,
                });
            } else if (sourceNumber === 1) {
                await digimoviez({
                    ...sources.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 330,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 50,
                });
            } else if (sourceNumber === 2) {
                await film2media({
                    ...sources.film2media,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 390,
                });
            } else if (sourceNumber === 3) {
                await film2movie({
                    ...sources.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 1380,
                });
            } else if (sourceNumber === 4) {
                await salamdl({
                    ...sources.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 100,
                });
            } else if (sourceNumber === 5) {
                valaMovieTrailerUrl = await valamovie({
                    ...sources.valamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 895,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 57,
                });
            } else if (sourceNumber === 6) {
                await zarmovie({
                    ...sources.zarmovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 845,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 50,
                });
            } else if (sourceNumber === 7) {
                await bia2hd({
                    ...sources.bia2hd,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 555,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 115,
                });
            } else if (sourceNumber === 8) {
                await golchindl({
                    ...sources.golchindl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 305,
                });
            }

            // todo : add flag to disable domain change handler
            // await domainChangeHandler(sources, valaMovieTrailerUrl);

            let time2 = new Date();
            let crawling_time = time2.getTime() - time1.getTime();
            await Sentry.captureMessage(`crawling done in : ${crawling_time}ms`);
            resolve();
        } catch (error) {
            await saveError(error);
            reject();
        }
    });
}

