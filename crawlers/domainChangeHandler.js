const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const Sentry = require('@sentry/node');
const getCollection = require("../mongoDB");
const {checkNeedHeadlessBrowser} = require("../crawlers/searchTools");
const {getSourcesArray} = require('./crawler');
const {getPageData} = require('./remoteHeadlessBrowser');
const {getNewURl} = require("./utils");
const {saveError} = require("../saveError");

axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'SlowDown' ||
        (error.response &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});


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
            updateSourceFields(sourcesObj, sourcesUrls);
            Sentry.captureMessage('start domain change handler (download links)');
            await updateDownloadLinks(sourcesObj, pageCounter_time, changedSources);

            let collection = await getCollection('sources');
            await collection.findOneAndUpdate({title: 'sources'}, {
                $set: sourcesObj
            });
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
            let headLessBrowser = checkNeedHeadlessBrowser(sourcesUrls[i].url);

            let responseUrl;
            try {
                let homePageLink = sourcesUrls[i].url.replace(/\/page\/|\/(movie-)*anime\?page=/g, '');
                if (headLessBrowser) {
                    let pageData = await getPageData(homePageLink);
                    if (pageData && pageData.pageContent) {
                        responseUrl = pageData.responseUrl;
                    }
                } else {
                    let response = await axios.get(homePageLink);
                    responseUrl = response.request.res.responseUrl;
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
        let thisSourceUrl = sourcesUrls.find(x => x.sourceName === sourcesNames[i]).url;
        if (thisSourceUrl) {
            thisSource.movie_url = thisSourceUrl;
            if (thisSource.serial_url) {
                thisSource.serial_url = getNewURl(thisSource.serial_url, thisSourceUrl);
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
            Sentry.captureMessage(`start domain change handler (${sourceName} reCrawl start)`);

            let findSource = sourcesArray.find(item => item.name === sourceName);
            if (findSource) {
                await findSource.starter();
                //update source data
                let updateSourceField = {};
                updateSourceField[sourceName] = sourcesObj[sourceName];
                let collection = await getCollection('sources');
                await collection.findOneAndUpdate({title: 'sources'}, {
                    $set: updateSourceField
                });
            }

            let endTime = new Date();
            let crawlingDuration = (endTime.getTime() - startTime.getTime()) / 1000;
            Sentry.captureMessage(`start domain change handler (${sourceName} reCrawl ended) in ${crawlingDuration} s`);
        } catch (error) {
            saveError(error);
        }
    }
}
