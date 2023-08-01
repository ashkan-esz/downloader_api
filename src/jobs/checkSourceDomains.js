import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import {checkUrlWork} from "../crawlers/domainChangeHandler.js";
import {saveError} from "../error/saveError.js";
import {getCrawlerWarningMessages} from "../crawlers/status/crawlerWarnings.js";
import {crawler} from "../crawlers/crawler.js";
import {updateSourceResponseStatus} from "../data/db/admin/adminCrawlerDbMethods.js";


export default function (agenda) {
    agenda.define("check movie source domains", {concurrency: 1}, async (job) => {
        try {
            let result = await crawlerMethodsDB.getSourcesObjDB();
            if (!result || result === 'error') {
                return {status: 'error'};
            }

            let keys = Object.keys(result);
            const sources = [];
            for (let i = 0; i < keys.length; i++) {
                if (['_id', 'title'].includes(keys[i])) {
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
                    const warningMessages = getCrawlerWarningMessages(sources[i].sourceName);
                    await serverAnalysisDbMethods.saveCrawlerWarning(warningMessages.expireCookie);
                }
            }

            let needToCrawl = false;
            let promiseArray = [];
            for (let i = 0; i < sources.length; i++) {
                let prom = checkUrlWork(sources[i].sourceName, sources[i].movie_url).then(async checkUrlResult => {
                    const warningMessages = getCrawlerWarningMessages(sources[i].sourceName, checkUrlResult);
                    if (checkUrlResult === "error") {
                        await serverAnalysisDbMethods.saveCrawlerWarning(warningMessages.notWorking);
                        await updateSourceResponseStatus(sources[i].sourceName, false);
                    } else if (checkUrlResult === "ok") {
                        await serverAnalysisDbMethods.resolveCrawlerWarning(warningMessages.notWorking);
                        await serverAnalysisDbMethods.resolveCrawlerWarning(warningMessages.domainChange);
                        await updateSourceResponseStatus(sources[i].sourceName, true);
                    } else if (checkUrlResult !== "ok") {
                        await serverAnalysisDbMethods.saveCrawlerWarning(warningMessages.domainChange);
                        needToCrawl = true;
                    }
                });
                promiseArray.push(prom);
            }
            await Promise.allSettled(promiseArray);
            if (needToCrawl) {
                await crawler('', {
                    handleDomainChangeOnly: true,
                    handleDomainChange: true,
                    handleCastUpdate: false,
                });
            }
            return {status: 'ok'};
        } catch (error) {
            saveError(error);
            return {status: 'error'};
        }
    });
}
