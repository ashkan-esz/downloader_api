const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const Sentry = require('@sentry/node');
const getCollection = require("../mongoDB");
const {getPageObj, setPageFree, closeBrowser} = require("./puppetterBrowser");
const {getSourcesArray} = require('./crawler');
const {getNewURl} = require("./utils");
const {saveError} = require("../saveError");

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});


export async function domainChangeHandler(sourcesObj, newValaMovieTrailerUrl) {
    try {
        let pageCounter_time = sourcesObj.pageCounter_time;
        delete sourcesObj._id;
        delete sourcesObj.title;
        delete sourcesObj.pageCounter_time;
        let sourcesUrls = Object.keys(sourcesObj).map(value => sourcesObj[value].movie_url);
        let changedDomains = [];

        let isChanged = await checkSourcesUrl(sourcesUrls, changedDomains);

        let valaMovieTrailerUrls = [sourcesObj.valamovie.trailer_url, newValaMovieTrailerUrl];
        if (newValaMovieTrailerUrl) {
            sourcesObj.valamovie.trailer_url = newValaMovieTrailerUrl;
        }

        if (isChanged) {
            updateSourceFields(sourcesObj, sourcesUrls);
            await Sentry.captureMessage('start domain change handler (download links)');
            await updateDownloadLinks(sourcesObj, pageCounter_time, changedDomains);

            let collection = await getCollection('sources');
            await collection.findOneAndUpdate({title: 'sources'}, {
                $set: sourcesObj
            });
            await Sentry.captureMessage('source domain changed');
        } else if (valaMovieTrailerUrls[0] !== valaMovieTrailerUrls[1] && valaMovieTrailerUrls[1]) {
            //valamovie trailer domain
            await Sentry.captureMessage('start domain change handler for valamovie trailers');
            await updateValaMovieTrailers(valaMovieTrailerUrls);
            let collection = await getCollection('sources');
            await collection.findOneAndUpdate({title: 'sources'}, {
                $set: sourcesObj
            });
            await Sentry.captureMessage('domain change handler for valamovie trailers --end');
        }
    } catch (error) {
        await saveError(error);
    }
}

async function checkSourcesUrl(sourcesUrls, changedDomains) {
    let isChanged = false;
    try {
        for (let i = 0; i < sourcesUrls.length; i++) {
            let headLessBrowser = (
                sourcesUrls[i].includes('valamovie') ||
                sourcesUrls[i].includes('digimovie') ||
                sourcesUrls[i].includes('film2movie') ||
                sourcesUrls[i].includes('//zar')
            );

            let responseUrl;
            try {
                if (headLessBrowser) {
                    let pageObj = await getPageObj();
                    if (pageObj) {
                        await pageObj.page.goto(sourcesUrls[i].replace('/page/', ''));
                        responseUrl = pageObj.page.url();
                        setPageFree(pageObj.id);
                    }
                } else {
                    let response = await axios.get(sourcesUrls[i].replace('/page/', ''));
                    responseUrl = response.request.res.responseUrl;
                }
            } catch (error) {
                await saveError(error);
                continue;
            }

            let newUrl = getNewURl(sourcesUrls[i], responseUrl);

            if (sourcesUrls[i] !== newUrl) {//changed
                isChanged = true;
                sourcesUrls[i] = newUrl;
                changedDomains.push(responseUrl);
            }
        }
        await closeBrowser();
        return isChanged;
    } catch (error) {
        await saveError(error);
        await closeBrowser();
        return isChanged;
    }
}

