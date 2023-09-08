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
import {getDatesBetween} from "./utils/utils.js";
import {getFileSize} from "./utils/axiosUtils.js";
import {
    changePageLinkStateFromCrawlerStatus,
    linkStateMessages,
    removePageLinkToCrawlerStatus
} from "./status/crawlerStatus.js";
import {checkNeedForceStopCrawler, pauseCrawler} from "./status/crawlerController.js";
import {saveError} from "../error/saveError.js";
import PQueue from "p-queue";
import {getLinksDoesntMatchLinkRegex} from "./extractors/downloadLinks.js";
import {saveCrawlerBadLink, saveCrawlerWarning} from "../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "./status/crawlerWarnings.js";
import {handleLatestDataUpdate} from "./latestData.js";
import {checkCrawledDataForChanges} from "./status/crawlerChange.js";


export default async function save(title, type, year, sourceData, pageNumber) {
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

        let badLinks = [];
        if (pageNumber === 1) {
            badLinks = getLinksDoesntMatchLinkRegex(downloadLinks, type);
            if (badLinks.length > 0) {
                await saveCrawlerBadLink(sourceConfig.sourceName, pageLink, badLinks.slice(0, 10));
                const warningMessages = getCrawlerWarningMessages(sourceConfig.sourceName);
                await saveCrawlerWarning(warningMessages.crawlerBadLink);
            }
        }

        checkCrawledDataForChanges(sourceConfig.sourceName, pageLink, downloadLinks, badLinks, poster, persianSummary);

        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.paused);
        await pauseCrawler();
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.addFileSize);
        await addFileSizeToDownloadLinks(type, downloadLinks, sourceConfig.sourceName, sourceConfig.vpnStatus);

        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.checkingDB);
        if (checkNeedForceStopCrawler()) {
            removePageLinkToCrawlerStatus(pageLink);
            return;
        }

        let {titleObj, db_data} = await getTitleObjAndDbData(title, year, type, downloadLinks);

        let titleModel = getMovieModel(titleObj, pageLink, type, downloadLinks, sourceConfig.sourceName, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles, sourceConfig.vpnStatus);

        if (db_data === null) {//new title
            if (downloadLinks.length > 0) {
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.paused);
                await pauseCrawler();
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.newTitle);
                if (checkNeedForceStopCrawler()) {
                    removePageLinkToCrawlerStatus(pageLink);
                    return;
                }
                let result = await addApiData(titleModel, downloadLinks, watchOnlineLinks, sourceConfig.sourceName, pageLink);
                if (result.titleModel.type.includes('movie')) {
                    result.titleModel.qualities = groupMovieLinks(downloadLinks, watchOnlineLinks);
                }
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.inserting);
                let insertedId = await insertToDB('movies', result.titleModel);
                if (insertedId) {
                    if (type.includes('anime')) {
                        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.connectingRelatedTitles);
                        await connectNewAnimeToRelatedTitles(titleModel, insertedId);
                    }
                    changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.newTitle.addingCast);
                    await addStaffAndCharacters(insertedId, result.allApiData, titleModel.castUpdateDate);
                    await updateByIdDB('movies', insertedId, {
                        castUpdateDate: new Date(),
                    });
                }
            }
            removePageLinkToCrawlerStatus(pageLink);
            return;
        }

        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.paused);
        await pauseCrawler();
        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.updateTitle);
        if (checkNeedForceStopCrawler()) {
            removePageLinkToCrawlerStatus(pageLink);
            return;
        }
        let apiData = await apiDataUpdate(db_data, downloadLinks, watchOnlineLinks, type, poster, sourceConfig.sourceName, pageLink);
        let subUpdates = await handleSubUpdates(db_data, poster, trailers, sourceConfig.sourceName, sourceConfig.vpnStatus);
        await handleDbUpdate(db_data, persianSummary, subUpdates, sourceConfig.sourceName, downloadLinks, watchOnlineLinks, titleModel.subtitles, type, apiData, pageLink);
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

