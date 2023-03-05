import {searchTitleDB, insertToDB, updateByIdDB} from "../data/db/crawlerMethodsDB.js";
import {deleteTrailerFromS3} from "../data/cloudStorage.js";
import {addApiData, apiDataUpdate} from "./3rdPartyApi/allApiData.js";
import {addStaffAndCharacters} from "./3rdPartyApi/staffAndCharacters/personCharacter.js";
import {handleSiteSeasonEpisodeUpdate, getTotalDuration, getSeasonEpisode} from "./seasonEpisode.js";
import {handleSubUpdates} from "./subUpdates.js";
import {getMovieModel} from "../models/movie.js";
import {getJikanApiData, connectNewAnimeToRelatedTitles} from "./3rdPartyApi/jikanApi.js";
import {groupMovieLinks, updateMoviesGroupedLinks} from "./link.js";
import {handleSubtitlesUpdate} from "./subtitle.js";
import {checkNeedTrailerUpload} from "./posterAndTrailer.js";
import {getDatesBetween} from "./utils.js";
import {saveError} from "../error/saveError.js";
import {addPageLinkToCrawlerStatus, removePageLinkToCrawlerStatus} from "./crawlerStatus.js";


export default async function save(title, type, year, sourceData) {
    try {
        let {
            sourceConfig,
            pageLink,
            downloadLinks,
            watchOnlineLinks,
            persianSummary,
            poster, trailers,
            subtitles,
            cookies
        } = sourceData;
        addPageLinkToCrawlerStatus(pageLink);
        let {titleObj, db_data} = await getTitleObjAndDbData(title, year, type, downloadLinks);

        let titleModel = getMovieModel(titleObj, pageLink, type, downloadLinks, sourceConfig.sourceName, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles, sourceConfig.vpnStatus);

        if (db_data === null) {//new title
            if (downloadLinks.length > 0) {
                let result = await addApiData(titleModel, downloadLinks, watchOnlineLinks, sourceConfig.sourceName);
                if (result.titleModel.type.includes('movie')) {
                    result.titleModel.qualities = groupMovieLinks(downloadLinks, watchOnlineLinks);
                }
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
            removePageLinkToCrawlerStatus(pageLink);
            return;
        }

        let apiData = await apiDataUpdate(db_data, downloadLinks, watchOnlineLinks, type, poster, sourceConfig.sourceName);
        let subUpdates = await handleSubUpdates(db_data, poster, trailers, titleModel, type, sourceConfig.sourceName, sourceConfig.vpnStatus);
        await handleDbUpdate(db_data, persianSummary, subUpdates, sourceConfig.sourceName, downloadLinks, watchOnlineLinks, titleModel.subtitles, type, apiData);
        removePageLinkToCrawlerStatus(pageLink);
    } catch (error) {
        await saveError(error);
        removePageLinkToCrawlerStatus(sourceData.pageLink);
    }
}

async function getTitleObjAndDbData(title, year, type, siteDownloadLinks) {
    title = fixTitle(title);
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

function fixTitle(title) {
    if (title === 'go toubun no hanayome' || title === 'gotoubun no hanayome') {
        title = '5 toubun no hanayome';
    }
    return title;
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
        insert_date: 1,
        update_date: 1,
        castUpdateDate: 1,
        status: 1,
        imdbID: 1,
        tvmazeID: 1,
        jikanID: 1,
        qualities: 1,
        seasons: 1,
        sources: 1,
        summary: 1,
        posters: 1,
        poster_s3: 1,
        trailer_s3: 1,
        trailers: 1,
        subtitles: 1,
        genres: 1,
        rating: 1,
        duration: 1,
        totalDuration: 1,
        totalSeasons: 1,
        latestData: 1,
        nextEpisode: 1,
        releaseDay: 1,
    };

    let searchTypes = [type];
    if (type.includes('anime')) {
        searchTypes.push(type.replace('anime_', ''));
    } else {
        searchTypes.push(('anime_' + type));
    }

    let reSearch = false;
    let searchResults = await searchTitleDB(titleObj, searchTypes, year, dataConfig);
    if (searchResults.length === 0 && (searchTypes[0].includes('serial') || searchTypes[0].includes('anime')) && year) {
        reSearch = true;
        searchResults = await searchTitleDB(titleObj, searchTypes, '', dataConfig);
    }

    A: for (let i = 0; i < searchTypes.length; i++) {
        if (reSearch) {
            for (let k = 0; k < 2; k++) {
                for (let j = 0; j < searchResults.length; j++) {
                    let compareYear = Math.abs(Number(searchResults[j].year) - Number(year));
                    if (compareYear <= k && searchTypes[i] === searchResults[j].type) {
                        db_data = searchResults[j];
                        break A;
                    }
                }
            }
        } else {
            for (let j = 0; j < searchResults.length; j++) {
                if (searchTypes[i] === searchResults[j].type) {
                    db_data = searchResults[j];
                    break A;
                }
            }
        }
    }

    return db_data;
}

async function handleDbUpdate(db_data, persianSummary, subUpdates, sourceName, downloadLinks, watchOnlineLinks, subtitles, type, apiData) {
    try {
        let updateFields = apiData ? apiData.updateFields : {};

        if (db_data.releaseState !== 'done' && downloadLinks.length > 0) {
            await convertUnReleasedTitleToNewTitle(db_data, updateFields, type);
        }

        if (type.includes('serial') && !apiData) {
            let seasonsUpdateFlag = handleSiteSeasonEpisodeUpdate(db_data, sourceName, downloadLinks, watchOnlineLinks);
            if (seasonsUpdateFlag) {
                updateFields.seasons = db_data.seasons;
                updateFields.totalDuration = getTotalDuration(db_data.seasons, db_data.latestData, db_data.type);
                updateFields.seasonEpisode = getSeasonEpisode(db_data.seasons);
            }
        }

        if (db_data.type.includes('movie')) {
            let prevGroupedLinks = db_data.qualities;
            let currentGroupedLinks = groupMovieLinks(downloadLinks, watchOnlineLinks);
            if (updateMoviesGroupedLinks(prevGroupedLinks, currentGroupedLinks, sourceName)) {
                updateFields.qualities = db_data.qualities;
            }
        }

        let subtitleUpdateFlag = handleSubtitlesUpdate(db_data.subtitles, subtitles, sourceName);
        if (subtitleUpdateFlag) {
            updateFields.subtitles = db_data.subtitles;
        }

        if (!db_data.sources.includes(sourceName) && (downloadLinks.length > 0 || watchOnlineLinks.length > 0)) {
            db_data.sources.push(sourceName);
            updateFields.sources = db_data.sources;
        } else if (db_data.sources.includes(sourceName) && (downloadLinks.length === 0 && watchOnlineLinks.length === 0)) {
            db_data.sources = db_data.sources.filter(item => item !== sourceName);
            updateFields.sources = db_data.sources;
        }

        if (db_data.summary.persian.length < persianSummary.length) {
            let currentSummary = updateFields.summary;
            if (currentSummary === undefined) {
                currentSummary = db_data.summary;
            }
            currentSummary.persian = persianSummary;
            currentSummary.persian_source = sourceName;
            updateFields.summary = currentSummary;
        }

        if (subUpdates.posterChange) {
            updateFields.posters = db_data.posters;
            updateFields.poster_s3 = db_data.poster_s3;
        }
        if (subUpdates.trailerChange || updateFields.trailer_s3) {
            updateFields.trailers = db_data.trailers;
        }

        if (subUpdates.latestDataChange) {
            updateFields.latestData = db_data.latestData;
            if (subUpdates.PrimaryLatestDataChange && getDatesBetween(new Date(), db_data.insert_date).hours > 1) {
                updateFields.update_date = new Date();
            }
        }

        let {_handleCastUpdate} = await import("./crawler.js");
        if (apiData && _handleCastUpdate) {
            let castAndCharacters = await getCastAndCharactersFromApi(db_data._id, db_data, apiData.allApiData);
            if (castAndCharacters) {
                updateFields = {...updateFields, ...castAndCharacters};
            }
        }

        if (db_data.trailer_s3 && db_data.trailers) {
            if (!checkNeedTrailerUpload(null, db_data.trailers)) {
                //remove trailer from s3
                await removeS3Trailer(db_data, updateFields);
            } else if (db_data.releaseState === 'done' && db_data.insert_date && getDatesBetween(new Date(), db_data.insert_date).days > 90) {
                let dLinksLength = db_data.type.includes('movie') ?
                    db_data.qualities.map(item => item.links).flat(1).length
                    : db_data.seasons.map(s => s.episodes.map(e => e.links).flat(1)).flat(1);
                if (dLinksLength === 0) {
                    let onlineLinksLength = db_data.type.includes('movie') ?
                        db_data.qualities.map(item => item.watchOnlineLinks).flat(1).length
                        : db_data.seasons.map(s => s.episodes.map(e => e.watchOnlineLinks).flat(1)).flat(1);
                    if (onlineLinksLength === 0) {
                        await removeS3Trailer(db_data, updateFields);
                    }
                }
            }
        }


        if (Object.keys(updateFields).length > 0) {
            await updateByIdDB('movies', db_data._id, updateFields);
        }

    } catch (error) {
        saveError(error);
    }
}

async function getCastAndCharactersFromApi(insertedId, titleData, allApiData) {
    let posterData = titleData.poster_s3 || titleData.posters[0];
    let posterUrl = posterData ? posterData.url : '';
    let posterThumbnail = posterData ? posterData.thumbnail : '';
    let temp = await addStaffAndCharacters(insertedId, titleData.rawTitle, titleData.type, posterUrl, posterThumbnail, allApiData, titleData.castUpdateDate);
    if (temp) {
        return {
            ...temp,
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
    if (db_data.type.includes('anime') || type.includes('anime')) {
        await connectNewAnimeToRelatedTitles(db_data, db_data._id);
    }
}

async function removeS3Trailer(db_data, updateFields) {
    let fileName = db_data.trailer_s3.url.split('/').pop();
    let removeS3Trailer = await deleteTrailerFromS3(fileName);
    if (removeS3Trailer) {
        db_data.trailers = db_data.trailers.filter(item => !item.info.includes('s3Trailer') && item.url !== db_data.trailer_s3.url);
        if (db_data.trailers && db_data.trailers.length === 0) {
            db_data.trailers = null;
        }
        updateFields.trailers = db_data.trailers;
        db_data.trailer_s3 = null;
        updateFields.trailer_s3 = null;
    }
}
