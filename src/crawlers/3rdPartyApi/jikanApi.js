import axios from "axios";
import NodeCache from "node-cache";
import * as crawlerMethodsDB from "../../data/db/crawlerMethodsDB.js";
import * as cloudStorage from "../../data/cloudStorage.js";
import * as utils from "../utils.js";
import {addStaffAndCharacters} from "./personCharacter.js";
import {dataLevelConfig, getMovieModel} from "../../models/movie.js";
import {default as pQueue} from "p-queue";
import * as Sentry from "@sentry/node";
import {saveError} from "../../error/saveError.js";

let isRunning = false;
let callTime = 0;
let multiCounter = 0;

const jikanCache = new NodeCache({stdTTL: 6 * 60 * 60}); // 6 hour

export function flushJikanCachedData() {
    jikanCache.flushAll();
}

export async function getJikanApiData(title, year, type, jikanID) {
    try {
        // get jikan data directly with jikanID
        if (jikanID) {
            let animeUrl = `https://api.jikan.moe/v3/anime/${jikanID}`;
            let fullData = await handleApiCall(animeUrl);
            if (fullData) {
                let allTitles = getTitlesFromData(fullData);
                if (checkTitle(title, type, allTitles)) {
                    return getModifiedJikanApiData(allTitles, fullData);
                }
            }
        }

        let jikanSearchResult = await getJikanSearchResult(title, year);
        if (!jikanSearchResult) {
            return null;
        }

        if (
            type.includes('serial') &&
            jikanSearchResult.results.length > 1 &&
            jikanSearchResult.results[0].title.replace(/the|\(tv\)|\s+/gi, '') === jikanSearchResult.results[1].title.replace(/the|\(tv\)|\s+/gi, '') &&
            (jikanSearchResult.results[0].type.match(/ova|ona/gi) && Number(jikanSearchResult.results[0].episodes) < Number(jikanSearchResult.results[1].episodes))
        ) {
            jikanSearchResult.results.shift();
        }

        for (let i = 0; i < jikanSearchResult.results.length; i++) {
            if (
                (
                    type.includes('serial') &&
                    jikanSearchResult.results[i].start_date &&
                    jikanSearchResult.results[i].start_date.split('-')[0] !== year &&
                    Number(jikanSearchResult.results[i].episodes) === 0
                ) ||
                (type.includes('movie') && Number(jikanSearchResult.results[i].episodes) > 1)
            ) {
                continue;
            }

            let animeUrl = `https://api.jikan.moe/v3/anime/${jikanSearchResult.results[i].mal_id}`;
            let fullData = await handleApiCall(animeUrl);
            if (!fullData) {
                continue;
            }

            let allTitles = getTitlesFromData(fullData);

            if (checkTitle(title, type, allTitles)) {
                return getModifiedJikanApiData(allTitles, fullData);
            }
        }
        return null;
    } catch (error) {
        saveError(error);
        return null;
    }
}

async function getJikanSearchResult(title, year) {
    let searchTitle = (title.match(/^\d+$/g) || title.length < 3) ? (' ' + title) : title;
    searchTitle = (searchTitle.length < 3) ? (' ' + searchTitle) : searchTitle;
    let yearSearch = '';
    if (year) {
        let temp = Number(year);
        yearSearch = `&start_date=${temp - 1}-01-01&end_date=${temp + 1}-04-01`;
    }
    let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${searchTitle}&limit=10${yearSearch}`.trim();
    let data = await handleApiCall(animeSearchUrl);
    if (!data && title.length === 2) {
        let searchTitle = title.split('').join('\'');
        let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${searchTitle}&limit=10${yearSearch}`.trim();
        data = await handleApiCall(animeSearchUrl);
    }
    return data;
}

function checkTitle(title, type, allTitles) {
    let {
        apiTitle_simple,
        apiTitleEnglish_simple,
        apiTitleJapanese,
        titleSynonyms,
    } = allTitles;

    return (
        title.replace(/tv|the|precent|\s+/g, '').trim() === apiTitle_simple.replace(/the|tv|precent|\s+/g, '').trim() ||
        title === apiTitleEnglish_simple.replace(/the/gi, '').replace(/\s\s+/g, ' ') ||
        title === apiTitleJapanese ||
        titleSynonyms.includes(title)
    );
}

