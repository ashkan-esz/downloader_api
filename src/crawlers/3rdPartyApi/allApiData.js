import axios from "axios";
import {getOMDBApiData, getOMDBApiFields} from "./omdbApi.js";
import {getTvMazeApiData, getTvMazeApiFields} from "./tvmazeApi.js";
import {getJikanApiData, getJikanApiFields, getAnimeRelatedTitles} from "./jikanApi.js";
import {uploadTitlePosterToS3} from "../../data/cloudStorage.js";
import {handleSeasonEpisodeUpdate, getTotalDuration, getEndYear, getSeasonEpisode} from "../seasonEpisode.js";
import {sortPosters} from "../subUpdates.js";
import {uploadTitleYoutubeTrailerAndAddToTitleModel} from "../posterAndTrailer.js";
import {removeDuplicateElements, replaceSpecialCharacters, getDatesBetween} from "../utils.js";
import {saveError} from "../../error/saveError.js";


export async function addApiData(titleModel, site_links, siteWatchOnlineLinks, sourceName) {
    titleModel.apiUpdateDate = new Date();

    if (titleModel.posters.length > 0) {
        let s3poster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, titleModel.posters[0].url);
        if (s3poster) {
            titleModel.poster_s3 = s3poster;
            if (s3poster.originalUrl) {
                titleModel.posters[0].size = s3poster.originalSize || s3poster.size;
            }
            titleModel.posters.push({
                url: s3poster.url,
                info: 's3Poster',
                size: s3poster.size,
                vpnStatus: s3poster.vpnStatus,
            });
            titleModel.posters = sortPosters(titleModel.posters);
        }
    }

    let {omdbApiData, tvmazeApiData} = await handleApiCalls(titleModel);
    let omdbApiFields = null, tvmazeApiFields = null, jikanApiFields = null;

    if (omdbApiData !== null) {
        omdbApiFields = getOMDBApiFields(omdbApiData, titleModel.type);
        if (omdbApiFields) {
            titleModel = {...titleModel, ...omdbApiFields.updateFields};
            updateSpecificFields(titleModel, titleModel, omdbApiFields, 'omdb');
            titleModel.rating = {...titleModel.rating, ...omdbApiFields.rating};
            if (omdbApiFields.year) {
                if (titleModel.type.includes('serial') || !titleModel.year) {
                    titleModel.year = omdbApiFields.year;
                }
            }
        }
    }

    if (tvmazeApiData !== null) {
        tvmazeApiFields = getTvMazeApiFields(tvmazeApiData);
        if (tvmazeApiFields) {
            titleModel = {...titleModel, ...tvmazeApiFields.updateFields};
            updateSpecificFields(titleModel, titleModel, tvmazeApiFields, 'tvmaze');
        }
    }


    if (!titleModel.type.includes('anime') && (omdbApiFields?.isAnime || tvmazeApiFields?.isAnime)) {
        titleModel.type = 'anime_' + titleModel.type;
    }

    if (titleModel.type.includes('serial')) {
        let seasonEpisodeFieldsUpdate = await updateSeasonsField(titleModel, sourceName, site_links, siteWatchOnlineLinks, titleModel.totalSeasons, omdbApiFields, tvmazeApiFields, false);
        titleModel = {...titleModel, ...seasonEpisodeFieldsUpdate};
    }

    if (titleModel.type.includes('anime')) {
        let jikanApiData = await getJikanApiData(titleModel.title, titleModel.year, titleModel.type, titleModel.jikanID);
        if (jikanApiData) {
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                if (jikanApiFields.youtubeTrailer) {
                    let trailerUploadFields = await uploadTitleYoutubeTrailerAndAddToTitleModel(titleModel, jikanApiFields.youtubeTrailer, {});
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

export async function apiDataUpdate(db_data, site_links, siteWatchOnlineLinks, siteType, sitePoster, sourceName) {
    let now = new Date();
    let apiUpdateDate = new Date(db_data.apiUpdateDate);
    if (getDatesBetween(now, apiUpdateDate).hours < 8) {
        return null;
    }

    let updateFields = {
        apiUpdateDate: now,
    };

    if (db_data.poster_s3 === null || await checkBetterS3Poster(db_data.posters, sourceName, sitePoster, db_data.poster_s3)) {
        let selectedPoster = sitePoster || (db_data.posters.length > 0 ? db_data.posters[0].url : '');
        let s3poster = await uploadTitlePosterToS3(db_data.title, db_data.type, db_data.year, selectedPoster, 0, true);
        if (s3poster) {
            db_data.poster_s3 = s3poster;
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
            if (omdbApiFields.year) {
                if (db_data.type.includes('serial') || !db_data.year) {
                    db_data.year = omdbApiFields.year;
                    updateFields.year = omdbApiFields.year;
                }
            }
        }
    }

    if (tvmazeApiData !== null) {
        tvmazeApiFields = getTvMazeApiFields(tvmazeApiData);
        if (tvmazeApiFields) {
            updateFields = {...updateFields, ...tvmazeApiFields.updateFields};
            updateSpecificFields(db_data, updateFields, tvmazeApiFields, 'tvmaze');
        }
    }

    if (!db_data.type.includes('anime') && (omdbApiFields?.isAnime || tvmazeApiFields?.isAnime)) {
        db_data.type = 'anime_' + db_data.type;
        updateFields.type = db_data.type;
    }

    if (db_data.type.includes('serial')) {
        let seasonEpisodeFieldsUpdate = await updateSeasonsField(db_data, sourceName, site_links, siteWatchOnlineLinks, updateFields.totalSeasons, omdbApiFields, tvmazeApiFields, true);
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
                if (!db_data.trailer_s3 && jikanApiFields.youtubeTrailer) {
                    let trailerUploadFields = await uploadTitleYoutubeTrailerAndAddToTitleModel(db_data, jikanApiFields.youtubeTrailer, {});
                    db_data = {...db_data, ...trailerUploadFields};
                    updateFields = {...updateFields, ...trailerUploadFields};
                }

                updateFields = {...updateFields, ...jikanApiFields.updateFields};
                if (db_data.type.includes('movie') && updateFields.year) {
                    updateFields.endYear = updateFields.year;
                }
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

async function checkBetterS3Poster(prevPosters, sourceName, newPosterUrl, prevS3Poster, retryCounter = 0) {
    try {
        //replace low quality poster of myAnimeList
        if (!newPosterUrl) {
            return false;
        }
        if (prevS3Poster.originalUrl.includes('cdn.myanimelist.net')) {
            return true;
        }
        let prevS3SourceName = prevS3Poster.originalUrl
            .replace(/https:|http:|\/\/|www\./g, '')
            .split('.')[0]
            .replace(/\d+/g, '');
        let newSourceName = newPosterUrl.replace(/https:|http:|\/\/|www\./g, '').split('.')[0].replace(/\d+/g, '');
        if (prevS3SourceName === newSourceName || prevS3Poster.size > 300 * 1024) {
            return false;
        }

        let newPosterSize = 0;
        for (let i = 0; i < prevPosters.length; i++) {
            if (prevPosters[i].info.includes(sourceName)) {
                newPosterSize = prevPosters[i].size;
            }
        }
        if (newPosterSize === 0) {
            let response = await axios.head(newPosterUrl);
            newPosterSize = Number(response.headers['content-length']) || 0;
        }
        if (newPosterSize > 0) {
            let diff = ((newPosterSize - prevS3Poster.size) / prevS3Poster.size) * 100;
            if (diff > 25 && newPosterSize < 1.5 * 1024 * 1024) { //1.5 MB
                return true;
            }
        }
        return false;
    } catch (error) {
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(newPosterUrl) === newPosterUrl && retryCounter < 1) {
            retryCounter++;
            let fileName = newPosterUrl.replace(/\/$/, '').split('/').pop();
            newPosterUrl = newPosterUrl.replace(fileName, encodeURIComponent(fileName));
            return await checkBetterS3Poster(prevPosters, sourceName, newPosterUrl, prevS3Poster, retryCounter);
        }

        if ((!error.response || error.response.status !== 404) && error.code !== 'ENOTFOUND') {
            //do not save 404|ENOTFOUND images errors
            saveError(error);
        }
        return false;
    }
}

function handleTypeAndTitleUpdate(db_data, titleObj, siteType) {
    let temp = {
        //dont override serial on anime_serial, like 'vinland saga' tagged as serial on some sources
        type: db_data.type.includes('anime') ? db_data.type : siteType,
        ...titleObj,
    };
    //if this anime detected as movie before , add alternate title if needed.
    if (db_data.title !== titleObj.title) {
        temp.alternateTitles.push(db_data.title);
        temp.alternateTitles = removeDuplicateElements(temp.alternateTitles);
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
        : await getTvMazeApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.premiered, titleData.type);
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
                : await getTvMazeApiData(alternateTitles[i], newAlternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.premiered, titleData.type);
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
        ((!oldData.summary.english || oldData.summary.english.length < apiFields.summary_en.replace(/([.…])+$/, '')) && apiFields.summary_en)
    ) {
        oldData.summary.english = apiFields.summary_en.replace(/([.…])+$/, '');
        oldData.summary.english_source = apiName;
        updateFields.summary = oldData.summary;
    }
    //---------------------
    let isAnime = (apiName === 'jikan' || ((apiName === 'tvmaze' || apiName === 'omdb') && apiFields.isAnime));
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

async function updateSeasonsField(db_data, sourceName, site_links, siteWatchOnlineLinks, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist) {
    let fields = {};
    let {
        seasonsUpdateFlag,
        nextEpisodeUpdateFlag
    } = await handleSeasonEpisodeUpdate(db_data, sourceName, site_links, siteWatchOnlineLinks, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist);

    if (seasonsUpdateFlag) {
        fields.seasons = db_data.seasons;
        fields.endYear = getEndYear(db_data.seasons, db_data.status, db_data.year);
        fields.seasonEpisode = getSeasonEpisode(db_data.seasons);
    }

    let newTotalDuration = getTotalDuration(db_data.seasons, db_data.latestData, db_data.type);
    if (db_data.totalDuration !== newTotalDuration) {
        fields.totalDuration = newTotalDuration;
    }

    if (nextEpisodeUpdateFlag) {
        fields.nextEpisode = db_data.nextEpisode;
    }
    return fields;
}
