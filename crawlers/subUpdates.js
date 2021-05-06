const {handleLatestDataUpdate} = require("./latestData");
const {checkSource} = require('./utils');

export function handleSubUpdates(db_data, poster, trailers, watchOnlineLinks, titleModel, type) {
    let posterChange = handlePosterUpdate(db_data, poster);
    let trailerChange = handleTrailerUpdate(db_data, trailers);
    let watchOnlineLinksChange = handleWatchOnlineLinksUpdate(db_data, watchOnlineLinks);
    let latestDataChange = handleLatestDataUpdate(db_data, titleModel.latestData, type);

    return {
        posterChange,
        trailerChange,
        watchOnlineLinksChange,
        latestDataChange,
    };
}

function handlePosterUpdate(db_data, poster) {
    if (poster === '') {
        return false;
    }

    for (let i = 0; i < db_data.posters.length; i++) {
        if (checkSource(db_data.posters[i], poster)) {//this poster exist
            if (db_data.posters[i] !== poster) { //replace link
                db_data.posters[i] = poster;
                return true;
            } else {
                return false;
            }
        }
    }

    db_data.posters.push(poster); //new poster
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
    if (db_data.trailers !== null) {
        db_data.trailers = removeDuplicateLinks(db_data.trailers);
    }
    return trailersChanged;
}

function handleWatchOnlineLinksUpdate(db_data, siteWatchOnlineLinks) {
    let onlineLinkChanged = false;
    for (let i = 0; i < siteWatchOnlineLinks.length; i++) {
        let linkExist = false;
        for (let j = 0; j < db_data.watchOnlineLinks.length; j++) {
            if (siteWatchOnlineLinks[i].info === db_data.watchOnlineLinks[j].info) {//this trailer exist
                if (siteWatchOnlineLinks[i].link !== db_data.watchOnlineLinks[j].link) { //replace link
                    db_data.watchOnlineLinks[j].link = siteWatchOnlineLinks[i].link;
                    onlineLinkChanged = true;
                }
                linkExist = true;
                break;
            }
        }
        if (!linkExist) { //new onlineLink
            db_data.trailers.push(siteWatchOnlineLinks[i]);
            onlineLinkChanged = true;
        }
    }
    db_data.watchOnlineLinks = removeDuplicateLinks(db_data.watchOnlineLinks);
    return onlineLinkChanged;
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

function removeDuplicateLinks(input) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (input[i].link === result[j].link) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}