export function getJikanApiFields(data) {
    try {
        let apiFields = {
            jikanID: data.mal_id,
            jikanRelatedTitles: getRelatedTitles(data),
            summary_en: data.synopsis ? data.synopsis.replace('[Written by MAL Rewrite]', '').replace(/([.…])+$/, '').trim() : '',
            genres: data.genres.map(item => item.name.toLowerCase().trim().replace(/\s+/g, '-')).filter(item => item !== 'n/a') || [],
            status: data.status.toLowerCase().includes('finished') ? 'ended' : 'running',
            endYear: data.aired.to ? data.aired.to.split('T')[0] || '' : '',
            myAnimeListScore: Number(data.score) || 0,
            youtubeTrailer: data.trailer_url,
            updateFields: {
                jikanID: data.mal_id,
                rawTitle: data.titleObj.rawTitle,
                premiered: data.aired.from ? data.aired.from.split('T')[0] : '',
                animeType: data.animeType,
                year: data.aired.from ? data.aired.from.split(/[-–]/g)[0] : '',
                duration: (data.duration === "Unknown" || data.duration === "1 min per ep" || data.duration.match(/\d+ sec/g))
                    ? ''
                    : utils.convertHourToMinute(data.duration.replace('per ep', '').trim()).replace('23 min', '24 min'),
                releaseDay: (data.broadcast === null || data.broadcast === 'Unknown') ? '' : data.broadcast.split(' ')[0].replace(/s$/g, '').toLowerCase(),
                rated: data.rating === "None" ? '' : data.rating || '',
                animeSource: data.source,
            }
        };
        if (apiFields.duration === '0 min' && apiFields.animeType.toLowerCase() === 'tv') {
            apiFields.duration = '24 min';
        }
        if (!apiFields.releaseDay && apiFields.premiered && apiFields.animeType.toLowerCase() === 'tv') {
            let dayNumber = new Date(data.aired.from).getDay();
            apiFields.releaseDay = utils.getDayName(dayNumber);
        }
        if (!apiFields.genres.includes('anime')) {
            apiFields.genres.push('anime');
        }
        apiFields.updateFields = utils.purgeObjFalsyValues(apiFields.updateFields);
        return apiFields;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getCharactersStaff(jikanID) {
    if (jikanID) {
        let url = `https://api.jikan.moe/v3/anime/${jikanID}/characters_staff`;
        let data = await handleApiCall(url);
        if (data) {
            return {
                characters: data.characters,
                staff: data.staff,
            }
        }
        return null;
    }
}

export async function getPersonInfo(jikanID) {
    if (jikanID) {
        let url = `https://api.jikan.moe/v3/person/${jikanID}`;
        return await handleApiCall(url, 15);
    }
}

export async function getCharacterInfo(jikanID) {
    if (jikanID) {
        let url = `https://api.jikan.moe/v3/character/${jikanID}`;
        return await handleApiCall(url, 15);
    }
}

function getRelatedTitles(data) {
    let relatedTitles = [];
    if (!data.related) {
        return [];
    }
    if (data.related.Prequel) {
        let temp = data.related.Prequel.map(item => {
            item.relation = 'Prequel';
            return item;
        });
        relatedTitles.push(...temp);
    }
    if (data.related.Sequel) {
        let temp = data.related.Sequel.map(item => {
            item.relation = 'Sequel';
            return item;
        });
        relatedTitles.push(...temp);
    }
    if (data.related['Side story']) {
        let temp = data.related['Side story'].map(item => {
            item.relation = 'Side Story';
            return item;
        });
        relatedTitles.push(...temp);
    }
    if (data.related['Parent story']) {
        let temp = data.related['Parent story'].map(item => {
            item.relation = 'Parent Story';
            return item;
        });
        relatedTitles.push(...temp);
    }
    if (data.related['Spin-off']) {
        let temp = data.related['Spin-off'].map(item => {
            item.relation = 'Spin-off';
            return item;
        });
        relatedTitles.push(...temp);
    }
    relatedTitles = relatedTitles.filter(item => item.type === 'anime');
    return relatedTitles.map(item => {
        return ({
            _id: '',
            jikanID: item.mal_id,
            title: utils.replaceSpecialCharacters(item.name.toLowerCase()),
            rawTitle: item.name,
            relation: item.relation,
        });
    });
}

function getModifiedJikanApiData(allTitles, fullData) {
    delete fullData.title;
    delete fullData.title_english;
    delete fullData.title_japanese;
    delete fullData.title_synonyms;

    let titleObj = getTitleObjFromJikanData(allTitles);
    return {
        ...fullData,
        animeType: fullData.type,
        titleObj: titleObj,
    };
}

function getTitleObjFromJikanData(allTitles) {
    let titleObj = {
        title: allTitles.apiTitle_simple,
        rawTitle: allTitles.apiTitle,
        alternateTitles: [],
        titleSynonyms: allTitles.titleSynonyms,
    }
    let temp = utils.removeDuplicateElements(
        [allTitles.apiTitleEnglish, allTitles.apiTitleJapanese]
            .filter(value => value)
            .map(value => value.toLowerCase())
    );
    if (temp.length > 1 && temp[1].includes(temp[0].replace('.', '')) && temp[1].match(/(\dth|2nd|3rd) season/gi)) {
        temp.shift();
    }
    titleObj.alternateTitles = temp;
    return titleObj;
}

async function handleApiCall(url, timeoutSec = 0) {
    let cacheResult = jikanCache.get(url);
    if (cacheResult === 'notfound: jikan error') {
        return null;
    }
    if (cacheResult) {
        return cacheResult;
    }
    while (isRunning) {
        let now = new Date();
        if (multiCounter < 10 && utils.getDatesBetween(now, callTime).seconds > 4) {
            break;
        }
        await new Promise((resolve => setTimeout(resolve, 100)));
    }
    multiCounter++;
    let waitCounter = 0;
    while (waitCounter < 20) {
        try {
            isRunning = true;
            callTime = new Date();

            let response = await new Promise((resolve, reject) => {
                const source = axios.CancelToken.source();
                let hardTimeout = timeoutSec === 0 ? 3 * 60 * 1000 : (3 * timeoutSec * 1000) + 7;
                const timeoutId = setTimeout(() => {
                    source.cancel('hard timeout');
                }, hardTimeout);

                axios.get(url, {
                    cancelToken: source.token,
                    timeout: timeoutSec * 1000,
                }).then((result) => {
                    clearTimeout(timeoutId);
                    return resolve(result);
                }).catch((err) => {
                    clearTimeout(timeoutId);
                    return reject(err);
                });
            });

            if (multiCounter === 1) {
                isRunning = false;
            }
            multiCounter--;
            if (url.includes('person') || url.includes('character')) {
                jikanCache.set(url, response.data, 30 * 60); // 30 min
            } else {
                jikanCache.set(url, response.data);
            }
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                let waitTime = 3000;
                waitCounter++;
                await new Promise((resolve => setTimeout(resolve, waitTime)));
            } else {
                if (multiCounter === 1) {
                    isRunning = false;
                }
                multiCounter--;
                if (error.message === 'hard timeout') {
                    return null;
                }
                if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    error.isAxiosError = true;
                    error.url = url;
                    await saveError(error);
                    return null;
                }
                if (
                    error.code === 'ECONNABORTED' ||
                    !error.response ||
                    (error.response && (
                        error.response.status !== 404 &&
                        error.response.status !== 500 &&
                        error.response.status !== 503
                    ))
                ) {
                    await saveError(error);
                }
                jikanCache.set(url, 'notfound: jikan error');
                return null;
            }
        }
    }
    Sentry.captureMessage(`lots of jikan api call: ${url}`);
    return null;
}

