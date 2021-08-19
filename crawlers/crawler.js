const digimoviez = require('./sources/1digimoviez');
const film2media = require('./sources/2film2media');
const salamdl = require('./sources/4salamdl');
const film2movie = require('./sources/3film2movie');
const valamovie = require('./sources/5valamovie');
const zarmovie = require('./sources/6zarmovie');
const bia2hd = require('./sources/7bia2hd');
const golchindl = require('./sources/8golchindl');
const nineanime = require('./sources/9nineanime');
const bia2anime = require('./sources/10bia2anime');
const animelist = require('./sources/11animelist');
const getCollection = require("../mongoDB");
const {domainChangeHandler} = require('./domainChangeHandler');
const {resetJikanApiCache} = require('./3rdPartyApi/jikanApi');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");


export async function crawler(sourceNumber, crawlMode = 0, handleDomainChange = true) {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            resetJikanApiCache(time1);

            let collection = await getCollection('sources');
            let sourcesObj = await collection.findOne({title: 'sources'});
            let valaMovieTrailerUrl = "";

            let sourcesArray = getSourcesArray(sourcesObj, crawlMode);

            if (sourceNumber === -1) {
                for (let i = 0; i < sourcesArray.length; i++) {
                    let temp = await sourcesArray[i].starter();
                    if (sourcesArray[i].name === 'valamovie') {
                        valaMovieTrailerUrl = temp;
                    }
                }
            } else if (sourceNumber <= sourcesArray.length) {
                let temp = await sourcesArray[sourceNumber - 1].starter();
                if (sourcesArray[sourceNumber - 1].name === 'valamovie') {
                    valaMovieTrailerUrl = temp;
                }
            }

            if (handleDomainChange) {
                await domainChangeHandler(sourcesObj, valaMovieTrailerUrl);
            }

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

export function getSourcesArray(sourcesObj, crawlMode, pageCounter_time = '') {
    let pageCounterTime = new Date((pageCounter_time || sourcesObj.pageCounter_time));
    let now = new Date();
    let daysElapsed = (now.getTime() - pageCounterTime.getTime()) / (24 * 3600 * 1000);

    return [
        {
            name: 'digimoviez',
            starter: () => {
                return digimoviez({
                    ...sourcesObj.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.digimoviez.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.digimoviez.serial_page_count + daysElapsed / 3,
                })
            },
        },
        {
            name: 'film2media',
            starter: () => {
                return film2media({
                    ...sourcesObj.film2media,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.film2media.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'film2movie',
            starter: () => {
                return film2movie({
                    ...sourcesObj.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.film2movie.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'salamdl',
            starter: () => {
                return salamdl({
                    ...sourcesObj.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.salamdl.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'valamovie',
            starter: () => {
                return valamovie({
                    ...sourcesObj.valamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.valamovie.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.valamovie.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'zarmovie',
            starter: () => {
                return zarmovie({
                    ...sourcesObj.zarmovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.zarmovie.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.zarmovie.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'bia2hd',
            starter: () => {
                return bia2hd({
                    ...sourcesObj.bia2hd,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2hd.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.bia2hd.serial_page_count + daysElapsed / 3,
                });
            }
        },
        {
            name: 'golchindl',
            starter: () => {
                return golchindl({
                    ...sourcesObj.golchindl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : sourcesObj.golchindl.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'nineanime',
            starter: () => {
                return nineanime({
                    ...sourcesObj.nineanime,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.nineanime.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'bia2anime',
            starter: () => {
                return bia2anime({
                    ...sourcesObj.bia2anime,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2anime.page_count + daysElapsed,
                });
            }
        },
        {
            name: 'animelist',
            starter: () => {
                return animelist({
                    ...sourcesObj.animelist,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.animelist.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.animelist.serial_page_count + daysElapsed / 3,
                });
            }
        },
    ];
}
