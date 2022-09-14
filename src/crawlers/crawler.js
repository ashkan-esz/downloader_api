import {getDatesBetween} from "./utils.js";
import {getSourcesObjDB, updateSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getSourcesArray} from "./sourcesArray.js";
import {domainChangeHandler} from "./domainChangeHandler.js";
import * as Sentry from "@sentry/node";
import {saveError} from "../error/saveError.js";
import {flushCachedData} from "../api/middlewares/moviesCache.js";

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

        let sourcesObj = await getSourcesObjDB();
        if (!sourcesObj) {
            isCrawling = false;
            Sentry.captureMessage('crawling cancelled : sourcesObj is null');
            return 'crawling cancelled : sourcesObj is null';
        }

        const sourcesNames = Object.keys(sourcesObj);
        let sourcesArray = getSourcesArray(sourcesObj, crawlMode);
        sourcesArray = sourcesArray.filter(item => sourcesNames.includes(item.name));
        let fullyCrawledSources = [];

        if (!handleDomainChangeOnly) {
            if (!sourceName) {
                for (let i = 0; i < sourcesArray.length; i++) {
                    await sourcesArray[i].starter();
                    if (crawlMode === 2) {
                        fullyCrawledSources.push(sourcesArray[i].name);
                        let now = new Date();
                        sourcesObj[sourcesArray[i].name].lastCrawlDate = now;
                        await updateSourcesObjDB({
                            [sourcesArray[i].name + '.lastCrawlDate']: now,
                        });
                    }
                }
            } else {
                let findSource = sourcesArray.find(x => x.name === sourceName);
                if (findSource) {
                    await findSource.starter();
                    if (crawlMode === 2) {
                        fullyCrawledSources.push(sourceName);
                        let now = new Date();
                        sourcesObj[sourceName].lastCrawlDate = now;
                        await updateSourcesObjDB({
                            [sourceName + '.lastCrawlDate']: now,
                        });
                    }
                }
            }
        }

        if (handleDomainChangeOnly || handleDomainChange) {
            await domainChangeHandler(sourcesObj, fullyCrawledSources);
        }

        isCrawling = false;
        let message = `crawling done in : ${getDatesBetween(new Date(), startTime).minutes}min`;
        Sentry.captureMessage(message);
        flushCachedData();
        return message;
    } catch (error) {
        await saveError(error);
        isCrawling = false;
        return 'error';
    }
}
