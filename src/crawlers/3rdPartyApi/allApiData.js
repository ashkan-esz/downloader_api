const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const {getOMDBApiData, getOMDBApiFields} = require('./omdbApi');
const {getTvMazeApiData, getTvMazeApiFields} = require("./tvmazeApi");
const {getJikanApiData, getJikanApiFields, getAnimeRelatedTitles} = require('./jikanApi');
const {uploadTitlePosterToS3, uploadTitleTrailerFromYoutubeToS3} = require('../../data/cloudStorage');
const {handleSeasonEpisodeUpdate, getTotalDuration, getEndYear} = require('../seasonEpisode');
const {sortPosters, sortTrailers} = require('../subUpdates');
const {removeDuplicateElements, replaceSpecialCharacters, getDatesBetween} = require('../utils');


axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'SlowDown' ||
        (error.response &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});


export async function addApiData(titleModel, site_links) {
    titleModel.apiUpdateDate = new Date();

    let s3poster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, titleModel.posters);
    if (s3poster) {
        titleModel.poster_s3 = s3poster;
        titleModel.posters.push(titleModel.poster_s3);
        titleModel.posters = sortPosters(titleModel.posters);
    }

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
        let jikanApiData = await getJikanApiData(titleModel.title, titleModel.year, titleModel.type, titleModel.jikanID);
        if (jikanApiData) {
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                if (jikanApiFields.youtubeTrailer) {
                    let trailerUploadFields = await handleTrailerUpload(titleModel, jikanApiFields.youtubeTrailer);
                    titleModel = {...titleModel, ...trailerUploadFields};
                }

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
                titleModel.relatedTitles = await getAnimeRelatedTitles(titleModel, jikanApiFields.jikanRelatedTitles);
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

export async function apiDataUpdate(db_data, site_links, siteType) {
    let now = new Date();
    let apiUpdateDate = new Date(db_data.apiUpdateDate);
    if (getDatesBetween(now, apiUpdateDate).hours < 8) {
        return null;
    }

    let updateFields = {};
    updateFields.apiUpdateDate = now;

    if (db_data.poster_s3 === '') {
        let s3poster = await uploadTitlePosterToS3(db_data.title, db_data.type, db_data.year, db_data.posters);
        if (s3poster) {
            db_data.poster_s3 = s3poster
            updateFields.poster_s3 = s3poster;
        }
    }

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

    if (db_data.type.includes('anime') || siteType.includes('anime')) {
        let jikanApiData = await getJikanApiData(db_data.title, db_data.year, db_data.type, db_data.jikanID);
        if (jikanApiData) {
            let temp = handleTypeAndTitleUpdate(db_data, jikanApiData.titleObj, siteType);
            db_data = {...db_data, ...temp};
            updateFields = {...updateFields, ...temp};
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                if (!db_data.trailer_s3 && !db_data.trailers && jikanApiFields.youtubeTrailer) {
                    let trailerUploadFields = await handleTrailerUpload(db_data, jikanApiFields.youtubeTrailer);
                    db_data = {...db_data, ...trailerUploadFields};
                    updateFields = {...updateFields, ...trailerUploadFields};
                }

                updateFields = {...updateFields, ...jikanApiFields.updateFields};
                updateSpecificFields(db_data, updateFields, jikanApiFields, 'jikan');
                let currentRating = updateFields.rating ? updateFields.rating : db_data.rating;
                currentRating.myAnimeList = jikanApiFields.myAnimeListScore;
                db_data.rating = currentRating;
                updateFields.rating = currentRating;
                let newRelatedTitles = await getAnimeRelatedTitles(db_data, jikanApiFields.jikanRelatedTitles);
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

function handleTypeAndTitleUpdate(db_data, titleObj, siteType) {
    let temp = {
        type: siteType,
        ...titleObj,
    };
    //if this anime detected as movie before , add alternate title if needed.
    if (db_data.title !== titleObj.title) {
        temp.alternateTitles.push(db_data.title);
        temp.alternateTitles = removeDuplicateElements(temp.alternateTitles);
    }
    return temp;
}

async function handleTrailerUpload(titleData, youtubeTrailer) {
    let temp = {};
    let s3Trailer = await uploadTitleTrailerFromYoutubeToS3(titleData.title, titleData.type, titleData.year, [youtubeTrailer]);
    if (s3Trailer) {
        temp.trailer_s3 = s3Trailer;
        let trailers = titleData.trailers ? titleData.trailers : [];
        trailers.push({
            link: s3Trailer,
            info: 's3Trailer-720p'
        });
        temp.trailers = sortTrailers(trailers);
    }
    return temp;
}

async function handleApiCalls(titleData) {
    let omdbApiData, tvmazeApiData;
    if (titleData.type.includes('serial')) {
        let results = await Promise.allSettled([
            handle_OMDB_TvMaze_ApiCall(titleData, 'omdb'),
            handle_OMDB_TvMaze_ApiCall(titleData, 'tvmaze')
        ]);
        omdbApiData = results[0].value;
        tvmazeApiData = results[1].value;
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
        let japaneseRegex = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/gi;
        searchTitle = replaceSpecialCharacters(searchTitle.toLowerCase());
        let alternateTitles = titleData.alternateTitles
            .map(item => replaceSpecialCharacters(item.toLowerCase()))
            .filter(item => item !== searchTitle && !item.match(japaneseRegex));
        alternateTitles = removeDuplicateElements(alternateTitles);

        let newAlternateTitles = [...alternateTitles, titleData.rawTitle];
        for (let i = 0; i < alternateTitles.length; i++) {
            result = (apiName === 'omdb')
                ? await getOMDBApiData(alternateTitles[i], newAlternateTitles, titleData.titleSynonyms, titleData.premiered, titleData.type)
                : await getTvMazeApiData(alternateTitles[i], newAlternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.type);
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
