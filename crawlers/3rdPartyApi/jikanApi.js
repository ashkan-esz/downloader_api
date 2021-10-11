const axios = require('axios').default;
const {
    getStatusObjDB,
    updateStatusObjDB,
    searchOnMovieCollectionDB,
    updateByIdDB,
    insertToDB,
    searchForAnimeTitlesByJikanID,
    updateMovieCollectionDB
} = require("../../dbMethods");
const {uploadTitlePosterToS3, uploadTitleTrailerFromYoutubeToS3} = require("../../cloudStorage");
const {
    replaceSpecialCharacters,
    convertHourToMinute,
    purgeObjFalsyValues,
    getDatesBetween,
    removeDuplicateElements
} = require("../utils");
const {addStaffAndCharacters} = require("./personCharacter");
const {getTitleModel} = require("../models/title");
const {default: pQueue} = require('p-queue');
const Sentry = require('@sentry/node');
const {saveError} = require("../../saveError");
const {dataConfig} = require("../../routes/configs");

let jikanCacheStartDate = new Date();
let jikanApiCache404 = [];
let jikanApiCache = [];
let isRunning = false;
let callTime = 0;
let multiCounter = 0;

export function resetJikanApiCache(now) {
    if (getDatesBetween(now, jikanCacheStartDate).hours > 12) {
        jikanApiCache404 = [];
        jikanApiCache = [];
        jikanCacheStartDate = now;
    }
}

function getFromJikanApiCache404(title, year, type) {
    let editedTitle = title.toLowerCase()
        .replace(' the', '')
        .replace('memories', 'memory')
        .replace('tv', '')
        .trim();
    for (let i = 0; i < jikanApiCache404.length; i++) {
        if (jikanApiCache404[i].type === type &&
            jikanApiCache404[i].siteYear === year &&
            jikanApiCache404[i].title.toLowerCase() === editedTitle) {
            return '404';
        }
    }
    return null;
}

function getFromJikanApiCache(title, rawTitle, year, type) {
    title = title.toLowerCase();
    rawTitle = rawTitle.toLowerCase();
    for (let i = 0; i < jikanApiCache.length; i++) {
        if (
            jikanApiCache[i].type.replace('anime_', '') === type.replace('anime_', '') &&
            jikanApiCache[i].siteYear === year &&
            (
                jikanApiCache[i].siteTitle.toLowerCase() === title ||
                jikanApiCache[i].apiTitle.toLowerCase() === title ||
                jikanApiCache[i].apiTitle.toLowerCase() === rawTitle ||
                jikanApiCache[i].apiTitle_simple.toLowerCase() === title ||
                jikanApiCache[i].apiTitleEnglish.toLowerCase() === title ||
                jikanApiCache[i].titleSynonyms.includes(title) ||
                jikanApiCache[i].titleSynonyms.includes(rawTitle)
            )
        ) {
            return jikanApiCache[i];
        }
    }
    return null;
}

