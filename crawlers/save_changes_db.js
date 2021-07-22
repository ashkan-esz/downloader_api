const getCollection = require('../mongoDB');
const {checkSourceExist, checkSource, getYear, removeDuplicateElements} = require('./utils');
const {addApiData, apiDataUpdate} = require('./3rdPartyApi/allApiData');
const {handleSiteSeasonEpisodeUpdate, getTotalDuration} = require("./seasonEpisode");
const {handleSubUpdates, handleUrlUpdate} = require("./subUpdates");
const {getTitleModel} = require("./models/title");
const {getJikanApiData} = require("./3rdPartyApi/jikanApi");
const {saveError} = require("../saveError");


//todo : add doc for upcoming
//todo : handle insert_date - update_date for upcoming title


module.exports = async function save(title, page_link, siteDownloadLinks, persianSummary, poster, trailers, watchOnlineLinks, type) {
    try {
        let titleObj = await getTitleObj(title, type); //get titles from jikan api
        let year = (type.includes('movie')) ? getYear(page_link, siteDownloadLinks) : '';
        let titleModel = getTitleModel(titleObj, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers, watchOnlineLinks);
        // titleModel = await addApiData(titleModel, siteDownloadLinks); //todo : remove
        // return; //todo : remove
        let {collection, db_data} = await searchOnCollection(titleObj, year, type);

        if (db_data === null) {//new title
            titleModel = await addApiData(titleModel, siteDownloadLinks);
            await collection.insertOne(titleModel);
            return;
        }

        let subUpdates = handleSubUpdates(db_data, poster, trailers, watchOnlineLinks, titleModel, type);
        let apiDataUpdateFields = await apiDataUpdate(db_data, siteDownloadLinks, titleObj, type);
        if (checkSourceExist(db_data.sources, page_link)) {
            let linkUpdate = handleDownloadLinksUpdate(collection, db_data, page_link, persianSummary, type, siteDownloadLinks);
            await handleUpdate(collection, db_data, linkUpdate, null, persianSummary, subUpdates, siteDownloadLinks, type, apiDataUpdateFields);
        } else {
            //new source
            await handleUpdate(collection, db_data, true, titleModel, persianSummary, subUpdates, siteDownloadLinks, type, apiDataUpdateFields);
        }

    } catch (error) {
        await saveError(error);
    }
}

async function getTitleObj(title, type) {
    let titleObj = {
        title: title,
        rawTitle: title,
        alternateTitles: [],
        titleSynonyms: [],
        jikanFound: false,
    }

    if (type.includes('anime')) {
        let jikanApiData = await getJikanApiData(titleObj.title, titleObj.rawTitle, type, false);
        if (jikanApiData) {
            titleObj.title = jikanApiData.apiTitle_simple;
            titleObj.rawTitle = jikanApiData.apiTitle;
            titleObj.alternateTitles = removeDuplicateElements(
                [jikanApiData.apiTitleEnglish, title, jikanApiData.apiTitleJapanese]
                    .filter(value => value)
                    .map(value => value.toLowerCase())
            );
            titleObj.titleSynonyms = jikanApiData.titleSynonyms;
            titleObj.jikanFound = true;
        }
    }

    return titleObj;
}

async function searchOnCollection(titleObj, year, type) {
    let collection = await getCollection('movies');
    let db_data = null;
    let dataConfig = {
        title: 1,
        type: 1,
        premiered: 1,
        year: 1,
        rawTitle: 1,
        alternateTitles: 1,
        titleSynonyms: 1,
        apiUpdateDate: 1,
        status: 1,
        imdbID: 1,
        tvmazeID: 1,
        jikanID: 1,
        sources: 1,
        summary: 1,
        posters: 1,
        trailers: 1,
        watchOnlineLinks: 1,
        genres: 1,
        rating: 1,
        duration: 1,
        totalSeasons: 1,
        seasons: 1,
        episodes: 1,
        latestData: 1,
        nextEpisode: 1,
    };

    let searchTypes = [type];
    if (type.includes('anime')) {
        searchTypes.push(type.replace('anime_', ''));
    } else {
        searchTypes.push(('anime_' + type));
    }

    if (type.includes('serial')) {
        let searchResults = await collection.find({
            $or: [
                {title: titleObj.title},
                {title: {$in: titleObj.alternateTitles}},
                {title: {$in: titleObj.titleSynonyms}},
                {alternateTitles: titleObj.title},
                {titleSynonyms: titleObj.title},
            ],
            type: {$in: searchTypes}
        }, {projection: dataConfig}).toArray();

        A: for (let i = 0; i < searchTypes.length; i++) {
            for (let j = 0; j < searchResults.length; j++) {
                if (searchTypes[i] === searchResults[j].type) {
                    db_data = searchResults[j];
                    break A;
                }
            }
        }
    } else {
        let YEAR = Number(year);
        let searchYears = [year, (YEAR + 1).toString(), (YEAR - 1).toString()];
        let searchResults = await collection.find({
            $or: [
                {title: titleObj.title},
                {title: {$in: titleObj.alternateTitles}},
                {title: {$in: titleObj.titleSynonyms}},
                {alternateTitles: titleObj.title},
                {titleSynonyms: titleObj.title},
            ],
            type: {$in: searchTypes},
            premiered: {$in: searchYears}
        }, {projection: dataConfig}).toArray();

        A: for (let i = 0; i < searchYears.length; i++) {
            for (let j = 0; j < searchTypes.length; j++) {
                for (let k = 0; k < searchResults.length; k++) {
                    if (searchYears[i] === searchResults[k].premiered &&
                        searchTypes[j] === searchResults[k].type) {
                        db_data = searchResults[k];
                        break A;
                    }
                }
            }
        }
    }
    return {collection, db_data};
}

