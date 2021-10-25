const digimoviez = require('./sources/1digimoviez');
const salamdl = require('./sources/4salamdl');
const film2movie = require('./sources/3film2movie');
const avamovie = require('./sources/5avamovie');
const bia2hd = require('./sources/7bia2hd');
const golchindl = require('./sources/8golchindl');
const bia2anime = require('./sources/10bia2anime');
const {getDatesBetween} = require('./utils');
const {getSourcesObjDB, getStatusObjDB, updateMovieCollectionDB, updateStatusObjDB} = require("../dbMethods");
const {domainChangeHandler} = require('./domainChangeHandler');
const {resetJikanApiCache, updateJikanData} = require('./3rdPartyApi/jikanApi');
const {updateImdbData} = require('./3rdPartyApi/imdbApi');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");
const {setCache_all} = require("../cache");

export let _handleCastUpdate = true;
let isCrawling = false;

export async function crawler(sourceName, crawlMode = 0, {
    handleDomainChangeOnly = false,
    handleDomainChange = true,
    handleCastUpdate = true
} = {}) {
    try {
        _handleCastUpdate = handleCastUpdate;
        if (isCrawling) {
            return 'another crawling is running';
        }
        isCrawling = true;
        let startTime = new Date();
        resetJikanApiCache(startTime);
        await handleDataBaseStates();
        await updateImdbData();
        await updateJikanData();

        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            isCrawling = false;
            Sentry.captureMessage('crawling cancelled : sourcesObj is null');
            return 'crawling cancelled : sourcesObj is null';
        }
        let sourcesArray = getSourcesArray(sourcesObj, crawlMode);

        if (!handleDomainChangeOnly) {
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
        }

        if (handleDomainChangeOnly || handleDomainChange) {
            await domainChangeHandler(sourcesObj);
        }

        isCrawling = false;
        let endTime = new Date();
        let message = `crawling done in : ${getDatesBetween(endTime, startTime).seconds}s`;
        Sentry.captureMessage(message);
        await setCache_all();
        return message;
    } catch (error) {
        await saveError(error);
        isCrawling = false;
        return 'error';
    }
}

async function handleDataBaseStates() {
    try {
        let states = await getStatusObjDB();
        if (!states) {
            return;
        }
        let now = new Date();
        let lastMonthlyResetDate = new Date(states.lastMonthlyResetDate);
        if (now.getDate() === 1 && getDatesBetween(now, lastMonthlyResetDate).days > 29) {
            await updateMovieCollectionDB({
                like_month: 0,
                view_month: 0,
            });
            await updateStatusObjDB({lastMonthlyResetDate: now});
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
            name: 'bia2anime',
            starter: () => {
                return bia2anime({
                    ...sourcesObj.bia2anime,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : sourcesObj.bia2anime.page_count + daysElapsed,
                });
            }
        },
    ];
}