export async function getJikanApiData(title, rawTitle, year, type, jikanID, fromCacheOnly) {
    let jikanCacheResult404 = getFromJikanApiCache404(title, year, type);
    if (jikanCacheResult404 === '404') {
        return null;
    }
    let jikanCacheResult = getFromJikanApiCache(title, rawTitle, year, type);
    if (jikanCacheResult || fromCacheOnly) {
        return jikanCacheResult;
    }

    if (jikanID) {
        let animeUrl = `https://api.jikan.moe/v3/anime/${jikanID}`;
        let fullData = await handleApiCall(animeUrl);
        if (fullData) {
            let allTitles = getTitlesFromData(fullData);
            if (checkTitle(title, type, allTitles)) {
                let apiData = await getJikanApiData_simple(title, year, type, allTitles, fullData, jikanID);
                jikanApiCache.push(apiData);
                return apiData;
            }
        }
    }

    let searchTitle = (title.match(/^\d+$/g) || title.length < 3) ? (' ' + title) : title;
    searchTitle = (searchTitle.length < 3) ? (' ' + searchTitle) : searchTitle;
    let yearSearch = '';
    if (year) {
        let temp = Number(year);
        yearSearch = `&start_date=${temp - 1}-01-01&end_date=${temp + 1}-01-01`;
    }
    let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${searchTitle}&limit=10`;
    if (yearSearch) {
        animeSearchUrl += yearSearch;
    }
    let data = await handleApiCall(animeSearchUrl);
    if (!data) {
        if (title.length === 2) {
            let searchTitle = title.split('').join('\'');
            let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${searchTitle}&limit=10`;
            if (yearSearch) {
                animeSearchUrl += yearSearch;
            }
            data = await handleApiCall(animeSearchUrl);
            if (!data) {
                return null;
            }
        } else {
            return null;
        }
    }

    if (
        type.includes('serial') &&
        data.results[0].title.replace(/the|\(tv\)|\s+/gi, '') === data.results[1].title.replace(/the|\(tv\)|\s+/gi, '') &&
        (data.results[0].type.match(/ova|ona/gi) && Number(data.results[0].episodes) < Number(data.results[1].episodes))
    ) {
        data.results.shift();
    }

    for (let i = 0; i < data.results.length; i++) {
        if (
            (
                type.includes('serial') &&
                data.results[i].start_date.split('-')[0] !== year &&
                Number(data.results[i].episodes) === 0
            ) ||
            (type.includes('movie') && Number(data.results[i].episodes) > 1)
        ) {
            continue;
        }

        let animeUrl = `https://api.jikan.moe/v3/anime/${data.results[i].mal_id}`;
        let fullData = await handleApiCall(animeUrl);
        if (!fullData) {
            continue;
        }
        let jikanID = fullData.mal_id;

        let allTitles = getTitlesFromData(fullData);

        if (checkTitle(title, type, allTitles)) {
            let apiData = await getJikanApiData_simple(title, year, type, allTitles, fullData, jikanID);
            jikanApiCache.push(apiData);
            return apiData;
        }
    }
    jikanApiCache404.push({
        title: title,
        type: type,
    });
    return null;
}

function checkTitle(title, type, allTitles) {
    let {
        apiTitle_simple,
        apiTitleEnglish_simple,
        apiTitleJapanese,
        titleSynonyms,
    } = allTitles;

    return (
        title.replace(/tv|the|\s+/g, '').trim() === apiTitle_simple.replace(/the|tv|\s+/g, '').trim() ||
        title === apiTitleEnglish_simple.replace(/the/gi, '').replace(/\s\s+/g, ' ') ||
        title === apiTitleJapanese ||
        titleSynonyms.includes(title)
    );
}

export function getJikanApiFields(data) {
    try {
        let apiFields = {
            jikanRelatedTitles: getRelatedTitles(data),
            summary_en: data.synopsis ? data.synopsis.replace('[Written by MAL Rewrite]').trim() : '',
            genres: data.genres.map(item => item.name.toLowerCase()) || [],
            status: data.status.toLowerCase().includes('finished') ? 'ended' : 'running',
            endYear: data.aired.to ? data.aired.to.split('T')[0] || '' : '',
            myAnimeListScore: Number(data.score) || 0,
            youtubeTrailer: data.trailer_url,
            updateFields: {
                jikanID: data.jikanID,
                rawTitle: data.apiTitle,
                premiered: data.aired.from ? data.aired.from.split('T')[0] : '',
                animeType: data.animeType,
                year: data.aired.from ? data.aired.from.split(/[-–]/g)[0] : '',
                duration: (data.duration === "Unknown" || data.duration === "1 min per ep")
                    ? ''
                    : convertHourToMinute(data.duration.replace('per ep', '').trim()),
                releaseDay: (data.broadcast === null || data.broadcast === 'Unknown') ? '' : data.broadcast.split(' ')[0].replace(/s$/g, '').toLowerCase(),
                rated: data.rating === "None" ? '' : data.rating || '',
                animeSource: data.source,
            }
        };
        apiFields.updateFields = purgeObjFalsyValues(apiFields.updateFields);
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
        return await handleApiCall(url);
    }
}