async function handleUpdate(collection, db_data, linkUpdate, result, site_persianSummary, subUpdates, siteDownloadLinks, type, apiDataUpdate) {
    try {
        let updateFields = apiDataUpdate || {};

        if (type.includes('serial')) {
            let {seasonsUpdate, episodesUpdate} = handleSiteSeasonEpisodeUpdate(db_data, siteDownloadLinks, true);
            if (seasonsUpdate) {
                updateFields.seasons = db_data.seasons;
            }
            if (episodesUpdate) {
                updateFields.episodes = db_data.episodes;
                updateFields.totalDuration = getTotalDuration(db_data.episodes, db_data.latestData);
            }
        }

        if (linkUpdate) {
            if (result === null) {
                updateFields.sources = db_data.sources;
            } else {
                db_data.sources.push(result.sources[0]);
                updateFields.sources = db_data.sources;
            }
        }

        if (db_data.summary.persian.length < site_persianSummary.length) {
            let currentSummary = updateFields.summary;
            if (currentSummary === undefined) {
                currentSummary = db_data.summary;
            }
            currentSummary.persian = site_persianSummary;
            updateFields.summary = currentSummary;
        }

        if (subUpdates.posterChange) {
            updateFields.posters = db_data.posters;
        }
        if (subUpdates.trailerChange) {
            updateFields.trailers = db_data.trailers;
        }
        if (subUpdates.watchOnlineLinksChange) {
            updateFields.watchOnlineLinks = db_data.watchOnlineLinks;
        }

        if (subUpdates.latestDataChange) {
            updateFields.latestData = db_data.latestData;
            updateFields.update_date = new Date();
        }


        if (Object.keys(updateFields).length > 0) {
            await collection.findOneAndUpdate({_id: db_data._id}, {
                $set: updateFields
            });
        }

    } catch (error) {
        saveError(error);
    }
}

function handleDownloadLinksUpdate(collection, db_data, page_link, persian_summary, type, siteDownloadLinks) {
    for (let j = 0; j < db_data.sources.length; j++) {//check source exist
        if (checkSource(db_data.sources[j].url, page_link)) { // this source exist
            let shouldUpdate = checkDownloadLinksUpdate(siteDownloadLinks, db_data.sources[j].links, type);
            if (shouldUpdate) {
                db_data.sources[j].links = siteDownloadLinks;
            }
            shouldUpdate = handleUrlUpdate(db_data.sources[j], page_link) || shouldUpdate;
            return shouldUpdate;
        }
    }
}

function checkDownloadLinksUpdate(siteDownloadLinks, db_links, type) {
    if (siteDownloadLinks.length !== db_links.length) {
        return true;
    }

    if (type.includes('movie')) {
        for (let i = 0; i < siteDownloadLinks.length; i++) {
            if (!checkEqualLinks(siteDownloadLinks[i], db_links[i])) {
                return true;
            }
        }
    } else {
        for (let i = 0; i < siteDownloadLinks.length; i++) {//check links exist
            let link_exist = false;
            for (let j = 0; j < db_links.length; j++) {
                if (checkEqualLinks(siteDownloadLinks[i], db_links[j])) { //this link exist
                    link_exist = true;
                }
            }
            if (!link_exist) { //new link
                return true;
            }
        }
    }

    return false;
}

function checkEqualLinks(link1, link2) {
    if (!link1.qualitySample) {
        link1.qualitySample = '';
    }
    if (!link2.qualitySample) {
        link2.qualitySample = '';
    }
    return (
        link1.link === link2.link &&
        link1.info === link2.info &&
        link1.qualitySample === link2.qualitySample
    );
}