function getTitlesFromData(fullData) {
    let apiTitle = fullData.title;
    let apiTitle_simple = utils.replaceSpecialCharacters(apiTitle.toLowerCase());
    let apiTitleEnglish = (fullData.title_english || '').replace(/-....+-/g, '');
    let apiTitleEnglish_simple = utils.replaceSpecialCharacters(apiTitleEnglish.toLowerCase());
    let japaneseTitle = (fullData.title_japanese || '').toLowerCase();
    japaneseTitle = japaneseTitle.includes('movie')
        ? japaneseTitle
        : japaneseTitle.replace(/-....+-/g, '');
    let apiTitleJapanese = utils.replaceSpecialCharacters(japaneseTitle);
    let titleSynonyms = fullData.title_synonyms.map(value => value.toLowerCase());

    let splitApiTitle = apiTitle_simple.split(' ');
    let splitApiTitle_lastPart = splitApiTitle[splitApiTitle.length - 1];
    if (!isNaN(splitApiTitle_lastPart) && Number(splitApiTitle_lastPart) > 2000) {
        let number = splitApiTitle.pop();
        apiTitle_simple = splitApiTitle.join(' ');
        apiTitle = apiTitle.replace(`(${number})`, '').trim();
        apiTitle = apiTitle.replace(number, '').trim();
    }

    apiTitle_simple = apiTitle_simple.replace(/tv/gi, '').replace(/\s\s+/g, ' ').trim();
    apiTitle = apiTitle.replace('(TV)', '').replace(/\s\s+/g, ' ').trim();
    apiTitleEnglish_simple = apiTitleEnglish_simple.replace(/tv/gi, '').replace(/\s\s+/g, ' ').trim();

    return {
        apiTitle,
        apiTitle_simple,
        apiTitleEnglish,
        apiTitleEnglish_simple,
        apiTitleJapanese,
        titleSynonyms,
    };
}