export async function getCharacterInfo(jikanID) {
    if (jikanID) {
        let url = `https://api.jikan.moe/v3/character/${jikanID}`;
        return await handleApiCall(url);
    }
}

function getRelatedTitles(data) {
    let relatedTitles = [];
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
            title: replaceSpecialCharacters(item.name.toLowerCase()),
            rawTitle: item.name,
            relation: item.relation,
        });
    });
}

async function getJikanApiData_simple(title, year, type, allTitles, fullData, jikanID) {
    delete fullData.title;
    delete fullData.title_english;
    delete fullData.title_japanese;
    delete fullData.title_synonyms;
    delete fullData.mal_id;

    return {
        ...fullData,
        jikanID: jikanID,
        siteTitle: title,
        siteYear: year,
        type: type,
        animeType: fullData.type,
        apiTitle_simple: allTitles.apiTitle_simple,
        apiTitle: allTitles.apiTitle,
        apiTitleEnglish: allTitles.apiTitleEnglish,
        apiTitleJapanese: allTitles.apiTitleJapanese,
        titleSynonyms: allTitles.titleSynonyms,
    };
}

async function handleApiCall(url) {
    while (isRunning) {
        let now = new Date();
        if (getDatesBetween(now, callTime).seconds > 4 && multiCounter < 10) {
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
            let response = await axios.get(url);
            if (multiCounter === 1) {
                isRunning = false;
            }
            multiCounter--;
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
                if (
                    error.code === 'ECONNABORTED' ||
                    (error.response && (
                        error.response.status !== 404 &&
                        error.response.status !== 500 &&
                        error.response.status !== 503
                    ))
                ) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    Sentry.captureMessage(`lots of jikan api call: ${url}`);
    return null;
}

function getTitlesFromData(fullData) {
    let apiTitle = fullData.title;
    let apiTitle_simple = replaceSpecialCharacters(apiTitle.toLowerCase());
    let apiTitleEnglish = (fullData.title_english || '').replace(/-....+-/g, '');
    let apiTitleEnglish_simple = replaceSpecialCharacters(apiTitleEnglish.toLowerCase());
    let japaneseTitle = (fullData.title_japanese || '').toLowerCase();
    japaneseTitle = japaneseTitle.includes('movie')
        ? japaneseTitle
        : japaneseTitle.replace(/-....+-/g, '');
    let apiTitleJapanese = replaceSpecialCharacters(japaneseTitle);
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
    let states = await getStatusObjDB();
    if (!states) {
        return;
    }

    //update data each 12 hour
    let now = new Date();
    let jikanDataUpdateDate = new Date(states.jikanDataUpdateDate);
    if (getDatesBetween(now, jikanDataUpdateDate).hours < 12) {
        return;
    }
    states.jikanDataUpdateDate = now;

    //reset rank
    await updateMovieCollectionDB({
        'rank.animeTopComingSoon': -1,
        'rank.animeTopAiring': -1,
    });

    await add_comingSoon_topAiring_Titles('comingSoon');
    await add_comingSoon_topAiring_Titles('topAiring');

    await updateStatusObjDB(states);
}

async function add_comingSoon_topAiring_Titles(mode) {
    let url = (mode === 'comingSoon')
        ? 'https://api.jikan.moe/v3/top/anime/1/upcoming'
        : 'https://api.jikan.moe/v3/top/anime/1/airing';

    let apiData = await handleApiCall(url);
    if (!apiData) {
        return;
    }

    let comingSoon_topAiring_titles = apiData.top;
    const promiseQueue = new pQueue({concurrency: 2});
    for (let i = 0; i < comingSoon_topAiring_titles.length && i < 50; i++) {
        console.log(i, comingSoon_topAiring_titles[i].title);
        let titleDataFromDB = await searchOnMovieCollectionDB({jikanID: comingSoon_topAiring_titles[i].mal_id}, {
            ...dataConfig['medium'],
            rank: 1,
            title: 1,
            rawTitle: 1,
            type: 1,
            year: 1,
            jikanID: 1,
            posters: 1,
            trailers: 1,
            castUpdateDate: 1,
        });
        if (titleDataFromDB) {
            promiseQueue.add(() => update_comingSoon_topAiring_Title(titleDataFromDB, comingSoon_topAiring_titles[i], mode));
        } else {
            promiseQueue.add(() => insert_comingSoon_topAiring_Title(comingSoon_topAiring_titles[i], mode));
        }
    }
    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

async function update_comingSoon_topAiring_Title(titleDataFromDB, semiJikanData, mode) {
    let updateFields = {};

    if (mode === 'comingSoon') {
        titleDataFromDB.rank.animeTopComingSoon = semiJikanData.rank;
    } else {
        titleDataFromDB.rank.animeTopAiring = semiJikanData.rank;
    }
    updateFields.rank = titleDataFromDB.rank;

    if (titleDataFromDB.posters.length === 0) {
        let jikanPoster = semiJikanData.image_url;
        if (jikanPoster) {
            let s3poster = await uploadTitlePosterToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, [jikanPoster]);
            if (s3poster) {
                updateFields.posters = [s3poster];
                updateFields.poster_s3 = s3poster;
            }
        }
    }

    if (!titleDataFromDB.trailers) {
        let jikanID = semiJikanData.mal_id;
        let animeUrl = `https://api.jikan.moe/v3/anime/${jikanID}`;
        let jikanData = await handleApiCall(animeUrl);
        if (jikanData) {
            let jikanTrailer = jikanData.trailer_url;
            if (jikanTrailer) {
                let s3Trailer = await uploadTitleTrailerFromYoutubeToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, [jikanTrailer]);
                if (s3Trailer) {
                    updateFields.trailer_s3 = s3Trailer;
                    updateFields.trailers = [{
                        link: s3Trailer,
                        info: 's3Trailer-720p'
                    }];
                }
            }
        }
    }

    if (titleDataFromDB.castUpdateDate === 0) {
        let allApiData = {
            jikanApiFields: {
                jikanID: titleDataFromDB.jikanID,
            },
        };
        let castAndCharacters = await getCastAndCharacterFields(titleDataFromDB._id, titleDataFromDB, allApiData, titleDataFromDB.type);
        if (castAndCharacters) {
            updateFields = {...updateFields, ...castAndCharacters};
        }
    }

    if (Object.keys(updateFields).length > 0) {
        await updateByIdDB('movies', titleDataFromDB._id, updateFields);
    }
}

async function insert_comingSoon_topAiring_Title(semiJikanData, mode) {
    let jikanID = semiJikanData.mal_id;
    let animeUrl = `https://api.jikan.moe/v3/anime/${jikanID}`;
    let thisTitleData = await handleApiCall(animeUrl);
    if (thisTitleData) {
        let titleObj = getTitleObjFromJikanData(thisTitleData);

        let type = thisTitleData.type === 'Movie' ? 'anime_movie' : 'anime_serial';
        let titleModel = getTitleModel(
            titleObj, '', type, [],
            '', '', '',
            [], [], []
        );
        thisTitleData.jikanID = jikanID;
        let jikanApiFields = getJikanApiFields(thisTitleData);
        if (jikanApiFields) {
            titleModel = {...titleModel, ...jikanApiFields.updateFields};
        }

        await uploadPosterAndTrailer(titleModel, thisTitleData);

        titleModel.sources = [];
        titleModel.posters = [];
        titleModel.insert_date = 0;
        titleModel.apiUpdateDate = 0;
        titleModel.status = 'comingSoon';
        titleModel.releaseState = 'comingSoon';
        if (mode === 'comingSoon') {
            titleModel.rank.animeTopComingSoon = semiJikanData.rank;
        } else {
            titleModel.rank.animeTopAiring = semiJikanData.rank;
        }
        titleModel.movieLang = 'japanese';
        titleModel.country = 'japan';
        titleModel.status = 'comingSoon';
        titleModel.endYear = jikanApiFields.endYear;
        titleModel.rating.myAnimeList = jikanApiFields.myAnimeListScore;
        titleModel.relatedTitles = await getAnimeRelatedTitles(titleModel, jikanApiFields.jikanRelatedTitles);
        titleModel.summary.english = jikanApiFields.summary_en;
        titleModel.genres = jikanApiFields.genres;
        let insertedId = await insertToDB('movies', titleModel);

        if (insertedId) {
            let allApiData = {
                jikanApiFields,
            };
            let castAndCharacters = await getCastAndCharacterFields(insertedId, titleModel, allApiData, titleModel.type);
            if (castAndCharacters) {
                await updateByIdDB('movies', insertedId, castAndCharacters);
            }
        }
    }
}

async function uploadPosterAndTrailer(titleModel, jikanData) {
    let jikanPoster = jikanData.image_url;
    if (jikanPoster) {
        let s3poster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, [jikanPoster]);
        if (s3poster) {
            titleModel.poster_s3 = s3poster;
            titleModel.posters = [s3poster];
        }
    }

    let jikanTrailer = jikanData.trailer_url;
    if (jikanTrailer) {
        let s3Trailer = await uploadTitleTrailerFromYoutubeToS3(titleModel.title, titleModel.type, titleModel.year, [jikanTrailer]);
        if (s3Trailer) {
            titleModel.trailer_s3 = s3Trailer;
            titleModel.trailers = [{
                link: s3Trailer,
                info: 's3Trailer-720p'
            }];
        }
    }
}

