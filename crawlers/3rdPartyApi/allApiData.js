const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const {getOMDBApiData, getOMDBApiFields} = require('./omdbApi');
const {getTvMazeApiData, getTvMazeApiFields} = require("./tvmazeApi");
const {getJikanApiData, getJikanApiFields} = require('./jikanApi');
const getCollection = require('../../mongoDB');
const {handleSeasonEpisodeUpdate, getTotalDuration, getEndYear} = require('../seasonEpisode');
const {removeDuplicateElements} = require('../utils');
const {saveError} = require('../../saveError');
const {dataConfig} = require("../../routes/configs");

axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        (error.response &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});


export async function addApiData(titleModel, site_links) {
    titleModel.apiUpdateDate = new Date();

    let {omdbApiData, tvmazeApiData} = await handleApiCalls(titleModel);
    let omdbApiFields = null, tvmazeApiFields = null, jikanApiFields = null;

    if (omdbApiData !== null) {
        omdbApiFields = getOMDBApiFields(omdbApiData, titleModel.type);
        if (omdbApiFields) {
            titleModel = {...titleModel, ...omdbApiFields.updateFields};
            updateSpecificFields(titleModel, titleModel, omdbApiFields, 'omdb');
            titleModel.rating = {...titleModel.rating, ...omdbApiFields.rating};
        }
    }

    if (tvmazeApiData !== null) {
        tvmazeApiFields = getTvMazeApiFields(tvmazeApiData);
        if (tvmazeApiFields) {
            titleModel = {...titleModel, ...tvmazeApiFields.updateFields};
            updateSpecificFields(titleModel, titleModel, tvmazeApiFields, 'tvmaze');
        }
    }

    if (titleModel.type.includes('serial')) {
        let seasonEpisodeFieldsUpdate = await updateSeasonEpisodeFields(titleModel, site_links, titleModel.totalSeasons, omdbApiFields, tvmazeApiFields, false);
        titleModel = {...titleModel, ...seasonEpisodeFieldsUpdate};
    }

    if (titleModel.type.includes('anime')) {
        let jikanApiData = await getJikanApiData(titleModel.title, titleModel.rawTitle, titleModel.type, 0, true);
        if (jikanApiData) {
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                titleModel = {...titleModel, ...jikanApiFields.updateFields};
                if (!titleModel.movieLang) {
                    titleModel.movieLang = 'japanese';
                }
                if (!titleModel.country) {
                    titleModel.country = 'japan';
                }
                if (titleModel.status === 'unknown') {
                    titleModel.status = jikanApiFields.status;
                    titleModel.endYear = jikanApiFields.endYear;
                }
                updateSpecificFields(titleModel, titleModel, jikanApiFields, 'jikan');
                titleModel.rating.myAnimeList = jikanApiFields.myAnimeListScore;
                titleModel.relatedTitles = getAnimeRelatedTitles(titleModel, jikanApiFields.jikanRelatedTitles);
            }
        }
    }


    return {
        titleModel,
        allApiData: {
            omdbApiFields, tvmazeApiFields, jikanApiFields
        }
    };
}

