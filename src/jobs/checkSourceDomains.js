import * as crawlerMethodsDB from "../data/db/crawlerMethodsDB.js";
import * as serverAnalysisDbMethods from "../data/db/serverAnalysisDbMethods.js";
import {checkUrlWork} from "../crawlers/domainChangeHandler.js";
import {saveError} from "../error/saveError.js";
import {getCrawlerWarningMessages} from "../crawlers/status/crawlerWarnings.js";
import {crawler} from "../crawlers/crawler.js";
import {removeSource, updateSourceResponseStatus} from "../data/db/admin/adminCrawlerDbMethods.js";
import {getDatesBetween} from "../crawlers/utils/utils.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import config from "../config/index.js";
import {checkCrawlerIsDisabledByConfigsDb} from "../config/configsDb.js";
import {getSourcesArray} from "../crawlers/sourcesArray.js";


export default function (agenda) {
    agenda.define("check movie source domains", {concurrency: 1}, async (job) => {
        if (!config.crawler.disable && !checkCrawlerIsDisabledByConfigsDb() && (Date.now() - config.serverStartTime > 30 * 60 * 1000)) {
            await checkCrawlerDomainsJobFunc();
        }
    });
}


export async function checkCrawlerDomainsJobFunc(extraConfigs = null) {
    try {
        updateCronJobsStatus('checkCrawlerDomains', 'start');
        let sourcesObj = await crawlerMethodsDB.getSourcesObjDB();
        if (!sourcesObj || sourcesObj === 'error') {
            updateCronJobsStatus('checkCrawlerDomains', 'end', sourcesObj);
            return {status: 'error'};
        }

        let keys = Object.keys(sourcesObj);
        const sources = [];
        for (let i = 0; i < keys.length; i++) {
            if (['_id', 'title'].includes(keys[i])) {
                continue;
            }
            if (sourcesObj[keys[i]].disabled && sourcesObj[keys[i]].isManualDisable) {
                //ignore source if disabled manually
                continue;
            }
            sources.push({
                sourceName: keys[i],
                ...sourcesObj[keys[i]],
            });
        }

        updateCronJobsStatus('checkCrawlerDomains', 'checkingCookies');
        for (let i = 0; i < sources.length; i++) {
            let cookies = sources[i].cookies;
            if (cookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                const warningMessages = getCrawlerWarningMessages(sources[i].sourceName);
                await serverAnalysisDbMethods.saveCrawlerWarning(warningMessages.expireCookie);
            }
        }

        updateCronJobsStatus('checkCrawlerDomains', 'checkingUrls');
        let needToCrawl = false;
        let promiseArray = [];
        for (let i = 0; i < sources.length; i++) {
            if (sources[i].isManualDisable) {
                continue;
            }

            let prom = checkUrlWork(sources[i].sourceName, sources[i].movie_url, extraConfigs).then(async checkUrlResult => {
                const warningMessages = getCrawlerWarningMessages(sources[i].sourceName, checkUrlResult);
                if (checkUrlResult === "error") {
                    await serverAnalysisDbMethods.saveCrawlerWarning(warningMessages.notWorking);
                    let responseStatus = await updateSourceResponseStatus(sources[i].sourceName, false);
                    if (responseStatus !== 'error' && responseStatus !== 'notfound' && responseStatus !== 0 && getDatesBetween(new Date(), responseStatus).days >= 6) {
                        //source is not working for 6 days
                        sources[i].disabled = true;
                        await removeSource(sources[i].sourceName, null, false);
                    }
                } else if (checkUrlResult === "ok") {
                    await serverAnalysisDbMethods.resolveCrawlerWarning(warningMessages.notWorking);
                    await serverAnalysisDbMethods.resolveCrawlerWarning(warningMessages.domainChange);
                    //reCrawl source if it was not responding in last 5 days
                    let responseStatus = await updateSourceResponseStatus(sources[i].sourceName, true);
                    updateCronJobsStatus('checkCrawlerDomains', 'starting crawler on source activation', sources[i].sourceName);
                    if (responseStatus !== 'error' && responseStatus !== 'notfound' && responseStatus !== 0 && getDatesBetween(new Date(), responseStatus).days >= 5) {
                        await crawler(sources[i].sourceName, {
                            crawlMode: 2,
                            handleDomainChangeOnly: false,
                            handleDomainChange: false,
                            castUpdateState: 'none',
                        });
                    }
                } else if (checkUrlResult !== "ok") {
                    await serverAnalysisDbMethods.saveCrawlerWarning(warningMessages.domainChange);
                    needToCrawl = true;
                }
            });
            promiseArray.push(prom);
        }
        await Promise.allSettled(promiseArray);
        if (needToCrawl) {
            updateCronJobsStatus('checkCrawlerDomains', 'starting crawler because of url change', 'all sources');
            await crawler('', {
                handleDomainChangeOnly: true,
                handleDomainChange: true,
                castUpdateState: 'ignore',
            });
        }

        updateCronJobsStatus('checkCrawlerDomains', 'checkingVipStatus');
        let sourcesArray = getSourcesArray(sourcesObj, 0, {
            returnAfterExtraction: true,
        });
        for (let i = 0; i < sources.length; i++) {
            if (sources[i].disabled || sources[i].isManualDisable) {
                continue;
            }

            let findSource = sourcesArray.find(item => item.name === sources[i].sourceName);
            if (findSource) {
                let pagesAndCount = await findSource.starter();
                if (pagesAndCount[pagesAndCount.length - 1] < 8) {
                    const crawlerWarningMessages = getCrawlerWarningMessages(sources[i].sourceName);
                    await serverAnalysisDbMethods.saveCrawlerWarning(crawlerWarningMessages.sourceStatus.possibleVip);
                }
            }
        }

        updateCronJobsStatus('checkCrawlerDomains', 'end');
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('checkCrawlerDomains', 'end');
        return {status: 'error'};
    }
}