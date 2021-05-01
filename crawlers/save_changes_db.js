const getCollection = require('../mongoDB');
const {checkSourceExist, checkSource, getYear} = require('./utils');
const {addApiData, apiDataUpdate} = require('./allApiData');
const {handleSiteSeasonEpisodeUpdate, getTotalDuration} = require("./seasonEpisode");
const {handleSubUpdates, handleUrlUpdate} = require("./subUpdates");
const {getTitleModel} = require("./models/title");
const {saveError} = require("../saveError");


module.exports = async function save(title_array, page_link, siteDownloadLinks, persianSummary, poster, trailers, type) {
    try {
        let year = (type === 'movie') ? getYear(page_link, siteDownloadLinks) : '';
        let title = title_array.join(' ').trim();
        let titleModel = getTitleModel(title, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers);

        let {collection, db_data} = await searchOnCollection(title, year, type);

        if (db_data === null) {//new title
            titleModel = await addApiData(titleModel, siteDownloadLinks);
            await collection.insertOne(titleModel);
            return;
        }

        let subUpdates = handleSubUpdates(db_data, poster, trailers, titleModel, type);
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

async function searchOnCollection(title, year, type) {
    let collection = await getCollection('movies');
    let db_data;
    let dataConfig = {
        title: 1,
        type: 1,
        apiUpdateDate: 1,
        rawTitle: 1,
        imdbID: 1,
        sources: 1,
        summary: 1,
        posters: 1,
        trailers: 1,
        genres: 1,
        duration: 1,
        totalSeasons: 1,
        seasons: 1,
        episodes: 1,
        latestData: 1,
        nextEpisode: 1,
        premiered: 1
    };
    if (type === 'serial') {
        db_data = await collection.findOne({title: title, type: type}, {projection: dataConfig});
    } else {
        let YEAR = Number(year);
        let searchYearCases = [year, (YEAR + 1).toString(), (YEAR - 1).toString()];
        for (let i = 0; i < searchYearCases.length; i++) {
            db_data = await collection.findOne({
                title: title,
                type: type,
                premiered: searchYearCases[i]
            }, {projection: dataConfig});
            if (db_data !== null) {
                break;
            }
        }
    }
    return {collection, db_data};
}

async function handleUpdate(collection, db_data, linkUpdate, result, site_persianSummary, subUpdates, siteDownloadLinks, type, apiDataUpdate) {
    try {
        let updateFields = apiDataUpdate !== null ? apiDataUpdate : {};

        if (type === 'serial') {
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
            db_data.summary.persian = site_persianSummary;
            updateFields.summary = db_data.summary;
        }

        if (subUpdates.posterChange) {
            updateFields.posters = db_data.posters;
        }
        if (subUpdates.trailerChange) {
            updateFields.trailers = db_data.trailers;
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

    if (type === 'movie') {
        for (let i = 0; i < siteDownloadLinks.length; i++) {
            if (siteDownloadLinks[i].link !== db_links[i].link) {
                return true;
            }
        }
    } else {
        for (let i = 0; i < siteDownloadLinks.length; i++) {//check links exist
            let link_exist = false;
            for (let j = 0; j < db_links.length; j++) {
                if (siteDownloadLinks[i].link === db_links[j].link) { //this link exist
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
