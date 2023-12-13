import {getOMDBApiData, getOMDBApiFields} from "./omdbApi.js";
import {getTvMazeApiData, getTvMazeApiFields} from "./tvmazeApi.js";
import {getJikanApiData, getJikanApiFields, handleAnimeRelatedTitles} from "./jikanApi.js";
import {uploadTitlePosterToS3} from "../../data/cloudStorage.js";
import {handleSeasonEpisodeUpdate, getTotalDuration, getEndYear, getSeasonEpisode} from "../seasonEpisode.js";
import {sortPosters} from "../subUpdates.js";
import {checkNeedTrailerUpload, uploadTitleYoutubeTrailerAndAddToTitleModel} from "../posterAndTrailer.js";
import {removeDuplicateElements, replaceSpecialCharacters, getDatesBetween} from "../utils/utils.js";
import {getFileSize} from "../utils/axiosUtils.js";
import {getImageThumbnail} from "../../utils/sharpImageMethods.js";
import {
    changePageLinkStateFromCrawlerStatus, checkForceStopCrawler,
    linkStateMessages,
    partialChangePageLinkStateFromCrawlerStatus
} from "../status/crawlerStatus.js";
import {getKitsuApiData, getKitsuApiFields} from "./kitsuApi.js";
import {saveErrorIfNeeded} from "../../error/saveError.js";


export async function addApiData(titleModel, site_links, siteWatchOnlineLinks, sourceName, pageLink, extraConfigs) {
    titleModel.apiUpdateDate = new Date();

    if (titleModel.posters.length > 0) {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.uploadingPosterToS3);
        let s3poster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, titleModel.posters[0].url);
        if (s3poster) {
            titleModel.poster_s3 = s3poster;
            if (titleModel.posters.length === 1) {
                if (s3poster.originalUrl) {
                    titleModel.posters[0].size = s3poster.originalSize || s3poster.size;
                }
                if (s3poster.thumbnail) {
                    titleModel.posters[0].thumbnail = s3poster.thumbnail;
                }
            }
            titleModel.posters.push({
                url: s3poster.url,
                info: 's3Poster',
                size: s3poster.size,
                vpnStatus: s3poster.vpnStatus,
                thumbnail: s3poster.thumbnail,
            });
            titleModel.posters = sortPosters(titleModel.posters);
        }
        if (!titleModel.posters[0].thumbnail) {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.generatingThumbnail);
            let thumbnailData = await getImageThumbnail(titleModel.posters[0].url, true);
            if (thumbnailData) {
                titleModel.posters[0].size = thumbnailData.fileSize;
                titleModel.posters[0].thumbnail = thumbnailData.dataURIBase64;
            }
        }
    }

    if (checkForceStopCrawler()) {
        return;
    }
    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.callingOmdbTvMazeKitsu);
    let {omdbApiData, tvmazeApiData, kitsuApiData} = await handleApiCalls(titleModel, pageLink);
    let omdbApiFields = null, tvmazeApiFields = null, jikanApiFields = null, kitsuApiFields = null;

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

            if (tvmazeApiFields.backgroundPosters.length > 0 && titleModel.poster_wide_s3 === null) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.uploadingTvmazeWidePosterToS3);
                let imageUrl = tvmazeApiFields.backgroundPosters[1]?.resolutions?.original?.url ||
                    tvmazeApiFields.backgroundPosters[0].resolutions.original?.url ||
                    tvmazeApiFields.backgroundPosters[1]?.resolutions?.medium?.url ||
                    tvmazeApiFields.backgroundPosters[0].resolutions.medium?.url;
                if (imageUrl) {
                    let s3WidePoster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, imageUrl, false, true);
                    if (s3WidePoster) {
                        titleModel.poster_wide_s3 = s3WidePoster;
                    }
                }
            }
        }
    }


    if (!titleModel.type.includes('anime') && (omdbApiFields?.isAnime || tvmazeApiFields?.isAnime)) {
        titleModel.type = 'anime_' + titleModel.type;
    }

    if (checkForceStopCrawler()) {
        return;
    }
    if (titleModel.type.includes('serial')) {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.handlingSeasonFields);
        let seasonEpisodeFieldsUpdate = await updateSeasonsField(titleModel, sourceName, site_links, siteWatchOnlineLinks, titleModel.totalSeasons, omdbApiFields, tvmazeApiFields, false);
        titleModel = {...titleModel, ...seasonEpisodeFieldsUpdate};
    }

    if (checkForceStopCrawler()) {
        return;
    }
    if (titleModel.type.includes('anime')) {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.callingJikan);
        let jikanApiData = await getJikanApiData(titleModel.title, titleModel.year, titleModel.type, titleModel.jikanID);
        if (jikanApiData) {
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                if (jikanApiFields.youtubeTrailer && extraConfigs?.trailerUploadState !== 'ignore' && checkNeedTrailerUpload(titleModel.trailer_s3, titleModel.trailers)) {
                    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.uploadingYoutubeTrailerToS3);
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
            }
        }
    }


    if (checkForceStopCrawler()) {
        return;
    }
    if (kitsuApiData !== null) {
        kitsuApiFields = getKitsuApiFields(kitsuApiData);
        if (kitsuApiFields) {
            if (kitsuApiFields.youtubeTrailer && extraConfigs?.trailerUploadState !== 'ignore' && checkNeedTrailerUpload(titleModel.trailer_s3, titleModel.trailers)) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.uploadingYoutubeTrailerToS3);
                let trailerUploadFields = await uploadTitleYoutubeTrailerAndAddToTitleModel(titleModel, kitsuApiFields.youtubeTrailer, {});
                titleModel = {...titleModel, ...trailerUploadFields};
            }

            titleModel.kitsuID = kitsuApiFields.kitsuID;
            if (titleModel.status === 'unknown' || !titleModel.type.includes('anime')) {
                titleModel.status = kitsuApiFields.status;
                titleModel.endYear = kitsuApiFields.endYear;
            }
            if (kitsuApiFields.rated && (!titleModel.rated || titleModel.rated === 'Not Rated')) {
                titleModel.rated = kitsuApiFields.rated;
            }
            if (kitsuApiFields.duration && kitsuApiFields.duration !== '0 min' && (!titleModel.duration || titleModel.duration === '0 min')) {
                titleModel.duration = kitsuApiFields.duration;
            }

            const checkKeys = ['year', 'premiered', 'totalDuration', 'animeType'];
            for (let i = 0; i < checkKeys.length; i++) {
                if (kitsuApiFields[checkKeys[i]] && !titleModel[checkKeys[i]]) {
                    titleModel[checkKeys[i]] = kitsuApiFields[checkKeys[i]];
                }
            }

            updateSpecificFields(titleModel, titleModel, kitsuApiFields, 'kitsu');

            if (kitsuApiFields.kitsuPoster && titleModel.poster_s3 === null) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.uploadingKitsuPosterToS3);
                let s3poster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, kitsuApiFields.kitsuPoster);
                if (s3poster) {
                    titleModel.poster_s3 = s3poster;
                    titleModel.posters.push({
                        url: s3poster.url,
                        info: 's3Poster',
                        size: s3poster.size,
                        vpnStatus: s3poster.vpnStatus,
                        thumbnail: s3poster.thumbnail,
                    });
                    titleModel.posters = sortPosters(titleModel.posters);
                }
            }

            if (kitsuApiFields.kitsuPosterCover && titleModel.poster_wide_s3 === null) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.uploadingKitsuWidePosterToS3);
                let s3WidePoster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, kitsuApiFields.kitsuPosterCover, false, true);
                if (s3WidePoster) {
                    titleModel.poster_wide_s3 = s3WidePoster;
                }
            }
        }
    }

    return {
        titleModel,
        allApiData: {
            omdbApiFields, tvmazeApiFields,
            jikanApiFields, kitsuApiFields,
        }
    };
}

