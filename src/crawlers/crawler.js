import {getDatesBetween} from "./utils";
import {getSourcesObjDB, getStatusObjDB, updateMovieCollectionDB, updateStatusObjDB} from "../data/dbMethods";
import {getSourcesArray} from "./sourcesArray";
import {domainChangeHandler} from "./domainChangeHandler";
import {updateJikanData} from "./3rdPartyApi/jikanApi";
import {updateImdbData} from "./3rdPartyApi/imdbApi";
import Sentry from "@sentry/node";
import {saveError} from "../error/saveError";
import {flushCachedData} from "../api/middlewares/moviesCache";

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
                for (let i = 0; i < sourcesArray.length; i++) {
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
    //todo : check agenda
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