export async function apiDataUpdate(db_data, site_links, titleObj, siteType) {
    let now = new Date();
    let apiUpdateDate = new Date(db_data.apiUpdateDate);
    let hoursBetween = (now.getTime() - apiUpdateDate.getTime()) / (3600 * 1000);
    if (hoursBetween <= 6) {
        return null;
    }

    let updateFields = {};
    updateFields.apiUpdateDate = now;

    let titleUpdateResult = handleTitleUpdate(db_data, updateFields, titleObj, siteType);
    db_data = titleUpdateResult.db_data;
    updateFields = titleUpdateResult.updateFields;

    let {omdbApiData, tvmazeApiData} = await handleApiCalls(db_data);
    let omdbApiFields = null, tvmazeApiFields = null, jikanApiFields = null;

    if (omdbApiData !== null) {
        omdbApiFields = getOMDBApiFields(omdbApiData, db_data.type);
        if (omdbApiFields) {
            updateFields = {...updateFields, ...omdbApiFields.updateFields};
            updateSpecificFields(db_data, updateFields, omdbApiFields, 'omdb');
            db_data.rating = {...db_data.rating, ...omdbApiFields.rating};
            updateFields.rating = db_data.rating;
        }
    }

    if (tvmazeApiData !== null) {
        tvmazeApiFields = getTvMazeApiFields(tvmazeApiData);
        if (tvmazeApiFields) {
            updateFields = {...updateFields, ...tvmazeApiFields.updateFields};
            updateSpecificFields(db_data, updateFields, tvmazeApiFields, 'tvmaze');
        }
    }

    if (db_data.type.includes('serial')) {
        let seasonEpisodeFieldsUpdate = await updateSeasonEpisodeFields(db_data, site_links, updateFields.totalSeasons, omdbApiFields, tvmazeApiFields, true);
        updateFields = {...updateFields, ...seasonEpisodeFieldsUpdate};
    }

    if (db_data.type.includes('anime')) {
        let jikanApiData = await getJikanApiData(db_data.title, db_data.rawTitle, db_data.type, 0, true);
        if (jikanApiData) {
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                updateFields = {...updateFields, ...jikanApiFields.updateFields};
                updateSpecificFields(db_data, updateFields, jikanApiFields, 'jikan');
                let currentRating = updateFields.rating ? updateFields.rating : db_data.rating;
                currentRating.myAnimeList = jikanApiFields.myAnimeListScore;
                db_data.rating = currentRating;
                updateFields.rating = currentRating;
                let newRelatedTitles = getAnimeRelatedTitles(db_data, jikanApiFields.jikanRelatedTitles);
                db_data.relatedTitles = newRelatedTitles;
                updateFields.relatedTitles = newRelatedTitles;
            }
        }
    }

    return {
        updateFields,
        allApiData: {
            omdbApiFields, tvmazeApiFields, jikanApiFields
        }
    };
}

function handleTitleUpdate(db_data, updateFields, titleObj, siteType) {
    if (!db_data.type.includes('anime') &&
        (siteType.includes('anime') || titleObj.jikanFound)) {
        if (titleObj.jikanFound) {
            delete titleObj.jikanFound;
            db_data = {...db_data, ...titleObj};
            updateFields = {...updateFields, ...titleObj};
        }
        let type = siteType.includes('anime') ? siteType : 'anime_' + siteType;
        db_data.type = type;
        updateFields.type = type;
    } else if (
        titleObj.jikanFound &&
        (
            db_data.rawTitle !== titleObj.rawTitle ||
            db_data.alternateTitles.length < titleObj.alternateTitles.length
        )
    ) {
        delete titleObj.jikanFound;
        db_data = {...db_data, ...titleObj};
        updateFields = {...updateFields, ...titleObj};
    }
    return {db_data, updateFields};
}

async function handleApiCalls(titleData) {
    let omdbApiData, tvmazeApiData;
    if (titleData.type.includes('serial')) {
        let results = await Promise.all([
            handle_OMDB_TvMaze_ApiCall(titleData, 'omdb'),
            handle_OMDB_TvMaze_ApiCall(titleData, 'tvmaze')
        ]);
        omdbApiData = results[0];
        tvmazeApiData = results[1];
    } else {
        omdbApiData = await handle_OMDB_TvMaze_ApiCall(titleData, 'omdb');
        tvmazeApiData = null;
    }
    return {omdbApiData, tvmazeApiData};
}

