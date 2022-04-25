import {searchTitleDB, insertToDB, updateByIdDB} from "../data/dbMethods";
import {deleteTrailerFromS3} from "../data/cloudStorage";
import {addApiData, apiDataUpdate} from "./3rdPartyApi/allApiData";
import {addStaffAndCharacters} from "./3rdPartyApi/personCharacter";
import {handleSiteSeasonEpisodeUpdate, getTotalDuration} from "./seasonEpisode";
import {handleSubUpdates} from "./subUpdates";
import {getUploadedAnimeListSubtitles, handleSubtitleUpdate} from "./subtitle";
import {getMovieModel} from "../models/movie";
import {getJikanApiData, connectNewAnimeToRelatedTitles} from "./3rdPartyApi/jikanApi";
import {groupMovieLinks, updateMoviesGroupedLinks} from "./link";
import {saveError} from "../error/saveError";


export default async function save(title, type, year, sourceData) {
    try {
        let {
            sourceName,
            pageLink,
            downloadLinks,
            watchOnlineLinks,
            persianSummary,
            poster, trailers,
            subtitles,
            cookies
        } = sourceData;
        let {titleObj, db_data} = await getTitleObjAndDbData(title, year, type, downloadLinks);

        let titleModel = getMovieModel(titleObj, pageLink, type, downloadLinks, sourceName, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles);
        let uploadedSubtitles = sourceName === "animelist" ? await getUploadedAnimeListSubtitles(subtitles, cookies) : [];

        if (db_data === null) {//new title
            if (downloadLinks.length > 0) {
                titleModel.subtitles = uploadedSubtitles;
                let result = await addApiData(titleModel, downloadLinks, sourceName);
                if (result.titleModel.type.includes('movie')) {
                    result.titleModel.qualities = groupMovieLinks(downloadLinks);
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
            return;
        }

        let apiData = await apiDataUpdate(db_data, downloadLinks, type, poster, sourceName);
        let subUpdates = await handleSubUpdates(db_data, poster, trailers, watchOnlineLinks, titleModel, type, sourceName);
        await handleDbUpdate(db_data, persianSummary, subUpdates, sourceName, downloadLinks, uploadedSubtitles, type, apiData);
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
        qualities: 1,
        seasons: 1,
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
        latestData: 1,
        nextEpisode: 1,
        likesCount: 1,
        dislikesCount: 1,
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
    if (searchResults.length === 0 && searchTypes[0].includes('serial') && year) {
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

async function handleDbUpdate(db_data, persianSummary, subUpdates, sourceName, downloadLinks, uploadedSubtitles, type, apiData) {
    try {
        let updateFields = apiData ? apiData.updateFields : {};

        if (db_data.releaseState !== 'done' && downloadLinks.length > 0) {
            await convertUnReleasedTitleToNewTitle(db_data, updateFields, type);
        }

        if (type.includes('serial') && !apiData) {
            let seasonsUpdateFlag = handleSiteSeasonEpisodeUpdate(db_data, sourceName, downloadLinks, true);
            if (seasonsUpdateFlag) {
                updateFields.seasons = db_data.seasons;
                updateFields.totalDuration = getTotalDuration(db_data.seasons, db_data.latestData, db_data.type);
            }
        }

        if (db_data.type.includes('movie')) {
            let prevGroupedLinks = db_data.qualities;
            let currentGroupedLinks = groupMovieLinks(downloadLinks);
            if (updateMoviesGroupedLinks(prevGroupedLinks, currentGroupedLinks, sourceName)) {
                updateFields.qualities = db_data.qualities;
            }
        }

        if (updateFields.qualities || updateFields.seasons) {
            let linksField = db_data.type.includes('movie') ? db_data.qualities : db_data.seasons;
            const linksCount = linksField.map(item => item.links).flat(1).length;
            if (linksCount === 0 && db_data.releaseState === 'done') {
                if (db_data.trailer_s3) {
                    let fileName = db_data.trailer_s3.url.split('/').pop();
                    let trailerRemoved = await deleteTrailerFromS3(fileName);
                    if (trailerRemoved) {
                        if (db_data.trailers) {
                            db_data.trailers = db_data.trailers.filter(item => item.url !== db_data.trailer_s3.url);
                        }
                        if (db_data.trailers && db_data.trailers.length === 0) {
                            db_data.trailers = null;
                        }
                        updateFields.trailers = db_data.trailers;
                        db_data.trailer_s3 = '';
                        updateFields.trailer_s3 = '';
                    }
                }
            }
        }

        if (db_data.summary.persian.length < persianSummary.replace(/([.…])+$/, '').length) {
            let currentSummary = updateFields.summary;
            if (currentSummary === undefined) {
                currentSummary = db_data.summary;
            }
            currentSummary.persian = persianSummary.replace(/([.…])+$/, '');
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

        let {_handleCastUpdate} = await import("./crawler");
        if (apiData && _handleCastUpdate) {
            let castAndCharacters = await getCastAndCharactersFromApi(db_data._id, db_data, apiData.allApiData);
            if (castAndCharacters) {
                updateFields = {...updateFields, ...castAndCharacters};
            }
        }

        // if (db_data.trailer_s3 && db_data.trailers && db_data.trailers.length > 1) {
        //     //remove trailer from s3
        //     let fileName = db_data.trailer_s3.split('/').pop();
        //     let removeS3Trailer = await deleteTrailerFromS3(fileName);
        //     if (removeS3Trailer) {
        //         db_data.trailer_s3 = '';
        //         updateFields.trailer_s3 = '';
        //         db_data.trailers = db_data.trailers.filter(item => !item.info.includes('s3Trailer'));
        //         updateFields.trailers = db_data.trailers;
        //     }
        // }

        if (Object.keys(updateFields).length > 0) {
            await updateByIdDB('movies', db_data._id, updateFields);
        }

    } catch (error) {
        saveError(error);
    }
}

async function getCastAndCharactersFromApi(insertedId, titleData, allApiData) {
    let poster = titleData.poster_s3
        ? titleData.poster_s3.url
        : titleData.posters.length > 0 ? titleData.posters[0].url : '';
    let temp = await addStaffAndCharacters(insertedId, titleData.rawTitle, poster, allApiData, titleData.castUpdateDate);
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
