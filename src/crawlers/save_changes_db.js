const {searchTitleDB, insertToDB, updateByIdDB} = require('../data/dbMethods');
const {deleteTrailerFromS3} = require('../data/cloudStorage');
const {checkSourceExist, checkSource} = require('./utils');
const {addApiData, apiDataUpdate} = require('./3rdPartyApi/allApiData');
const {addStaffAndCharacters} = require('./3rdPartyApi/personCharacter');
const {handleSiteSeasonEpisodeUpdate, getTotalDuration} = require("./seasonEpisode");
const {handleSubUpdates, handleUrlUpdate} = require("./subUpdates");
const {getUploadedAnimeListSubtitles, handleSubtitleUpdate} = require("./subtitle");
const {getMovieModel} = require("../models/movie");
const {getJikanApiData, connectNewAnimeToRelatedTitles} = require("./3rdPartyApi/jikanApi");
const {saveError} = require("../error/saveError");


module.exports = async function save(title, year, page_link, siteDownloadLinks, persianSummary, poster, trailers, watchOnlineLinks, subtitles, cookies, type) {
    try {
        let {titleObj, db_data} = await getTitleObjAndDbData(title, year, type, siteDownloadLinks);

        let titleModel = getMovieModel(titleObj, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles);
        let uploadedSubtitles = await getUploadedAnimeListSubtitles(page_link, subtitles, cookies);

        if (db_data === null) {//new title
            if (siteDownloadLinks.length > 0) {
                titleModel.subtitles = uploadedSubtitles;
                let result = await addApiData(titleModel, siteDownloadLinks);
                let insertedId = await insertToDB('movies', result.titleModel);
                if (insertedId) {
                    if (type.includes('anime')) {
                        await connectNewAnimeToRelatedTitles(titleModel, insertedId);
                    }
                    let castAndCharacters = await getCastAndCharactersFromApi(insertedId, titleModel, result.allApiData);
                    if (castAndCharacters) {
                        await updateByIdDB('movies', insertedId, castAndCharacters);
                    }
                }
            }
            return;
        }

        let apiData = await apiDataUpdate(db_data, siteDownloadLinks, type, poster);
        let subUpdates = handleSubUpdates(db_data, poster, trailers, watchOnlineLinks, titleModel, type);
        if (checkSourceExist(db_data.sources, page_link)) {
            let linkUpdate = handleDownloadLinksUpdate(db_data, page_link, persianSummary, type, siteDownloadLinks);
            await handleUpdate(db_data, linkUpdate, null, persianSummary, subUpdates, siteDownloadLinks, uploadedSubtitles, type, apiData);
        } else if (siteDownloadLinks.length > 0) {
            //new source
            await handleUpdate(db_data, true, titleModel, persianSummary, subUpdates, siteDownloadLinks, uploadedSubtitles, type, apiData);
        }

    } catch (error) {
        await saveError(error);
    }
}

async function getTitleObjAndDbData(title, year, type, siteDownloadLinks) {
    let titleObj = await getTitleObj(title, year, type, false);
    let db_data = await searchOnCollection(titleObj, year, type);
    if (db_data) {
        titleObj = {
            title: db_data.title,
            rawTitle: db_data.rawTitle,
            alternateTitles: db_data.alternateTitles,
            titleSynonyms: db_data.titleSynonyms,
            jikanID: db_data.jikanID,
        }
    } else if (type.includes('anime') && siteDownloadLinks.length > 0) {
        titleObj = await getTitleObj(title, year, type, true);
        db_data = await searchOnCollection(titleObj, year, type);
    }
    return {titleObj, db_data};
}

async function getTitleObj(title, year, type, useJikanApi) {
    let rawTitle = title.split(' ').map(value => value.charAt(0).toUpperCase() + value.slice(1)).join(' ');
    let titleObj = {
        title: title,
        rawTitle: rawTitle,
        alternateTitles: [],
        titleSynonyms: [],
        jikanID: 0,
    }

    if (useJikanApi) {
        let jikanApiData = await getJikanApiData(titleObj.title, year, type, 0);
        if (jikanApiData) {
            titleObj = jikanApiData.titleObj;
            titleObj.jikanID = jikanApiData.mal_id;
        }
    }

    return titleObj;
}