function getTitleObjFromJikanData(thisTitleData) {
    let allTitles = getTitlesFromData(thisTitleData);
    let titleObj = {
        title: allTitles.apiTitle_simple,
        rawTitle: allTitles.apiTitle,
        alternateTitles: [],
        titleSynonyms: allTitles.titleSynonyms,
    }
    let temp = removeDuplicateElements(
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

export async function getAnimeRelatedTitles(titleData, jikanRelatedTitles) {
    try {
        let newRelatedTitles = [];
        for (let i = 0; i < jikanRelatedTitles.length; i++) {
            let searchResult = await searchOnMovieCollectionDB(
                {jikanID: jikanRelatedTitles[i].jikanID},
                dataConfig['medium']
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
    let mediumLevelDataKeys = Object.keys(dataConfig['medium']);
    let mediumLevelData = Object.keys(titleModel)
        .filter(key => mediumLevelDataKeys.includes(key))
        .reduce((obj, key) => {
            obj[key] = titleModel[key];
            return obj;
        }, {});
    let searchResults = await searchForAnimeTitlesByJikanID(jikanID);
    for (let i = 0; i < searchResults.length; i++) {
        let thisTitleRelatedTitles = searchResults[i].relatedTitles;
        for (let j = 0; j < thisTitleRelatedTitles.length; j++) {
            if (thisTitleRelatedTitles[j].jikanID === jikanID) {
                thisTitleRelatedTitles[j] = {
                    ...thisTitleRelatedTitles[j],
                    ...mediumLevelData,
                    _id: titleID,
                }
            }
        }
        await updateByIdDB(
            'movies',
            searchResults[i]._id,
            {
                relatedTitles: thisTitleRelatedTitles
            });
    }
}

async function getCastAndCharacterFields(insertedId, titleData, allApiData, type) {
    if (type.includes('anime')) {
        await connectNewAnimeToRelatedTitles(titleData, insertedId);
    }
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