export async function updateJikanData() {
    //reset rank
    await crawlerMethodsDB.resetTempRank(true);
    await crawlerMethodsDB.changeMoviesReleaseStateDB('comingSoon', 'comingSoon_temp_anime', ['anime_movie', 'anime_serial']);
    await add_comingSoon_topAiring_Titles('comingSoon', 2);
    await crawlerMethodsDB.changeMoviesReleaseStateDB('comingSoon_temp_anime', 'waiting', ['anime_movie', 'anime_serial']);
    await crawlerMethodsDB.replaceRankWithTempRank('animeTopComingSoon', true);
    //reset rank
    await crawlerMethodsDB.resetTempRank(true);
    await add_comingSoon_topAiring_Titles('topAiring', 2);
    await crawlerMethodsDB.replaceRankWithTempRank('animeTopAiring', true);
}

async function add_comingSoon_topAiring_Titles(mode, numberOfPage) {
    const updatePromiseQueue = new pQueue.default({concurrency: 20});
    const insertPromiseQueue = new pQueue.default({concurrency: 5});

    for (let k = 1; k <= numberOfPage; k++) {
        let url = (mode === 'comingSoon')
            ? `https://api.jikan.moe/v3/top/anime/${k}/upcoming`
            : `https://api.jikan.moe/v3/top/anime/${k}/airing`;

        let apiData = await handleApiCall(url);
        if (!apiData) {
            continue;
        }

        let comingSoon_topAiring_titles = apiData.top;
        for (let i = 0; i < comingSoon_topAiring_titles.length; i++) {
            let titleDataFromDB = await crawlerMethodsDB.searchOnMovieCollectionDB({jikanID: comingSoon_topAiring_titles[i].mal_id}, {
                ...dataLevelConfig['medium'],
                jikanID: 1,
                castUpdateDate: 1,
            });
            if (titleDataFromDB) {
                updatePromiseQueue.add(() => update_comingSoon_topAiring_Title(titleDataFromDB, comingSoon_topAiring_titles[i], mode));
            } else {
                insertPromiseQueue.add(() => insert_comingSoon_topAiring_Title(comingSoon_topAiring_titles[i], mode));
            }
        }
    }

    await updatePromiseQueue.onIdle();
    await insertPromiseQueue.onIdle();
}

