const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const Sentry = require('@sentry/node');
const getCollection = require("../mongoDB");
const puppeteer = require('puppeteer');
const digimoviez = require('./sources/1digimoviez');
const film2media = require('./sources/2film2media');
const zarmovie = require('./sources/6zarmovie');
const bia2hd = require('./sources/7bia2hd');
const golchindl = require('./sources/8golchindl');
const nineanime = require('./sources/9nineanime');
const {getNewURl} = require("./utils");
const {saveError} = require("../saveError");

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

//todo : add digimovie/ domain change handler --> source link is fixed , downloadLinks/trailer/onlineLinks/qualitySample change

export async function domainChangeHandler(sourcesObject, newValaMovieTrailerUrl) {
    try {
        delete sourcesObject._id;
        delete sourcesObject.title;
        let sourcesUrls = Object.keys(sourcesObject).map(value => sourcesObject[value].movie_url);
        let changedDomains = [];

        let isChanged = await checkSourcesUrl(sourcesUrls, changedDomains);

        let valaMovieTrailerUrls = [sourcesObject.valamovie.trailer_url, newValaMovieTrailerUrl];
        if (newValaMovieTrailerUrl) {
            sourcesObject.valamovie.trailer_url = newValaMovieTrailerUrl;
        }

        if (isChanged) {
            await Sentry.captureMessage('start domain change handler');
            updateSourceFields(sourcesObject, sourcesUrls);
            await Sentry.captureMessage('start domain change handler (posters/trailers)');
            await update_Posters_Trailers(sourcesUrls, changedDomains, valaMovieTrailerUrls);
            await Sentry.captureMessage('start domain change handler (download links)');
            await updateDownloadLinks(sourcesObject, changedDomains);

            let collection = await getCollection('sources');
            await collection.findOneAndUpdate({title: 'sources'}, {
                $set: sourcesObject
            });
            await Sentry.captureMessage('source domain changed');
        } else if (valaMovieTrailerUrls[0] !== valaMovieTrailerUrls[1] && valaMovieTrailerUrls[1]) {
            //valamovie trailer domain
            await Sentry.captureMessage('start domain change handler for valamovie trailers');
            await updateValaMovieTrailers(valaMovieTrailerUrls);
            let collection = await getCollection('sources');
            await collection.findOneAndUpdate({title: 'sources'}, {
                $set: sourcesObject
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
        let browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--single-process",
                "--no-zygote"
            ]
        });
        let page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');

        for (let i = 0; i < sourcesUrls.length; i++) {
            let headLessBrowser = (
                sourcesUrls[i].includes('valamovie') ||
                sourcesUrls[i].includes('digimovie') ||
                sourcesUrls[i].includes('film2movie') ||
                sourcesUrls[i].includes('//zar')
            );

            let response;
            try {
                if (headLessBrowser) {
                    await page.goto(sourcesUrls[i].replace('/page/', ''));
                } else {
                    response = await axios.get(sourcesUrls[i].replace('/page/', ''));
                }
            } catch (error) {
                await saveError(error);
                continue;
            }

            let responseUrl = headLessBrowser ? page.url() : response.request.res.responseUrl;
            let newUrl = getNewURl(sourcesUrls[i], responseUrl);

            if (sourcesUrls[i] !== newUrl) {//changed
                isChanged = true;
                sourcesUrls[i] = newUrl;
                changedDomains.push(responseUrl);
            }
        }
        await browser.close();
        return isChanged;
    } catch (error) {
        await saveError(error);
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

async function updateDownloadLinks(sourcesObject, changedDomains) {
    // digimoviez - film2media - zarmovie - bia2hd - golchingdl - nineanime
    //todo : updateSourceFields for reCrawled source
    for (let i = 0; i < changedDomains.length; i++) {
        let domain = changedDomains[i].replace(/\d/g, '');
        if (
            domain.includes('digimovie') ||
            domain.includes('filmmedia') ||
            domain.includes('zarmovie') ||
            domain.includes('zarfilm') ||
            domain.includes('biahd') ||
            domain.includes('bahd') ||
            domain.includes('golchin') ||
            domain.includes('nineanime')
        ) {
            let sourceName = changedDomains[i].replace(/www.|https:\/\/|http:\/\/|\/page\//g, '').split('/')[0];
            let startTime = new Date();
            await Sentry.captureMessage(`start domain change handler (${sourceName} reCrawl start)`);
            await reCrawlSource(sourcesObject, domain);
            let endTime = new Date();
            let crawlingDuration = (endTime.getTime() - startTime.getTime()) / 1000;
            await Sentry.captureMessage(`start domain change handler (${sourceName} reCrawl ended) in ${crawlingDuration} s`);
        }
    }
}

async function reCrawlSource(sourcesObject, domain) {
    if (domain.includes('digimovie')) {
        await digimoviez({
            ...sourcesObject.digimoviez,
            page_count: 330,
            serial_page_count: 50
        });
    } else if (domain.includes('filmmedia')) {
        await film2media({
            ...sourcesObject.film2media,
            page_count: 390,
        });
    } else if (domain.includes('zarmovie') || domain.includes('zarfilm')) {
        await zarmovie({
            ...sourcesObject.zarmovie,
            page_count: 845,
            serial_page_count: 50
        });
    } else if (domain.includes('biahd') || domain.includes('bahd')) {
        await bia2hd({
            ...sourcesObject.bia2hd,
            page_count: 555,
            serial_page_count: 115,
        });
    } else if (domain.includes('golchin')) {
        await golchindl({
            ...sourcesObject.golchindl,
            page_count: 305,
        });
    } else if (domain.includes('nineanime')) {
        await nineanime({
            ...sourcesObject.nineanime,
            page_count: 55,
        });
    }
}

export async function update_Posters_Trailers(sourcesUrls, changedDomains, valaMovieTrailerUrls) {
    let collection = await getCollection('movies');
    let docs_array = await collection.find({}, {projection: {posters: 1, trailers: 1}}).toArray();
    let sourcesNames = sourcesUrls.map(value => value.replace(/www.|https:\/\/|http:\/\/|\/page\//g, '').split(/[\/.]/g)[0]);
    let changedSourcesName = changedDomains.map(value => value.replace(/www.|https:\/\/|http:\/\/|\/page\//g, '').split(/[\/.]/g)[0]);
    let promiseArray = [];

    for (let i = 0; i < docs_array.length; i++) {
        let postersChanged = false;
        let trailerChanged = false;
        //todo : add remove duplicate poster link
        let posters = docs_array[i].posters || [];
        let trailers = docs_array[i].trailers || [];

        try {
            for (let j = 0; j < posters.length; j++) {
                for (let k = 0; k < changedSourcesName.length; k++) {
                    if (posters[j].includes(changedSourcesName[k])) {
                        postersChanged = true;
                        let currentUrl = sourcesUrls[sourcesNames.indexOf(changedSourcesName[k])];
                        posters[j] = getNewURl(posters[j], currentUrl);
                        break;
                    }
                }
            }

            //todo : recrawl all sources when domain change ---> no trailer link updater
            for (let t = 0; t < trailers.length; t++) {
                for (let k = 0; k < changedSourcesName.length; k++) {
                    if (trailers[t].link.includes(changedSourcesName[k]) ||
                        trailers[t].info.includes(changedSourcesName[k])) {
                        if (trailers[t].info.includes('valamovie')) {
                            //valamovie
                            if (valaMovieTrailerUrls[1]) {
                                trailerChanged = true;
                                trailers[t].link = getNewURl(trailers[t].link, valaMovieTrailerUrls[1]);
                            }
                            break;
                        } else if (
                            !trailers[t].info.includes('digimoviez') &&
                            !trailers[t].info.includes('zarmovie') &&
                            !trailers[t].info.includes('zarfilm') &&
                            !trailers[t].info.includes('bia2hd') &&
                            !trailers[t].info.includes('golchin')
                        ) {
                            //others
                            trailerChanged = true;
                            let currentUrl = sourcesUrls[sourcesNames.indexOf(changedSourcesName[k])];
                            trailers[t].link = getNewURl(trailers[t].link, currentUrl);
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            saveError(error);
        }

        let updateObj = {};
        if (postersChanged) {
            updateObj.posters = posters;
        }
        if (trailerChanged) {
            updateObj.trailers = trailers;
        }
        if (postersChanged || trailerChanged) {
            let resultPromise = collection.findOneAndUpdate({_id: docs_array[i]._id}, {
                $set: updateObj
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
