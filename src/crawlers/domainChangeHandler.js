import axios from "axios";
import * as Sentry from "@sentry/node";
import {updateSourcesObjDB} from "../data/dbMethods.js";
import {getSourcesArray} from "./sourcesArray.js";
import {getPageData} from "./remoteHeadlessBrowser.js";
import {getDatesBetween} from "./utils.js";
import {saveError} from "../error/saveError.js";


export async function domainChangeHandler(sourcesObj) {
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
            await updateDownloadLinks(sourcesObj, pageCounter_time, changedSources);
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
            try {
                let homePageLink = sourcesUrls[i].url.replace(/\/page\/|\/(movie-)*anime\?page=/g, '');
                let pageData = await getPageData(homePageLink);
                if (pageData && pageData.pageContent) {
                    responseUrl = pageData.responseUrl;
                } else {
                    let response = await axios.get(homePageLink);
                    responseUrl = response.request.res.responseUrl;
                }
                if (!responseUrl) {
                    continue;
                }
            } catch (error) {
                await saveError(error);
                continue;
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

async function updateDownloadLinks(sourcesObj, pageCounter_time, changedSources) {
    let sourcesArray = getSourcesArray(sourcesObj, 2, pageCounter_time);
    for (let i = 0; i < changedSources.length; i++) {
        try {
            let startTime = new Date();
            let sourceName = changedSources[i].sourceName;
            Sentry.captureMessage(`domain change handler: (${sourceName} reCrawl start)`);

            let findSource = sourcesArray.find(item => item.name === sourceName);
            if (findSource) {
                await findSource.starter();
                //update source data
                let updateSourceField = {};
                updateSourceField[sourceName] = sourcesObj[sourceName];
                await updateSourcesObjDB(updateSourceField);
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