async function update_comingSoon_topAiring_Title(titleDataFromDB, semiJikanData, mode) {
    let updateFields = {};

    if (mode === 'comingSoon') {
        if (titleDataFromDB.releaseState !== "done" && titleDataFromDB.releaseState !== 'comingSoon') {
            updateFields.releaseState = 'comingSoon';
        }
    } else {
        if (titleDataFromDB.releaseState === 'comingSoon') {
            updateFields.releaseState = 'waiting';
        }
    }
    updateFields.tempRank_anime = semiJikanData.rank;

    let type = semiJikanData.type === 'Movie' ? 'anime_movie' : 'anime_serial';
    let title = utils.replaceSpecialCharacters(semiJikanData.title.toLowerCase());
    let jikanData = await getJikanApiData(title, '', type, semiJikanData.mal_id);
    let jikanApiFields = null;
    if (jikanData) {
        jikanApiFields = getJikanApiFields(jikanData);
    }

    if (jikanApiFields) {
        updateFields = {...updateFields, ...jikanApiFields.updateFields};
        updateFields.status = jikanApiFields.status;
        updateFields.endYear = jikanApiFields.endYear;
        updateFields.genres = jikanApiFields.genres;
        titleDataFromDB.rating.myAnimeList = jikanApiFields.myAnimeListScore;
        updateFields.rating = titleDataFromDB.rating;
        titleDataFromDB.summary.english = jikanApiFields.summary_en.replace(/([.…])+$/, '');
        updateFields.summary = titleDataFromDB.summary;
    }

    if (titleDataFromDB.posters.length === 0) {
        let jikanPoster = semiJikanData.image_url;
        if (jikanPoster && !jikanPoster.includes('/icon/')) {
            let s3poster = await cloudStorage.uploadTitlePosterToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, jikanPoster);
            if (s3poster) {
                updateFields.poster_s3 = s3poster;
                updateFields.posters = [{
                    url: s3poster.url,
                    info: 's3Poster',
                    size: s3poster.size,
                }];
            }
        }
    }

    if (jikanData && !titleDataFromDB.trailers) {
        let jikanTrailer = jikanData.trailer_url;
        if (jikanTrailer) {
            let s3Trailer = await cloudStorage.uploadTitleTrailerFromYoutubeToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, jikanTrailer);
            if (s3Trailer) {
                updateFields.trailer_s3 = s3Trailer;
                updateFields.trailers = [{
                    url: s3Trailer.url,
                    info: 's3Trailer-720p'
                }];
            }
        }
    }

    if (titleDataFromDB.castUpdateDate === 0) {
        let allApiData = {
            jikanApiFields: jikanApiFields || {
                jikanID: titleDataFromDB.jikanID,
            },
        };
        let castAndCharacters = await getCastAndCharacterFields(titleDataFromDB._id, titleDataFromDB, allApiData);
        if (castAndCharacters) {
            updateFields = {...updateFields, ...castAndCharacters};
        }
    }

    await crawlerMethodsDB.updateByIdDB('movies', titleDataFromDB._id, updateFields);
}

async function insert_comingSoon_topAiring_Title(semiJikanData, mode) {
    let type = semiJikanData.type === 'Movie' ? 'anime_movie' : 'anime_serial';
    let title = utils.replaceSpecialCharacters(semiJikanData.title.toLowerCase());
    let jikanApiData = await getJikanApiData(title, '', type, semiJikanData.mal_id);

    if (jikanApiData) {
        let titleModel = getMovieModel(
            jikanApiData.titleObj, '', type, [],
            '', '', '', '',
            [], [], []
        );

        let jikanApiFields = getJikanApiFields(jikanApiData);
        if (jikanApiFields) {
            titleModel = {...titleModel, ...jikanApiFields.updateFields};
            titleModel.status = jikanApiFields.status;
        }

        await uploadPosterAndTrailer(titleModel, jikanApiData);

        titleModel.insert_date = 0;
        titleModel.apiUpdateDate = 0;
        if (mode === 'comingSoon') {
            titleModel.releaseState = 'comingSoon';
        } else {
            titleModel.releaseState = 'waiting';
        }
        titleModel.tempRank_anime = semiJikanData.rank;
        titleModel.movieLang = 'japanese';
        titleModel.country = 'japan';
        titleModel.endYear = jikanApiFields.endYear;
        titleModel.rating.myAnimeList = jikanApiFields.myAnimeListScore;
        titleModel.relatedTitles = await getAnimeRelatedTitles(titleModel, jikanApiFields.jikanRelatedTitles);
        titleModel.summary.english = jikanApiFields.summary_en.replace(/([.…])+$/, '');
        titleModel.genres = jikanApiFields.genres;
        let insertedId = await crawlerMethodsDB.insertToDB('movies', titleModel);

        if (insertedId && jikanApiFields) {
            let allApiData = {
                jikanApiFields,
            };
            let castAndCharacters = await getCastAndCharacterFields(insertedId, titleModel, allApiData);
            if (castAndCharacters) {
                await crawlerMethodsDB.updateByIdDB('movies', insertedId, castAndCharacters);
            }
        }
    }
}