export async function apiDataUpdate(db_data, site_links, siteWatchOnlineLinks, siteType, sitePoster, sourceName, pageLink, extraConfigs) {
    let now = new Date();
    let apiUpdateDate = new Date(db_data.apiUpdateDate);
    if (extraConfigs?.apiUpdateState === 'ignore') {
        return null;
    }
    if (getDatesBetween(now, apiUpdateDate).hours < 8 && extraConfigs?.apiUpdateState !== 'force') {
        return null;
    }

    let updateFields = {
        apiUpdateDate: now,
    };

    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.checkingPoster);
    if (sitePoster && (db_data.poster_s3 === null || await checkBetterS3Poster(db_data.posters, sourceName, sitePoster, db_data.poster_s3))) {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.uploadingPosterToS3);
        let s3poster = await uploadTitlePosterToS3(db_data.title, db_data.type, db_data.year, sitePoster, true);
        if (s3poster) {
            db_data.poster_s3 = s3poster;
            updateFields.poster_s3 = s3poster;
        }
    }

    if (checkForceStopCrawler()) {
        return;
    }
    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.callingOmdbTvMazeKitsu);
    let {omdbApiData, tvmazeApiData, kitsuApiData} = await handleApiCalls(db_data, pageLink);
    let omdbApiFields = null, tvmazeApiFields = null, jikanApiFields = null, kitsuApiFields = null;

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

            if (tvmazeApiFields.backgroundPosters.length > 0) {
                let imageUrl = tvmazeApiFields.backgroundPosters[1]?.resolutions?.original?.url ||
                    tvmazeApiFields.backgroundPosters[0].resolutions.original?.url ||
                    tvmazeApiFields.backgroundPosters[1]?.resolutions?.medium?.url ||
                    tvmazeApiFields.backgroundPosters[0].resolutions.medium?.url;
                if (imageUrl && (db_data.poster_wide_s3 === null || (db_data.poster_wide_s3.originalUrl && db_data.poster_wide_s3.originalUrl !== imageUrl))) {
                    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.uploadingTvmazeWidePosterToS3);
                    let s3WidePoster = await uploadTitlePosterToS3(db_data.title, db_data.type, db_data.year, imageUrl, true, true);
                    if (s3WidePoster) {
                        db_data.poster_wide_s3 = s3WidePoster;
                        updateFields.poster_wide_s3 = s3WidePoster;
                    }
                }
            }
        }
    }

    if (!db_data.type.includes('anime') && (omdbApiFields?.isAnime || tvmazeApiFields?.isAnime)) {
        db_data.type = 'anime_' + db_data.type;
        updateFields.type = db_data.type;
    }

    if (checkForceStopCrawler()) {
        return;
    }
    if (db_data.type.includes('serial')) {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.handlingSeasonFields);
        let seasonEpisodeFieldsUpdate = await updateSeasonsField(db_data, sourceName, site_links, siteWatchOnlineLinks, updateFields.totalSeasons, omdbApiFields, tvmazeApiFields, true);
        updateFields = {...updateFields, ...seasonEpisodeFieldsUpdate};
    }

    if (checkForceStopCrawler()) {
        return;
    }
    if (db_data.type.includes('anime') || siteType.includes('anime')) {
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.callingJikan);
        let jikanApiData = await getJikanApiData(db_data.title, db_data.year, db_data.type, db_data.jikanID);
        if (jikanApiData) {
            let temp = handleTypeAndTitleUpdate(db_data, jikanApiData.titleObj, siteType);
            db_data = {...db_data, ...temp};
            updateFields = {...updateFields, ...temp};
            jikanApiFields = getJikanApiFields(jikanApiData);
            if (jikanApiFields) {
                if (jikanApiFields.youtubeTrailer && extraConfigs?.trailerUploadState !== 'ignore' && checkNeedTrailerUpload(db_data.trailer_s3, db_data.trailers)) {
                    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.uploadingYoutubeTrailerToS3);
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
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.addingRelatedTitles);
                await handleAnimeRelatedTitles(db_data._id, jikanApiFields.jikanRelatedTitles);
            }
        }
    }

    if (checkForceStopCrawler()) {
        return;
    }
    if (kitsuApiData !== null) {
        kitsuApiFields = getKitsuApiFields(kitsuApiData);
        if (kitsuApiFields) {
            if (kitsuApiFields.youtubeTrailer && extraConfigs?.trailerUploadState !== 'ignore' && checkNeedTrailerUpload(db_data.trailer_s3, db_data.trailers)) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.uploadingYoutubeTrailerToS3);
                let trailerUploadFields = await uploadTitleYoutubeTrailerAndAddToTitleModel(db_data, kitsuApiFields.youtubeTrailer, {});
                db_data = {...db_data, ...trailerUploadFields};
                updateFields = {...updateFields, ...trailerUploadFields};
            }

            if (db_data.status === 'unknown' || !db_data.type.includes('anime')) {
                db_data.status = kitsuApiFields.status;
                updateFields.status = kitsuApiFields.status;
                db_data.endYear = kitsuApiFields.endYear;
                updateFields.endYear = kitsuApiFields.endYear;
            }
            if (kitsuApiFields.rated && (!db_data.rated || db_data.rated === 'Not Rated')) {
                db_data.rated = kitsuApiFields.rated;
                updateFields.rated = kitsuApiFields.rated;
            }
            if (kitsuApiFields.duration && kitsuApiFields.duration !== '0 min' && (!db_data.duration || db_data.duration === '0 min')) {
                db_data.duration = kitsuApiFields.duration;
                updateFields.duration = kitsuApiFields.duration;
            }

            const checkKeys = ['year', 'premiered', 'totalDuration', 'animeType'];
            for (let i = 0; i < checkKeys.length; i++) {
                if (kitsuApiFields[checkKeys[i]] && !db_data[checkKeys[i]]) {
                    db_data[checkKeys[i]] = kitsuApiFields[checkKeys[i]];
                    updateFields[checkKeys[i]] = kitsuApiFields[checkKeys[i]];
                }
            }

            updateSpecificFields(db_data, updateFields, kitsuApiFields, 'kitsu');

            if (kitsuApiFields.kitsuPoster && (
                (db_data.poster_s3 === null) ||
                (db_data.type.includes('anime') && await checkBetterS3Poster(db_data.posters, sourceName, sitePoster, db_data.poster_s3))
            )) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.uploadingKitsuPosterToS3);
                let s3poster = await uploadTitlePosterToS3(db_data.title, db_data.type, db_data.year, kitsuApiFields.kitsuPoster);
                if (s3poster) {
                    db_data.poster_s3 = s3poster;
                    updateFields.poster_s3 = s3poster;
                    db_data.posters.push({
                        url: s3poster.url,
                        info: 's3Poster',
                        size: s3poster.size,
                        vpnStatus: s3poster.vpnStatus,
                        thumbnail: s3poster.thumbnail,
                    });
                    db_data.posters = sortPosters(db_data.posters);
                    updateFields.posters = db_data.posters;
                }
            }

            if (kitsuApiFields.kitsuPosterCover && db_data.poster_wide_s3 === null) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.uploadingKitsuWidePosterToS3);
                let s3WidePoster = await uploadTitlePosterToS3(db_data.title, db_data.type, db_data.year, kitsuApiFields.kitsuPosterCover, false, true);
                if (s3WidePoster) {
                    db_data.poster_wide_s3 = s3WidePoster;
                    updateFields.poster_wide_s3 = s3WidePoster;
                }
            }
        }
    }

    return {
        updateFields,
        allApiData: {
            omdbApiFields, tvmazeApiFields,
            jikanApiFields, kitsuApiFields,
        }
    };
}

