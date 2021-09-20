const digimoviez = require('./sources/1digimoviez');
const film2media = require('./sources/2film2media');
const salamdl = require('./sources/4salamdl');
const film2movie = require('./sources/3film2movie');
const avamovie = require('./sources/5avamovie');
const bia2hd = require('./sources/7bia2hd');
const golchindl = require('./sources/8golchindl');
const nineanime = require('./sources/9nineanime');
const bia2anime = require('./sources/10bia2anime');
const animelist = require('./sources/11animelist');
const {getDatesBetween} = require('./utils');
const getCollection = require("../mongoDB");
const {domainChangeHandler} = require('./domainChangeHandler');
const {resetJikanApiCache} = require('./3rdPartyApi/jikanApi');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");


export async function crawler(sourceName, crawlMode = 0, handleDomainChange = true) {
    try {
        let time1 = new Date();
        resetJikanApiCache(time1);
        await handleDataBaseStates();

        let collection = await getCollection('sources');
        let sourcesObj = await collection.findOne({title: 'sources'});

        let sourcesArray = getSourcesArray(sourcesObj, crawlMode);

        if (!sourceName) {
            //start from anime sources (11)
            for (let i = sourcesArray.length - 1; i >= 0; i--) {
                await sourcesArray[i].starter();
            }
        } else {
            let findSource = sourcesArray.find(x => x.name === sourceName);
            if (findSource) {
                await findSource.starter();
            }
        }

        if (handleDomainChange) {
            await domainChangeHandler(sourcesObj);
        }

        let time2 = new Date();
        await Sentry.captureMessage(`crawling done in : ${getDatesBetween(time2, time1).seconds}s`);
    } catch (error) {
        await saveError(error);
    }
}

async function handleDataBaseStates() {
    try {
        let statesCollection = await getCollection('states');
        let states = await statesCollection.findOne({name: 'states'});
        let now = new Date();
        let lastMonthlyResetDate = new Date(states.lastMonthlyResetDate);
        if (now.getDate() === 1 && getDatesBetween(now, lastMonthlyResetDate).days > 29) {
            let moviesCollection = await getCollection('movies');
            await moviesCollection.updateMany({}, {
                $set: {
                    like_month: 0,
                    view_month: 0,
                }
            });
            await statesCollection.findOneAndUpdate({name: 'states'}, {
                $set: {
                    lastMonthlyResetDate: now,
                }
            });
        }
    } catch (error) {
        saveError(error);
    }
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
            name: 'avamovie',
            starter: () => {
                return avamovie({
                    ...sourcesObj.avamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.avamovie.page_count + daysElapsed,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : sourcesObj.avamovie.serial_page_count + daysElapsed / 3,
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
