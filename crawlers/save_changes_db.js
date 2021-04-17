const getCollection = require('../mongoDB');
const {checkSourceExist, checkSource, getYear} = require('./utils');
const {addApiData, apiDataUpdate} = require('./allApiData');
const {handleSiteSeasonEpisodeUpdate, getTotalDuration} = require("./seasonEpisode");
const {getLatestData} = require("./latestData");
const {handleSubUpdates, handleUrlUpdate} = require("./subUpdates");
const {saveError} = require("../saveError");


module.exports = async function save(title_array, page_link, site_links, persianSummary, poster, trailers, type) {
    try {
        let year = (type === 'movie') ? getYear(page_link, site_links) : '';
        let title = title_array.join(' ').trim();
        let result = getSaveObj(title, page_link, type, site_links, year, poster, persianSummary, trailers);

        let {collection, db_data} = await searchOnCollection(title, year, type);

        if (db_data === null) {//new title
            result = await addApiData(result, site_links);
            if (result.type === 'movie' && !result.premiered) {
                result.premiered = year;
            }
            await collection.insertOne(result);
            return;
        }

        let subUpdates = handleSubUpdates(db_data, poster, trailers, result, type);
        let apiDataUpdateFields = await apiDataUpdate(db_data, site_links);
        if (checkSourceExist(db_data.sources, page_link)) {
            let linkUpdate = handleLinkUpdate(collection, db_data, page_link, persianSummary, type, site_links);
            await handleUpdate(collection, db_data, linkUpdate, null, persianSummary, subUpdates, site_links, type, apiDataUpdateFields);
        } else {
            //new source
            await handleUpdate(collection, db_data, true, result, persianSummary, subUpdates, site_links, type, apiDataUpdateFields);
        }

    } catch (error) {
        saveError(error);
    }
}

function getSaveObj(title, page_link, type, site_links, year, poster, persianSummary, trailers) {
    //todo : use mongoose
    let {season, episode, quality, hardSub, dubbed} = getLatestData(site_links, type);
    return {
        title: title,
        type: type,
        sources: [{
            url: page_link,
            links: site_links
        }],
        like: 0,
        dislike: 0,
        insert_date: new Date(),
        update_date: 0,
        seasons: [],
        episodes: [],
        poster: [poster],
        summary: {persian: persianSummary},
        trailers: trailers.length > 0 ? trailers : null,
        latestData: {
            season: type === 'movie' ? 0 : season,
            episode: type === 'movie' ? 0 : episode,
            quality: quality,
            hardSub: hardSub,
            dubbed: dubbed
        },
        tvmazeID: 0,
        isAnimation: false,
        status: 'ended',
        releaseDay: '',
        year: year,
        premiered: year,
        officialSite: '',
        nextEpisode: null,
        totalDuration: ''
    };
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
        poster: 1,
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
        let cases = [year, (YEAR + 1).toString(), (YEAR - 1).toString()];
        db_data = await collection.findOne({title: title, type: type, premiered: cases[0]}, {projection: dataConfig});
        if (db_data === null) {
            db_data = await collection.findOne({
                title: title,
                type: type,
                premiered: cases[1]
            }, {projection: dataConfig});
        }
        if (db_data === null) {
            db_data = await collection.findOne({
                title: title,
                type: type,
                premiered: cases[2]
            }, {projection: dataConfig});
        }
    }
    return {collection, db_data};
}

async function handleUpdate(collection, db_data, linkUpdate, result, site_persianSummary, subUpdates, site_links, type, apiDataUpdate) {
    try {
        let updateFields = apiDataUpdate !== null ? apiDataUpdate : {};

        if (type === 'serial') {
            let {seasonsUpdate, episodesUpdate} = handleSiteSeasonEpisodeUpdate(db_data, site_links, true);
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

        if (db_data.summary.persian === '') {
            db_data.summary.persian = site_persianSummary;
            updateFields.summary = db_data.summary;
        }

        if (subUpdates.posterChange) {
            updateFields.poster = db_data.poster;
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

function handleLinkUpdate(collection, db_data, page_link, persian_summary, type, site_links) {
    for (let j = 0; j < db_data.sources.length; j++) {//check source exist
        if (checkSource(db_data.sources[j].url, page_link)) { // this source exist
            let shouldUpdate = checkLinksChanged(site_links, db_data.sources[j].links, type);
            if (shouldUpdate) {
                db_data.sources[j].links = site_links;
            }
            shouldUpdate = handleUrlUpdate(db_data.sources[j], page_link) || shouldUpdate;
            return shouldUpdate;
        }
    }
}

function checkLinksChanged(site_links, db_links, type) {
    if (site_links.length !== db_links.length) {
        return true;
    }

    if (type === 'movie') {
        for (let i = 0; i < site_links.length; i++) {
            if (site_links[i].link !== db_links[i].link) {
                return true;
            }
        }
    } else {
        for (let i = 0; i < site_links.length; i++) {//check links exist
            let link_exist = false;
            for (let j = 0; j < db_links.length; j++) {
                if (site_links[i].link === db_links[j].link) { //this link exist
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
