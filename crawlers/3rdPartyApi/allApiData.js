import {saveError} from "../../saveError";

const {getJikanApiData, getJikanApiFields} = require('./jikanApi');
const {getOMDBApiData, getOMDBApiFields} = require('./omdbApi');
const {getTvMazeApiData, getTvMazeApiFields} = require("./tvmazeApi");
const getCollection = require('../../mongoDB');
const {handleSeasonEpisodeUpdate, getTotalDuration, getEndYear} = require('../seasonEpisode');
const {removeDuplicateElements} = require('../utils');
const {dataConfig} = require("../../routes/configs");


export async function addApiData(titleModel, site_links) {
    titleModel.apiUpdateDate = new Date();

    let omdbApiData = await handle_OMDB_TvMaze_ApiCall(titleModel, 'omdb');
    let omdbApiFields = null;
    if (omdbApiData !== null) {
        omdbApiFields = getOMDBApiFields(omdbApiData, titleModel.type);
        if (omdbApiFields) {
            titleModel = {...titleModel, ...omdbApiFields.updateFields};
            updateSpecificFields(titleModel, titleModel, omdbApiFields, 'omdb');
        }
    }

    if (titleModel.type.includes('serial')) {
        let tvmazeApiData = await handle_OMDB_TvMaze_ApiCall(titleModel, 'tvmaze');
        let tvmazeApiFields = null;
        if (tvmazeApiData !== null) {
            tvmazeApiFields = getTvMazeApiFields(tvmazeApiData);
            if (tvmazeApiFields) {
                titleModel = {...titleModel, ...tvmazeApiFields.updateFields};
                updateSpecificFields(titleModel, titleModel, tvmazeApiFields, 'tvmaze');
            }
        }
        let seasonEpisodeFieldsUpdate = await updateSeasonEpisodeFields(titleModel, site_links, titleModel.totalSeasons, omdbApiFields, tvmazeApiFields, false);
        titleModel = {...titleModel, ...seasonEpisodeFieldsUpdate};
    }

    if (titleModel.type.includes('anime')) {
        let jikanApiData = await getJikanApiData(titleModel.title, titleModel.rawTitle, titleModel.type, true);
        if (jikanApiData) {
            let jikanApiFields = getJikanApiFields(jikanApiData);
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
                titleModel.relatedTitles = getAnimeRelatedTitles(titleModel, jikanApiFields.jikanRelatedTitles);
            }
        }
    }

    return titleModel;
}

export async function apiDataUpdate(db_data, site_links, titleObj, siteType) {
    let now = new Date();
    let apiUpdateDate = new Date(db_data.apiUpdateDate);
    let hoursBetween = (now.getTime() - apiUpdateDate.getTime()) / (3600 * 1000);
    if (hoursBetween <= 4) {
        return null;
    }

    let updateFields = {};
    updateFields.apiUpdateDate = now;

    let titleUpdateResult = handleTitleUpdate(db_data, updateFields, titleObj, siteType);
    db_data = titleUpdateResult.db_data;
    updateFields = titleUpdateResult.updateFields;

    let omdbApiData = await handle_OMDB_TvMaze_ApiCall(db_data, 'omdb');
    let omdbApiFields = null;
    if (omdbApiData !== null) {
        omdbApiFields = getOMDBApiFields(omdbApiData, db_data.type);
        if (omdbApiFields) {
            updateFields = {...updateFields, ...omdbApiFields.updateFields};
            updateSpecificFields(db_data, updateFields, omdbApiFields, 'omdb');
        }
    }

    if (db_data.type.includes('serial')) {
        let tvmazeApiData = await handle_OMDB_TvMaze_ApiCall(db_data, 'tvmaze');
        let tvmazeApiFields = null;
        if (tvmazeApiData !== null) {
            tvmazeApiFields = getTvMazeApiFields(tvmazeApiData);
            if (tvmazeApiFields) {
                updateFields = {...updateFields, ...tvmazeApiFields.updateFields};
                updateSpecificFields(db_data, updateFields, tvmazeApiFields, 'tvmaze');
            }
        }
        let seasonEpisodeFieldsUpdate = await updateSeasonEpisodeFields(db_data, site_links, updateFields.totalSeasons, omdbApiFields, tvmazeApiFields, true);
        updateFields = {...updateFields, ...seasonEpisodeFieldsUpdate};
    }

    if (db_data.type.includes('anime')) {
        let jikanApiData = await getJikanApiData(db_data.title, db_data.rawTitle, db_data.type, true);
        if (jikanApiData) {
            let jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                updateFields = {...updateFields, ...jikanApiFields.updateFields};
                updateSpecificFields(db_data, updateFields, jikanApiFields, 'jikan');
                let newRelatedTitles = getAnimeRelatedTitles(db_data, jikanApiFields.jikanRelatedTitles);
                db_data.relatedTitles = newRelatedTitles;
                updateFields.relatedTitles = newRelatedTitles;
            }
        }
    }

    return updateFields;
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

async function handle_OMDB_TvMaze_ApiCall(titleData, apiName) {
    let searchTitle = (apiName === 'omdb') ? titleData.rawTitle || titleData.title : titleData.title;
    let result = (apiName === 'omdb')
        ? await getOMDBApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.premiered, titleData.type)
        : await getTvMazeApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.type);
    if (result) {
        return result;
    } else {
        for (let i = 0; i < titleData.alternateTitles.length - 1; i++) {
            if (titleData.alternateTitles[i].toLowerCase() === titleData.rawTitle.toLowerCase()) {
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