async function handle_OMDB_TvMaze_ApiCall(titleData, apiName) {
    let searchTitle = (apiName === 'omdb') ? titleData.rawTitle || titleData.title : titleData.title;
    let result = (apiName === 'omdb')
        ? await getOMDBApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.premiered, titleData.type)
        : await getTvMazeApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.type);
    if (result) {
        return result;
    } else {
        let alternateTitlesSize = Math.min(titleData.alternateTitles.length, 2);
        for (let i = 0; i < alternateTitlesSize; i++) {
            if (titleData.alternateTitles[i].toLowerCase() === searchTitle.toLowerCase()) {
                continue;
            }
            let newAlternateTitles = [...titleData.alternateTitles, titleData.rawTitle];
            result = (apiName === 'omdb')
                ? await getOMDBApiData(titleData.alternateTitles[i], newAlternateTitles, titleData.titleSynonyms, titleData.premiered, titleData.type)
                : await getTvMazeApiData(titleData.alternateTitles[i], newAlternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.type);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

function updateSpecificFields(oldData, updateFields, apiFields, apiName) {
    if (
        (apiName === 'jikan' && apiFields.summary_en) ||
        ((!oldData.summary.english || oldData.summary.english.length < apiFields.summary_en) && apiFields.summary_en)
    ) {
        oldData.summary.english = apiFields.summary_en;
        updateFields.summary = oldData.summary;
    }
    //---------------------
    let isAnime = (apiName === 'jikan' || (apiName === 'tvmaze' && apiFields.isAnime));
    let isAnimation = (apiName === 'tvmaze' && apiFields.isAnimation);
    let newGenres = getNewGenres(oldData, apiFields.genres, isAnime, isAnimation);
    if (newGenres) {
        oldData.genres = newGenres;
        updateFields.genres = newGenres;
    }
    //--------------------
    if (apiName === 'jikan') {
        if ((!updateFields.status && oldData.status === 'unknown') ||
            (updateFields.status && updateFields.status === 'unknown')) {
            updateFields.status = apiFields.status;
            updateFields.endYear = apiFields.endYear;
        }
    }
}

function getNewGenres(data, apiGenres, isAnime, isAnimation) {
    let newGenres = [...data.genres, ...apiGenres];
    if (isAnime || data.type.includes('anime')) {
        newGenres.push('anime');
    }
    if (isAnimation && !isAnime) {
        newGenres.push('animation');
    }
    newGenres = removeDuplicateElements(newGenres);
    if (newGenres.length !== data.genres.length) {
        return newGenres;
    } else {
        let oldGenres = data.genres;
        for (let i = 0; i < newGenres.length; i++) {
            if (newGenres[i] !== oldGenres[i]) {
                return newGenres;
            }
        }
        return null;
    }
}

async function updateSeasonEpisodeFields(db_data, site_links, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist) {
    let fields = {};
    let {
        seasonsUpdate,
        episodesUpdate,
        nextEpisodeUpdate
    } = await handleSeasonEpisodeUpdate(db_data, site_links, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist);

    if (seasonsUpdate) {
        fields.seasons = db_data.seasons;
    }
    if (episodesUpdate) {
        fields.episodes = db_data.episodes;
        fields.totalDuration = getTotalDuration(db_data.episodes, db_data.latestData);
        fields.endYear = getEndYear(db_data.episodes, db_data.status, db_data.year);
    }
    if (nextEpisodeUpdate) {
        fields.nextEpisode = db_data.nextEpisode;
    }
    return fields;
}

async function getAnimeRelatedTitles(titleData, jikanRelatedTitles) {
    try {
        let collection = await getCollection('movies');
        let newRelatedTitles = [];
        for (let i = 0; i < jikanRelatedTitles.length; i++) {
            let searchResult = await collection.findOne({
                jikanID: jikanRelatedTitles[i].jikanID
            }, {projection: dataConfig['medium']});
            if (searchResult) {
                newRelatedTitles.push(searchResult);
            } else {
                newRelatedTitles.push(jikanRelatedTitles[i]);
            }
        }
        return newRelatedTitles;
    } catch (error) {
        saveError(error);
        return titleData.relatedTitles;
    }
}