async function handleDbUpdate(db_data, persianSummary, subUpdates, sourceName, downloadLinks, watchOnlineLinks, subtitles, type, apiData, pageLink) {
    try {
        let updateFields = apiData ? apiData.updateFields : {};

        if (db_data.releaseState !== 'done' && downloadLinks.length > 0) {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.convertingToRelease);
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

        if (!db_data.sources.find(s => s.sourceName === sourceName) && (downloadLinks.length > 0 || watchOnlineLinks.length > 0)) {
            db_data.sources.push({sourceName: sourceName, pageLink: pageLink});
            updateFields.sources = db_data.sources;
        } else {
            const source = db_data.sources.find(s => s.sourceName === sourceName);
            if (source) {
                if (downloadLinks.length === 0 && watchOnlineLinks.length === 0) {
                    db_data.sources = db_data.sources.filter(item => item.sourceName !== sourceName);
                    updateFields.sources = db_data.sources;
                } else if (source.pageLink !== pageLink) {
                    source.pageLink = pageLink;
                    updateFields.sources = db_data.sources;
                }
            }
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
            if (subUpdates.newTrailer) {
                updateFields.trailerDate = Date.now();
            }
        }

        //handle latestData updates
        let {latestDataChanged, latestDataUpdate, PrimaryLatestDataUpdate} = handleLatestDataUpdate(db_data, type);
        if (latestDataChanged) {
            updateFields.latestData = db_data.latestData;
            if (updateFields.totalDuration) {
                updateFields.totalDuration = getTotalDuration(db_data.seasons, db_data.latestData, db_data.type);
            }
        }
        if (latestDataUpdate && PrimaryLatestDataUpdate && getDatesBetween(new Date(), db_data.insert_date).hours > 1) {
            updateFields.update_date = new Date();
        }

        let {_handleCastUpdate} = await import("./crawler.js");
        if (apiData && _handleCastUpdate) {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.addingCast);
            await addStaffAndCharacters(db_data._id, apiData.allApiData, db_data.castUpdateDate);
            updateFields.castUpdateDate = new Date();
        }

        if (db_data.trailer_s3 && db_data.trailers) {
            if (!checkNeedTrailerUpload(null, db_data.trailers)) {
                //remove trailer from s3
                changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.removingS3Trailer);
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
                        changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.removingS3Trailer);
                        await removeS3Trailer(db_data, updateFields);
                    }
                }
            }
        }


        if (Object.keys(updateFields).length > 0) {
            changePageLinkStateFromCrawlerStatus(pageLink, linkStateMessages.updateTitle.updating);
            await updateByIdDB('movies', db_data._id, updateFields);
        }

    } catch (error) {
        saveError(error);
    }
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

async function addFileSizeToDownloadLinks(type, downloadLinks, sourceName, sourceVpnStatus) {
    if (sourceVpnStatus.downloadLink === 'noVpn') {
        return;
    }
    const promiseQueue = new PQueue({concurrency: 15});
    if (type.includes('movie')) {
        for (let j = 0, _length = downloadLinks.length; j < _length; j++) {
            if (!downloadLinks[j].info.includes(' - ')) {
                let url = downloadLinks[j].link;
                if (sourceName === "film2movie") {
                    let temp = url.match(/\/\?s=\d+&f=/gi);
                    if (temp) {
                        const match = temp.pop();
                        const number = Number(match.match(/\d+/g).pop());
                        url = url.replace(/(?<=dl)\d+(?=\.)/, number).replace(match, '');
                    }
                }

                promiseQueue.add(() => getFileSize(url).then(size => {
                    if (size > 0) {
                        size = Math.ceil(size / 1024 / 1024);
                        size = size < 1000 ? `${size}MB` : `${(size / 1024).toFixed(1)}GB`;
                        downloadLinks[j].info = downloadLinks[j].info + ' - ' + size;
                    }
                }));
            }
        }
    } else {
        let gps = [];
        let groupedDownloadLinks = downloadLinks.reduce((groups, item) => {
            let g = item.info.split(' - ')[0] + '/' + item.season;
            if (!groups[g]) {
                groups[g] = [item];
                gps.push(g);
            } else {
                groups[g].push(item);
            }
            return groups;
        }, {});

        for (let j = 0; j < gps.length; j++) {
            if (groupedDownloadLinks[gps[j]].every(l => !l.info.includes(' - '))) {
                let url = groupedDownloadLinks[gps[j]][0].link;
                if (sourceName === "film2movie") {
                    let temp = url.match(/\/\?s=\d+&f=/gi);
                    if (temp) {
                        const match = temp.pop();
                        const number = Number(match.match(/\d+/g).pop());
                        url = url.replace(/(?<=dl)\d+(?=\.)/, number).replace(match, '');
                    }
                }

                promiseQueue.add(() => getFileSize(url).then(size => {
                    if (size > 0) {
                        let g = gps[j];
                        size = Math.ceil(size / 1024 / 1024);
                        size = size < 1000 ? `${Math.round((size - 50) / 100) * 100 + 50}MB` : `${(size / 1024).toFixed(1)}GB`;
                        for (let k = 0; k < groupedDownloadLinks[g].length; k++) {
                            groupedDownloadLinks[g][k].info = groupedDownloadLinks[g][k].info + ' - ' + size;
                        }
                    }
                }));
            }
        }
    }
    await promiseQueue.onIdle();
    return downloadLinks;
}