const axios = require('axios').default;
import axiosRetry from "axios-retry";
axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});
import getCollection from "../mongoDB";
import {save_error} from "../save_logs";

module.exports = async function(sourcesObject){
    try {
        let sources = [];
        sources.push(sourcesObject.digimovies.movie_url);
        sources.push(sourcesObject.film2media.movie_url);
        sources.push(sourcesObject.film2movie.movie_url);
        sources.push(sourcesObject.mrmovie.movie_url);
        sources.push(sourcesObject.salamdl.movie_url);
        sources.push(sourcesObject.topmovies.movie_url);
        sources.push(sourcesObject.valamovie.movie_url);
        let dominNames = sources.map(value => value.replace(/www.|https:\/\/|\/page\/|\//g, ''));

        let isChanged = false;
        for (let i = 0; i < dominNames.length; i++) {
            let http = (i!==1 && i!==2) ? 'https://' : 'https://www.';
            let response = await axios.get(http + dominNames[i]);
            let responseUrl = response.request.res.responseUrl;
            responseUrl = purify(responseUrl);
            if (dominNames[i] !== responseUrl) {
                //changed
                sources[i] = sources[i].replace(dominNames[i].split('.')[1], responseUrl.split('.')[1]);
                dominNames[i] = responseUrl;
                isChanged = true;
            }
        }

        if (isChanged) {
            //handle poster link update
            await updatePosterLinks(sources, dominNames, 'movies');
            await updatePosterLinks(sources, dominNames, 'serials');
            //update fields
            updateSourceFields(sourcesObject, sources, dominNames);
            // update sources in db
            let collection = await getCollection('sources');
            await collection.findOneAndReplace({title: 'sources'}, sourcesObject);
            save_error({title: 'source domain changed', date: new Date()});
        }
    }catch (error) {
        error.massage = "module: search_tools >> wrapper_module ";
        error.time = new Date();
        save_error(error);
    }
};

async function updatePosterLinks(sources, dominNames, collectionName) {
    //handle movies
    let collection = await getCollection(collectionName);
    let docs_array = await collection.find({}, {projection: {poster: 1}}).toArray();

    for (let i = 0; i < docs_array.length; i++) {
        let changed = false;
        let posters = docs_array[i].poster;
        for (let j = 0; j < posters.length; j++) {
            if (posters[j].includes('digimoviez')) {
                let temp = domainChangeHandler(posters[j], dominNames[0]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            } else if (posters[j].includes('film2media')) {
                let temp = domainChangeHandler(posters[j], dominNames[1]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            } else if (posters[j].includes('film2movie')) {
                let temp = domainChangeHandler(posters[j], dominNames[2]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            } else if (posters[j].includes('mrmovie')) {
                let temp = domainChangeHandler(posters[j], dominNames[3]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            } else if (posters[j].includes('salamdl')) {
                let temp = domainChangeHandler(posters[j], dominNames[4]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            } else if (posters[j].includes('topmovies')) {
                let temp = domainChangeHandler(posters[j], dominNames[5]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            } else if (posters[j].includes('valamovie')) {
                let temp = domainChangeHandler(posters[j], dominNames[6]);
                if (temp!==posters[j]){
                    posters[j] = temp;
                    changed = true;
                }
            }
        }

        if (changed) {
            //update posters
            await collection.findOneAndUpdate({_id: docs_array[i]._id}, {
                $set: {
                    poster: posters
                }
            })
        }
    }
}

function updateSourceFields(sourcesObject, sources, dominNames) {
    sourcesObject.digimovies.movie_url = sources[0];
    let temp = sourcesObject.digimovies.serial_url;
    sourcesObject.digimovies.serial_url = temp.replace(temp.split('.')[1], dominNames[0].split('.')[1]);

    sourcesObject.film2media.movie_url = sources[1];
    sourcesObject.film2movie.movie_url = sources[2];

    sourcesObject.mrmovie.movie_url = sources[3];
    temp = sourcesObject.mrmovie.serial_url;
    sourcesObject.mrmovie.serial_url = temp.replace(temp.split('.')[1], dominNames[3].split('.')[1]);

    sourcesObject.salamdl.movie_url = sources[4];

    sourcesObject.topmovies.movie_url = sources[5];
    temp = sourcesObject.topmovies.serial_url;
    sourcesObject.topmovies.serial_url = temp.replace(temp.split('.')[1], dominNames[5].split('.')[1]);

    sourcesObject.valamovie.movie_url = sources[6];
    temp = sourcesObject.topmovies.serial_url;
    sourcesObject.valamovie.serial_url = temp.replace(temp.split('.')[1], dominNames[6].split('.')[1]);
}

function domainChangeHandler(poster, dominName) {
    let prevDomain = poster
        .replace(/www.|https:\/\//g, '')
        .replace(/[\/_-]/g, '.')
        .split('.')
        .filter(value => value && !value.includes('image'))[1];
    let newDomain = dominName.split('.')[1];
    if (prevDomain !== newDomain) {
        return poster.replace(prevDomain, newDomain);
    }
    return poster;
}

function purify(input) {
    return input.replace(/www.|https:\/\/|\/page\/|\//g,'').split('.').filter(value =>value && !value.includes('image')).join('.');
}