async function uploadPosterAndTrailer(titleModel, jikanData) {
    let jikanPoster = jikanData.image_url;
    if (jikanPoster && !jikanPoster.includes('/icon/')) {
        let s3poster = await cloudStorage.uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, jikanPoster);
        if (s3poster) {
            titleModel.poster_s3 = s3poster;
            titleModel.posters = [{
                url: s3poster.url,
                info: 's3Poster',
                size: s3poster.size,
            }];
        }
    }

    let jikanTrailer = jikanData.trailer_url;
    if (jikanTrailer) {
        let s3Trailer = await cloudStorage.uploadTitleTrailerFromYoutubeToS3(titleModel.title, titleModel.type, titleModel.year, jikanTrailer);
        if (s3Trailer) {
            titleModel.trailer_s3 = s3Trailer;
            titleModel.trailers = [{
                url: s3Trailer.url,
                info: 's3Trailer-720p'
            }];
        }
    }
}

export async function getAnimeRelatedTitles(titleData, jikanRelatedTitles) {
    try {
        let newRelatedTitles = [];
        for (let i = 0; i < jikanRelatedTitles.length; i++) {
            let searchResult = await crawlerMethodsDB.searchOnMovieCollectionDB(
                {jikanID: jikanRelatedTitles[i].jikanID},
                dataLevelConfig['medium']
            );

            if (searchResult) {
                let relatedTitleData = {
                    ...jikanRelatedTitles[i],
                    ...searchResult
                };
                newRelatedTitles.push(relatedTitleData);
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

export async function connectNewAnimeToRelatedTitles(titleModel, titleID) {
    let jikanID = titleModel.jikanID;
    let mediumLevelDataKeys = Object.keys(dataLevelConfig['medium']);
    let mediumLevelData = Object.keys(titleModel)
        .filter(key => mediumLevelDataKeys.includes(key))
        .reduce((obj, key) => {
            obj[key] = titleModel[key];
            return obj;
        }, {});
    let searchResults = await crawlerMethodsDB.searchForAnimeRelatedTitlesByJikanIDDB(jikanID);
    for (let i = 0; i < searchResults.length; i++) {
        let updateFlag = false;
        let thisTitleRelatedTitles = searchResults[i].relatedTitles;
        for (let j = 0; j < thisTitleRelatedTitles.length; j++) {
            if (thisTitleRelatedTitles[j].jikanID === jikanID) {
                updateFlag = true;
                thisTitleRelatedTitles[j] = {
                    ...thisTitleRelatedTitles[j],
                    ...mediumLevelData,
                    _id: titleID,
                }
            }
        }
        if (updateFlag) {
            await crawlerMethodsDB.updateByIdDB(
                'movies',
                searchResults[i]._id,
                {
                    relatedTitles: thisTitleRelatedTitles
                });
        }
    }
}

async function getCastAndCharacterFields(insertedId, titleData, allApiData) {
    await connectNewAnimeToRelatedTitles(titleData, insertedId);
    let poster = titleData.posters.length > 0 ? titleData.posters[0].url : '';
    let temp = await addStaffAndCharacters(insertedId, titleData.rawTitle, titleData.type, poster, allApiData, titleData.castUpdateDate);
    if (temp) {
        return {
            ...temp,
            castUpdateDate: new Date(),
        }
    }
    return null;
}