async function searchOnCollection(titleObj, year, type) {
    let db_data = null;
    let dataConfig = {
        releaseState: 1,
        rank: 1,
        title: 1,
        type: 1,
        premiered: 1,
        year: 1,
        rawTitle: 1,
        alternateTitles: 1,
        titleSynonyms: 1,
        apiUpdateDate: 1,
        castUpdateDate: 1,
        status: 1,
        imdbID: 1,
        tvmazeID: 1,
        jikanID: 1,
        sources: 1,
        summary: 1,
        posters: 1,
        poster_s3: 1,
        trailer_s3: 1,
        trailers: 1,
        watchOnlineLinks: 1,
        subtitles: 1,
        genres: 1,
        rating: 1,
        duration: 1,
        totalSeasons: 1,
        seasons: 1,
        episodes: 1,
        latestData: 1,
        nextEpisode: 1,
        like: 1,
        dislike: 1,
        releaseDay: 1,
    };

    let searchTypes = [type];
    if (type.includes('anime')) {
        searchTypes.push(type.replace('anime_', ''));
    } else {
        searchTypes.push(('anime_' + type));
    }

    let searchResults = await searchTitleDB(titleObj, searchTypes, year, dataConfig);

    A: for (let i = 0; i < searchTypes.length; i++) {
        for (let j = 0; j < searchResults.length; j++) {
            if (searchTypes[i] === searchResults[j].type) {
                db_data = searchResults[j];
                break A;
            }
        }
    }

    return db_data;
}

async function handleUpdate(db_data, linkUpdate, result, site_persianSummary, subUpdates, siteDownloadLinks, uploadedSubtitles, type, apiData) {
    try {
        let updateFields = apiData ? apiData.updateFields : {};

        if (db_data.releaseState !== 'done') {
            await convertUnReleasedTitleToNewTitle(db_data, updateFields, type);
        }

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
            let prevSize = db_data.sources.length;
            let newSources = db_data.sources.filter(item => item.links.length > 0);
            let newSize = newSources.length;
            if (newSize === 0 && db_data.releaseState === 'done') {
                if (db_data.trailer_s3) {
                    let fileName = db_data.trailer_s3.split('/').pop();
                    let trailerRemoved = await deleteTrailerFromS3(fileName);
                    if (trailerRemoved) {
                        if (db_data.trailers) {
                            db_data.trailers = db_data.trailers.filter(item => item.link !== db_data.trailer_s3);
                        }
                        if (db_data.trailers && db_data.trailers.length === 0) {
                            db_data.trailers = null;
                        }
                        updateFields.trailers = db_data.trailers;
                        db_data.trailer_s3 = '';
                        updateFields.trailer_s3 = '';
                    }
                }
            } else if (prevSize !== newSize) {
                db_data.sources = newSources;
                updateFields.sources = newSources;
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
        if (subUpdates.trailerChange || updateFields.trailer_s3) {
            updateFields.trailers = db_data.trailers;
        }
        if (subUpdates.watchOnlineLinksChange) {
            updateFields.watchOnlineLinks = db_data.watchOnlineLinks;
        }

        if (subUpdates.latestDataChange) {
            updateFields.latestData = db_data.latestData;
            updateFields.update_date = new Date();
        }

        if (uploadedSubtitles.length > 0) {
            let mergedSubtitles = handleSubtitleUpdate(db_data.subtitles, uploadedSubtitles);
            if (db_data.subtitles.length !== mergedSubtitles.length) {
                updateFields.subtitles = mergedSubtitles;
            }
        }

        const {_handleCastUpdate} = require('./crawler');
        if (apiData && _handleCastUpdate) {
            let castAndCharacters = await getCastAndCharactersFromApi(db_data._id, db_data, apiData.allApiData);
            if (castAndCharacters) {
                updateFields = {...updateFields, ...castAndCharacters};
            }
        }

        if (db_data.trailer_s3 && db_data.trailers && db_data.trailers.length > 1) {
            //remove trailer from s3
            let fileName = db_data.trailer_s3.split('/').pop();
            let removeS3Trailer = await deleteTrailerFromS3(fileName);
            if (removeS3Trailer) {
                db_data.trailer_s3 = '';
                updateFields.trailer_s3 = '';
                db_data.trailers = db_data.trailers.filter(item => !item.info.includes('s3Trailer'));
                updateFields.trailers = db_data.trailers;
            }
        }

        if (Object.keys(updateFields).length > 0) {
            await updateByIdDB('movies', db_data._id, updateFields);
        }

    } catch (error) {
        saveError(error);
    }
}

function handleDownloadLinksUpdate(db_data, page_link, persian_summary, type, siteDownloadLinks) {
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

async function getCastAndCharactersFromApi(insertedId, titleData, allApiData) {
    let poster = titleData.posters.length > 0 ? titleData.posters[0] : '';
    let temp = await addStaffAndCharacters(insertedId, titleData.rawTitle, poster, allApiData, titleData.castUpdateDate);
    if (temp) {
        return {
            staffAndCharactersData: temp.staffAndCharactersData,
            actors: temp.actors,
            directors: temp.directors,
            writers: temp.writers,
            castUpdateDate: new Date(),
        }
    }
    return null;
}

async function convertUnReleasedTitleToNewTitle(db_data, updateFields, type) {
    db_data.releaseState = 'done';
    updateFields.releaseState = 'done';
    db_data.insert_date = new Date();
    updateFields.insert_date = new Date();
    if (type.includes('anime')) {
        await connectNewAnimeToRelatedTitles(db_data, db_data._id);
    }
}
