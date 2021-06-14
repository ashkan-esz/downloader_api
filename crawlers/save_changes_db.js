const getCollection = require('../mongoDB');
const {checkSourceExist, checkSource, getYear, removeDuplicateElements} = require('./utils');
const {addApiData, apiDataUpdate} = require('./3rdPartyApi/allApiData');
const {handleSiteSeasonEpisodeUpdate, getTotalDuration} = require("./seasonEpisode");
const {handleSubUpdates, handleUrlUpdate} = require("./subUpdates");
const {getTitleModel} = require("./models/title");
const {getJikanApiData} = require("./3rdPartyApi/jikanApi");
const {saveError} = require("../saveError");

//todo : add field endYear
//todo : add doc for upcoming


module.exports = async function save(title, page_link, siteDownloadLinks, persianSummary, poster, trailers, watchOnlineLinks, type) {
    try {
        //todo : find anime from movie sources
        let titleObj = await getTitleObj(title, type);
        let year = (type.includes('movie')) ? getYear(page_link, siteDownloadLinks) : '';
        let titleModel = getTitleModel(titleObj, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers, watchOnlineLinks);

        let {collection, db_data} = await searchOnCollection(title, year, type);

        if (db_data === null) {//new title
            titleModel = await addApiData(titleModel, siteDownloadLinks);
            console.log('---- new title')
            // console.log(titleModel)
            // await collection.insertOne(titleModel); //todo : active
            return;
        }

        let subUpdates = handleSubUpdates(db_data, poster, trailers, watchOnlineLinks, titleModel, type);
        let apiDataUpdateFields = await apiDataUpdate(db_data, siteDownloadLinks);
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
    }

    if (type.includes('anime')) {
        let jikanApiData = await getJikanApiData(titleObj.title, titleObj.rawTitle, type, false);
        if (jikanApiData) {
            titleObj.title = jikanApiData.apiTitle_simple;
            titleObj.rawTitle = jikanApiData.apiTitle;
            titleObj.alternateTitles = removeDuplicateElements([jikanApiData.apiTitleEnglish, title, jikanApiData.apiTitleJapanese].filter(value => value));
            titleObj.titleSynonyms = jikanApiData.titleSynonyms;
        }
    }
    return titleObj;
}

async function searchOnCollection(title, year, type) {
    return {collection: null, db_data: null}; //todo : remove
    //todo : check title with alternateTitles to find anime title from movie download sources
    let collection = await getCollection('movies');
    let db_data;
    let dataConfig = {
        title: 1,
        type: 1,
        premiered: 1,
        year: 1,
        rawTitle: 1,
        titleSynonyms: 1,
        alternateTitles: 1,
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
        db_data = await collection.find({
            title: title,
            type: {$in: searchTypes}
        }, {projection: dataConfig}).toArray();

        A: for (let i = 0; i < searchTypes.length; i++) {
            for (let j = 0; j < db_data.length; j++) {
                if (searchTypes[i] === db_data[j].type) {
                    db_data = db_data[j];
                    break A;
                }
            }
        }
    } else {
        let YEAR = Number(year);
        let searchYears = [year, (YEAR + 1).toString(), (YEAR - 1).toString()];
        db_data = await collection.find({
            title: title,
            type: {$in: searchTypes},
            premiered: {$in: searchYears}
        }, {projection: dataConfig}).toArray();

        A: for (let i = 0; i < searchYears.length; i++) {
            for (let j = 0; j < searchTypes.length; j++) {
                for (let k = 0; k < db_data.length; k++) {
                    if (searchYears[i] === db_data[k].premiered &&
                        searchTypes[j] === db_data[k].type) {
                        db_data = db_data[k];
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
        //todo : set type in update
        let updateFields = apiDataUpdate !== null ? apiDataUpdate : {};

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

        if (db_data.summary.persian.length < 10) {
            updateFields.summary.persian = site_persianSummary;
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


        console.log('---- title update')
        console.log(updateFields)
        // todo : active
        // if (Object.keys(updateFields).length > 0) {
        //     await collection.findOneAndUpdate({_id: db_data._id}, {
        //         $set: updateFields
        //     });
        // }

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
