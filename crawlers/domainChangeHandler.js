const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const Sentry = require('@sentry/node');
const getCollection = require("../mongoDB");
const digimovies = require('./sources/digimovies');
const film2media = require('./sources/film2media');
const mrmovie = require('./sources/mrmovie');
const topmovies = require('./sources/topmovies');
const {getNewURl} = require("./utils");
const {saveError} = require("../saveError");

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

module.exports = async function domainChangeHandler(sourcesObject) {
    try {
        let sources_url = Object.keys(sourcesObject).map(value => sourcesObject[value].movie_url);
        let domains = sources_url.map(value => value.replace(/www.|https:\/\/|\/page\/|\//g, ''));
        let changedDomains = [];
        let isChanged = false;
        for (let i = 0; i < domains.length; i++) {
            let response;
            try {
                response = await axios.get('https://' + domains[i]);
            } catch (error) {
                try {
                    response = await axios.get('https://www.' + domains[i]);
                } catch (error2) {
                    saveError(error2);
                    continue;
                }
            }
            let responseDomain = response.request.res.responseUrl.replace(/www.|https:\/\/|\/page\/|\//g, '');
            if (domains[i] !== responseDomain) {//changed
                isChanged = true;
                sources_url[i] = sources_url[i]
                    .replace(domains[i].split('.')[0], responseDomain.split('.')[0])
                    .replace(domains[i].split('.')[1], responseDomain.split('.')[1]);
                domains[i] = responseDomain;
                changedDomains.push(responseDomain);
            }
        }

        if (isChanged) {
            updateSourceFields(sourcesObject, sources_url, domains);
            await updateDownloadLinks(sourcesObject, changedDomains);
            await update_Poster_Trailers(sources_url, domains, changedDomains, 'movies');
            await update_Poster_Trailers(sources_url, domains, changedDomains, 'serials');

            let collection = await getCollection('sources');
            await collection.findOneAndReplace({title: 'sources'}, sourcesObject);
            Sentry.captureMessage('source domain changed');
        }
    } catch (error) {
        saveError(error);
    }
};

function updateSourceFields(sourcesObject, sources, domains) {
    sourcesObject.digimovies.movie_url = sources[0];
    sourcesObject.digimovies.serial_url = getNewURl(sourcesObject.digimovies.serial_url, domains[0]);

    sourcesObject.film2media.movie_url = sources[1];
    sourcesObject.film2movie.movie_url = sources[2];

    sourcesObject.mrmovie.movie_url = sources[3];
    sourcesObject.mrmovie.serial_url = getNewURl(sourcesObject.mrmovie.serial_url, domains[3]);

    sourcesObject.salamdl.movie_url = sources[4];

    sourcesObject.topmovies.movie_url = sources[5];
    sourcesObject.topmovies.serial_url = getNewURl(sourcesObject.topmovies.serial_url, domains[5]);

    sourcesObject.valamovie.movie_url = sources[6];
    sourcesObject.valamovie.serial_url = getNewURl(sourcesObject.topmovies.serial_url, domains[6]);
}

async function updateDownloadLinks(sourcesObject, changedDomains) {
    // digimovies film2media mrmovie topmovies
    for (let i = 0; i < changedDomains.length; i++) {
        let domain = changedDomains[i];
        if (domain.includes('digimovie')) {
            await digimovies({
                ...sourcesObject.digimovies,
                page_count: 330,
                serial_page_count: 50
            }, [], true);
        } else if (domain.includes('film2media')) {
            await film2media({
                ...sourcesObject.film2media,
                page_count: 380,
            }, [], true);
        } else if (domain.includes('mrmovie')) {
            await mrmovie({
                ...sourcesObject.mrmovie,
                page_count: 300,
                serial_page_count: 55
            }, [], true);
        } else if (domain.includes('topmovie')) {
            await topmovies({
                ...sourcesObject.topmovies,
                page_count: 345,
                serial_page_count: 45
            }, [], true);
        }
    }
}

async function update_Poster_Trailers(sources, domains, changedDomains, collectionName) {
    let collection = await getCollection(collectionName);
    let docs_array = await collection.find({}, {projection: {poster: 1, trailers: 1}}).toArray();
    let sourcesNames = domains.map(value => value.replace(/\d/g, '').split('.')[0]);
    let changedSourcesName = changedDomains.map(value => value.replace(/\d/g, '').split('.')[0]);
    let promiseArray = [];
    for (let i = 0; i < docs_array.length; i++) {
        let posterChanged = false;
        let trailerChanged = false;
        let posters = docs_array[i].poster;
        let trailers = docs_array[i].trailers;

        for (let j = 0; j < posters.length; j++) {
            for (let k = 0; k < changedSourcesName.length; k++) {
                if (posters[j].includes(changedSourcesName[k])) {
                    posterChanged = true;
                    let newDomain = domains[sourcesNames.indexOf(changedSourcesName[k])];
                    posters[j] = getNewURl(posters[j], newDomain);
                    break;
                }
            }
        }

        for (let t = 0; t < trailers.length; t++) {
            for (let k = 0; k < changedSourcesName.length; k++) {
                if (trailers[t].includes(changedSourcesName[k])) {
                    trailerChanged = true;
                    let newDomain = domains[sourcesNames.indexOf(changedSourcesName[k])];
                    trailers[t] = getNewURl(trailers[t], newDomain);
                    break;
                }
            }
        }

        let updateObj = {};
        if (posterChanged) {
            updateObj.poster = posters;
        }
        if (trailerChanged) {
            updateObj.trailers = trailers;
        }
        if (posterChanged || trailerChanged) {
            let resultPromise = collection.findOneAndUpdate({_id: docs_array[i]._id}, {
                $set: updateObj
            });
            promiseArray.push(resultPromise);
        }
        if (i % 50 === 0) {
            await Promise.all(promiseArray);
            promiseArray = [];
        }
    }
}
