const {getDatesBetween} = require('./utils');
const {getSourcesObjDB, getStatusObjDB, updateMovieCollectionDB, updateStatusObjDB} = require("../data/dbMethods");
const {getSourcesArray} = require('./sourcesArray');
const {domainChangeHandler} = require('./domainChangeHandler');
const {updateJikanData} = require('./3rdPartyApi/jikanApi');
const {updateImdbData} = require('./3rdPartyApi/imdbApi');
const Sentry = require('@sentry/node');
const {saveError} = require("../error/saveError");
const {flushCachedData} = require('../api/middlewares/moviesCache');
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
        flushCachedData();
        isCrawling = true;
        let startTime = new Date();
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
        flushCachedData();
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