async function checkBetterS3Poster(prevPosters, sourceName, newPosterUrl, prevS3Poster, retryCounter = 0) {
    try {
        if (!newPosterUrl) {
            return false;
        }
        //replace low quality poster of myAnimeList
        if (prevS3Poster.originalUrl.includes('cdn.myanimelist.net')) {
            return true;
        }
        let prevS3SourceName = prevS3Poster.originalUrl
            .replace(/https:|http:|\/\/|www\./g, '')
            .split('.')[0]
            .replace(/\d+/g, '');
        let newSourceName = newPosterUrl
            .replace(/https:|http:|\/\/|www\./g, '')
            .split('.')[0]
            .replace(/\d+/g, '');
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
            newPosterSize = await getFileSize(newPosterUrl);
        }
        if (newPosterSize > 0) {
            let diff = ((newPosterSize - prevS3Poster.size) / prevS3Poster.size) * 100;
            if (diff > 25 && newPosterSize < 700 * 1024) { //700kb
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
        saveErrorIfNeeded(error);
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

async function handleApiCalls(titleData, pageLink) {
    let omdbApiData, tvmazeApiData, kitsuApiData;
    if (titleData.type.includes('serial')) {
        let results = await Promise.allSettled([
            handle_OMDB_TvMaze_ApiCall(titleData, 'omdb', pageLink),
            handle_OMDB_TvMaze_ApiCall(titleData, 'tvmaze', pageLink),
            handle_OMDB_TvMaze_ApiCall(titleData, 'kitsu', pageLink),
        ]);
        omdbApiData = results[0].value;
        tvmazeApiData = results[1].value;
        kitsuApiData = results[2].value;
    } else {
        let results = await Promise.allSettled([
            handle_OMDB_TvMaze_ApiCall(titleData, 'omdb', pageLink),
            handle_OMDB_TvMaze_ApiCall(titleData, 'kitsu', pageLink),
        ]);
        omdbApiData = results[0].value;
        kitsuApiData = results[1].value;
        tvmazeApiData = null;
    }
    return {omdbApiData, tvmazeApiData, kitsuApiData};
}

async function handle_OMDB_TvMaze_ApiCall(titleData, apiName, pageLink) {
    let searchTitle = (apiName === 'omdb') ? titleData.rawTitle || titleData.title : titleData.title;
    let result;
    if (apiName === 'omdb') {
        result = await getOMDBApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.premiered, titleData.type);
    } else if (apiName === 'tvmaze') {
        result = await getTvMazeApiData(searchTitle, titleData.alternateTitles, titleData.titleSynonyms, titleData.imdbID, titleData.premiered, titleData.type);
    } else if (apiName === 'kitsu') {
        result = await getKitsuApiData(searchTitle, titleData.year, titleData.type, titleData.kitsuID);
    }

    if (result || apiName === 'kitsu') {
        partialChangePageLinkStateFromCrawlerStatus(pageLink, apiName, apiName + ':done');
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
                partialChangePageLinkStateFromCrawlerStatus(pageLink, apiName, apiName + ':done');
                return result;
            }
        }
    }
    partialChangePageLinkStateFromCrawlerStatus(pageLink, apiName, apiName + ':done');
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
    let isAnime = (apiName === 'jikan' || apiName === 'kitsu' || ((apiName === 'tvmaze' || apiName === 'omdb') && apiFields.isAnime));
    let isAnimation = (apiName === 'tvmaze' && apiFields.isAnimation);
    let newGenres = getNewGenres(oldData, apiFields.genres || [], isAnime, isAnimation);
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
