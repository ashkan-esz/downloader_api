import axios from "axios";
import * as Sentry from "@sentry/node";
import {wrapper} from 'axios-cookiejar-support';
import {CookieJar} from 'tough-cookie';
import {updateSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getSourcesArray} from "./sourcesArray.js";
import {getPageData} from "./remoteHeadlessBrowser.js";
import {getDatesBetween} from "./utils.js";
import {saveError} from "../error/saveError.js";


export async function domainChangeHandler(sourcesObj, fullyCrawledSources) {
    try {
        let pageCounter_time = sourcesObj.pageCounter_time;
        delete sourcesObj._id;
        delete sourcesObj.title;
        delete sourcesObj.pageCounter_time;
        let sourcesUrls = Object.keys(sourcesObj).map(sourceName => ({
            sourceName: sourceName,
            url: sourcesObj[sourceName].movie_url
        }));

        let changedSources = await checkSourcesUrl(sourcesUrls);

        if (changedSources.length > 0) {
            Sentry.captureMessage('start domain change handler');
            updateSourceFields(sourcesObj, sourcesUrls);
            await updateDownloadLinks(sourcesObj, pageCounter_time, changedSources, fullyCrawledSources);
            Sentry.captureMessage('source domain changed');
        }
    } catch (error) {
        await saveError(error);
    }
}

async function checkSourcesUrl(sourcesUrls) {
    let changedSources = [];
    try {
        for (let i = 0; i < sourcesUrls.length; i++) {
            let responseUrl;
            let homePageLink = sourcesUrls[i].url.replace(/\/page\/|\/(movie-)*anime\?page=/g, '');
            try {
                let pageData = await getPageData(homePageLink, sourcesUrls[i].sourceName);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                } else {
                    const jar = new CookieJar();
                    const client = wrapper(axios.create({jar}));
                    let response = await client.get(homePageLink);
                    responseUrl = response.request.res.responseUrl;
                }
                if (!responseUrl) {
                    continue;
                }
            } catch (error) {
                if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    let temp = homePageLink.replace(/\/$/, '').split('/').pop();
                    let url = homePageLink.replace(temp, encodeURIComponent(temp));
                    try {
                        const jar = new CookieJar();
                        const client = wrapper(axios.create({jar}));
                        let response = await client.get(url);
                        responseUrl = response.request.res.responseUrl;
                    } catch (error2) {
                        error2.isAxiosError = true;
                        error2.url = homePageLink;
                        error2.url2 = url;
                        error2.filePath = 'domainChangeHandler';
                        await saveError(error2);
                        continue;
                    }
                } else {
                    await saveError(error);
                    continue;
                }
            }

            let newUrl = getNewURl(sourcesUrls[i].url, responseUrl);

            if (sourcesUrls[i].url !== newUrl) {//changed
                sourcesUrls[i].url = newUrl;
                changedSources.push(sourcesUrls[i]);
            }
        }
        return changedSources;
    } catch (error) {
        await saveError(error);
        return [];
    }
}

export async function checkUrlWork(sourceName, sourceUrl) {
    try {
        let responseUrl;
        let homePageLink = sourceUrl.replace(/(\/page\/)|(\/(movie-)*anime\?page=)|(\/$)/g, '');
        try {
            let pageData = await getPageData(homePageLink, sourceName);
            if (pageData && pageData.pageContent) {
                responseUrl = pageData.responseUrl;
            } else {
                const jar = new CookieJar();
                const client = wrapper(axios.create({jar}));
                let response = await client.get(homePageLink);
                responseUrl = response.request.res.responseUrl;
            }
        } catch (error) {
            if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                let temp = homePageLink.replace(/\/$/, '').split('/').pop();
                let url = homePageLink.replace(temp, encodeURIComponent(temp));
                try {
                    const jar = new CookieJar();
                    const client = wrapper(axios.create({jar}));
                    let response = await client.get(url);
                    responseUrl = response.request.res.responseUrl;
                } catch (error2) {
                    error2.isAxiosError = true;
                    error2.url = homePageLink;
                    error2.url2 = url;
                    error2.filePath = 'domainChangeHandler';
                    await saveError(error2);
                }
            } else {
                await saveError(error);
            }
            return "error";
        }
        responseUrl = responseUrl.replace(/(\/page\/)|(\/(movie-)*anime\?page=)|(\/$)/g, '');
        return homePageLink === responseUrl ? "ok" : responseUrl;
    } catch (error) {
        await saveError(error);
        return "error";
    }
}

function updateSourceFields(sourcesObject, sourcesUrls) {
    let sourcesNames = Object.keys(sourcesObject);
    for (let i = 0; i < sourcesNames.length; i++) {
        let thisSource = sourcesObject[sourcesNames[i]];
        let currentUrl = sourcesUrls.find(x => x.sourceName === sourcesNames[i]).url;
        if (currentUrl) {
            thisSource.movie_url = currentUrl;
            if (thisSource.serial_url) {
                thisSource.serial_url = getNewURl(thisSource.serial_url, currentUrl);
            }
        }
    }
}

async function updateDownloadLinks(sourcesObj, pageCounter_time, changedSources, fullyCrawledSources) {
    let sourcesArray = getSourcesArray(sourcesObj, 2, pageCounter_time);
    for (let i = 0; i < changedSources.length; i++) {
        try {
            let startTime = new Date();
            let sourceName = changedSources[i].sourceName;
            Sentry.captureMessage(`domain change handler: (${sourceName} reCrawl start)`);

            let findSource = sourcesArray.find(item => item.name === sourceName);
            if (findSource) {
                let sourceCookies = sourcesObj[sourceName].cookies;
                let disabled = sourcesObj[sourceName].disabled;
                if (sourceCookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))) {
                    Sentry.captureMessage(`Warning: source (${sourceName}) cookies expired (crawler skipped --domainChangeHandler).`);
                } else if (disabled) {
                    Sentry.captureMessage(`Warning: source (${sourceName}) is disabled (crawler skipped --domainChangeHandler).`);
                } else {
                    let crawled = false;
                    if (!fullyCrawledSources.includes(sourceName)) {
                        await findSource.starter();
                        crawled = true;
                    }
                    //update source data
                    let updateSourceField = {};
                    if (crawled) {
                        sourcesObj[sourceName].lastCrawlDate = new Date();
                    }
                    sourcesObj[sourceName].lastDomainChangeDate = new Date();
                    updateSourceField[sourceName] = sourcesObj[sourceName];
                    await updateSourcesObjDB(updateSourceField);
                }
            }

            Sentry.captureMessage(`domain change handler: (${sourceName} reCrawl ended in ${getDatesBetween(new Date(), startTime).minutes} min)`);
        } catch (error) {
            saveError(error);
        }
    }
}

function getNewURl(url, currentUrl) {
    let domain = url
        .replace(/www\.|https:\/\/|http:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '')
        .split('/')[0];
    let currentDomain = currentUrl
        .replace(/www\.|https:\/\/|http:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '')
        .split('/')[0];
    return url.replace(domain, currentDomain);
}
