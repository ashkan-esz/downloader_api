import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import {checkUrlWork} from "../crawlers/domainChangeHandler.js";
import {saveError} from "../error/saveError.js";


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
                    warnings.push(`Source (${sources[i].sourceName}) has expired cookie(s)`);
                }
            }

            let promiseArray = [];
            for (let i = 0; i < sources.length; i++) {
                let prom = checkUrlWork(sources[i].sourceName, sources[i].movie_url).then(async checkUrlResult => {
                    const notWorkingMessage = `Source (${sources[i].sourceName}) url not working`;
                    const changeDomainMessage = `Source (${sources[i].sourceName}) domain changed to (${checkUrlResult})`;
                    if (checkUrlResult === "error") {
                        warnings.push(notWorkingMessage);
                    } else if (checkUrlResult === "ok") {
                        await serverAnalysisDbMethods.resolveCrawlerWarning(notWorkingMessage);
                        await serverAnalysisDbMethods.resolveCrawlerWarning(changeDomainMessage);
                    } else if (checkUrlResult !== "ok") {
                        warnings.push(changeDomainMessage);
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