function updateSourceFields(sourcesObject, sourcesUrls) {
    sourcesObject.digimoviez.movie_url = sourcesUrls[0];
    sourcesObject.digimoviez.serial_url = getNewURl(sourcesObject.digimoviez.serial_url, sourcesUrls[0]);

    sourcesObject.film2media.movie_url = sourcesUrls[1];

    sourcesObject.film2movie.movie_url = sourcesUrls[2];

    sourcesObject.salamdl.movie_url = sourcesUrls[3];

    sourcesObject.valamovie.movie_url = sourcesUrls[4];
    sourcesObject.valamovie.serial_url = getNewURl(sourcesObject.valamovie.serial_url, sourcesUrls[4]);

    sourcesObject.zarmovie.movie_url = sourcesUrls[5];
    sourcesObject.zarmovie.serial_url = getNewURl(sourcesObject.zarmovie.serial_url, sourcesUrls[5]);

    sourcesObject.bia2hd.movie_url = sourcesUrls[6];
    sourcesObject.bia2hd.serial_url = getNewURl(sourcesObject.bia2hd.serial_url, sourcesUrls[6]);

    sourcesObject.golchindl.movie_url = sourcesUrls[7];

    sourcesObject.nineanime.movie_url = sourcesUrls[8];
}

async function updateDownloadLinks(sourcesObj, pageCounter_time, changedDomains) {
    let sourcesArray = getSourcesArray(sourcesObj, 2, pageCounter_time);
    for (let i = 0; i < changedDomains.length; i++) {
        try {
            let domain = changedDomains[i].replace(/\d/g, '');
            let sourceName = changedDomains[i].replace(/www.|https:\/\/|http:\/\/|\/page\//g, '').split('/')[0];
            let startTime = new Date();
            await Sentry.captureMessage(`start domain change handler (${sourceName} reCrawl start)`);

            let searchSourceName = getSourceNameByDomain(domain);
            let findSource = sourcesArray.find(item => item.name === searchSourceName);
            if (findSource) {
                await findSource.starter();
                //update source data
                let updateSourceField = {};
                updateSourceField[searchSourceName] = sourcesObj[searchSourceName];
                let collection = await getCollection('sources');
                await collection.findOneAndUpdate({title: 'sources'}, {
                    $set: updateSourceField
                });
            }

            let endTime = new Date();
            let crawlingDuration = (endTime.getTime() - startTime.getTime()) / 1000;
            await Sentry.captureMessage(`start domain change handler (${sourceName} reCrawl ended) in ${crawlingDuration} s`);
        } catch (error) {
            saveError(error);
        }
    }
}

function getSourceNameByDomain(domain) {
    if (domain.includes('digimovie')) {
        return 'digimoviez';
    }
    if (domain.includes('film2media') || domain.includes('filmmedia')) {
        return 'film2media';
    }
    if (domain.includes('film2movie') || domain.includes('filmmovie')) {
        return 'film2movie';
    }
    if (domain.includes('salamdl')) {
        return 'salamdl';
    }
    if (domain.includes('valamovie')) {
        return 'valamovie';
    }
    if (domain.includes('zar')) {
        return 'zarmovie';
    }
    if (domain.includes('biahd') || domain.includes('bahd')) {
        return 'bia2hd';
    }
    if (domain.includes('golchindl')) {
        return 'golchindl';
    }
    if (domain.includes('nineanime')) {
        return 'nineanime';
    }
    return '';
}

async function updateValaMovieTrailers(valaMovieTrailerUrls) {
    let collection = await getCollection('movies');
    let docs_array = await collection.find({}, {projection: {posters: 1, trailers: 1}}).toArray();
    let promiseArray = [];

    for (let i = 0; i < docs_array.length; i++) {
        let trailerChanged = false;
        let trailers = docs_array[i].trailers || [];
        try {
            for (let t = 0; t < trailers.length; t++) {
                if (trailers[t].info.includes('valamovie')) {
                    //valamovie
                    trailerChanged = true;
                    trailers[t].link = getNewURl(trailers[t].link, valaMovieTrailerUrls[1]);
                }
            }
        } catch (error) {
            await saveError(error);
        }

        if (trailerChanged) {
            let resultPromise = collection.findOneAndUpdate({_id: docs_array[i]._id}, {
                $set: {
                    trailers: trailers
                }
            });
            promiseArray.push(resultPromise);
        }

        if (promiseArray.length === 100) {
            await Promise.all(promiseArray);
            promiseArray = [];
        }
    }
    await Promise.all(promiseArray);
}
