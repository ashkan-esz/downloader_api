const {handleLatestDataUpdate} = require("./latestData");
const {checkSource} = require('./utils');

export function handleSubUpdates(db_data, poster, trailers, result, type) {
    let posterChange = handlePosterUpdate(db_data, poster);
    let trailerChange = handleTrailerUpdate(db_data, trailers);
    let latestDataChange = handleLatestDataUpdate(db_data, result.latestData, type);
    let hasChangedField = posterChange || trailerChange || latestDataChange;
    return {
        posterChange,
        trailerChange,
        latestDataChange,
        hasChangedField
    };
}

function handlePosterUpdate(db_data, poster) {
    if (poster === '') {
        return false;
    }

    for (let i = 0; i < db_data.poster.length; i++) {
        if (checkSource(db_data.poster[i], poster)) {//this poster exist
            if (db_data.poster[i] !== poster) { //replace link
                db_data.poster[i] = poster;
                return true;
            } else {
                return false;
            }
        }
    }

    db_data.poster.push(poster); //new poster
    return true;
}

function handleTrailerUpdate(db_data, site_trailers) {
    let trailersChanged = false;
    if (db_data.trailers === null && site_trailers.length > 0) {
        db_data.trailers = site_trailers;
        return true;
    }
    for (let i = 0; i < site_trailers.length; i++) {
        let trailer_exist = false;
        for (let j = 0; j < db_data.trailers.length; j++) {
            if (site_trailers[i].info === db_data.trailers[j].info) {//this trailer exist
                if (site_trailers[i].link !== db_data.trailers[j].link) { //replace link
                    db_data.trailers[j].link = site_trailers[i].link;
                    trailersChanged = true;
                }
                trailer_exist = true;
                break;
            }
        }
        if (!trailer_exist) { //new trailer
            db_data.trailers.push(site_trailers[i]);
            trailersChanged = true;
        }
    }
    return trailersChanged;
}

export function handleUrlUpdate(thiaSource, page_link) {
    if (page_link.includes('webcache')) {
        return false;
    }
    if (thiaSource.url !== page_link) {
        thiaSource.url = page_link;
        return true;
    }
    return false;
}
