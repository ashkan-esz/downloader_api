import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import {checkUrlWork} from "../crawlers/domainChangeHandler.js";
import {saveError} from "../error/saveError.js";
import {getCrawlerWarningMessages} from "../crawlers/crawlerWarnings.js";


export default function (agenda) {
    agenda.define("check movie source domains", {concurrency: 1}, async (job) => {
        try {
            let result = await crawlerMethodsDB.getSourcesObjDB();
            if (!result || result === 'error') {
                return {status: 'error'};
            }

            let keys = Object.keys(result);
            const sources = [];
            const warnings = [];
            for (let i = 0; i < keys.length; i++) {
                if (['_id', 'title', 'pageCounter_time'].includes(keys[i])) {
                    continue;
                }
                sources.push({
                    sourceName: keys[i],
                    ...result[keys[i]],
                });
            }

            for (let i = 0; i < sources.length; i++) {
                let cookies = sources[i].cookies;
                if (cookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    warnings.push(getCrawlerWarningMessages(sources[i].sourceName).expireCookie);
                }
            }

            let promiseArray = [];
            for (let i = 0; i < sources.length; i++) {
                let prom = checkUrlWork(sources[i].sourceName, sources[i].movie_url).then(async checkUrlResult => {
                    const warningMessages = getCrawlerWarningMessages(sources[i].sourceName, checkUrlResult);
                    if (checkUrlResult === "error") {
                        warnings.push(warningMessages.notWorking);
                    } else if (checkUrlResult === "ok") {
                        await serverAnalysisDbMethods.resolveCrawlerWarning(warningMessages.notWorking);
                        await serverAnalysisDbMethods.resolveCrawlerWarning(warningMessages.domainChange);
                    } else if (checkUrlResult !== "ok") {
                        warnings.push(warningMessages.domainChange);
                    }
                });
                promiseArray.push(prom);
            }
            await Promise.allSettled(promiseArray);
            await Promise.allSettled(warnings.map(w => serverAnalysisDbMethods.saveCrawlerWarning(w)));
            return {status: 'ok'};
        } catch (error) {
            saveError(error);
            return {status: 'error'};
        }
    });
}
