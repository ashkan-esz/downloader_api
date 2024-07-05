import config from "../../config/index.js";
import axios from "axios";
import {LRUCache} from "lru-cache";
import * as crawlerMethodsDB from "../../data/db/crawlerMethodsDB.js";
import * as moviesDbMethods from "../../data/db/moviesDbMethods.js";
import * as utils from "../utils/utils.js";
import {addStaffAndCharacters} from "./staffAndCharacters/personCharacter.js";
import {dataLevelConfig, getMovieModel} from "../../models/movie.js";
import {
    checkNeedTrailerUpload,
    uploadTitlePosterAndAddToTitleModel,
    uploadTitleYoutubeTrailerAndAddToTitleModel
} from "../posterAndTrailer.js";
import PQueue from 'p-queue';
import isEqual from 'lodash.isequal';
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "../status/crawlerWarnings.js";
import {saveError} from "../../error/saveError.js";
import {getFixedGenres, getFixedSummary} from "../extractors/utils.js";
import {uploadTitlePosterToS3} from "../../data/cloudStorage.js";
import {getKitsuApiData, getKitsuApiFields} from "./kitsuApi.js";
import {updateCronJobsStatus} from "../../utils/cronJobsStatus.js";

const rateLimitConfig = {
    minuteLimit: 60,
    secondLimit: 1,
    minute: new Date().getMinutes(),
    minute_call: 0,
    second: new Date().getSeconds(),
    second_call: 0,
};

const cache = new LRUCache({
    max: 500,
    maxSize: 5000,
    sizeCalculation: (value, key) => {
        return 1
    },
    ttl: 4 * 60 * 60 * 1000, //4 hour
    ttlResolution: 5 * 1000,
});

export function getJikanCacheSize() {
    return {size: cache.size, calculatedSize: cache.calculatedSize, limit: 5000};
}

export function flushJikanCachedData() {
    cache.clear();
}

export async function getJikanApiData(title, year, type, jikanID) {
    try {
        let yearMatch = title.match(/\(?\d\d\d\d\)?/g);
        yearMatch = yearMatch ? yearMatch.pop() : null;
        if (yearMatch && !year && Number(yearMatch) < 3000) {
            title = title.replace(yearMatch, '').trim();
            year = yearMatch;
        }
        // get jikan data directly with jikanID
        if (jikanID) {
            let animeUrl = `https://api.jikan.moe/v4/anime/${jikanID}/full`;
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
            jikanSearchResult.length > 1 &&
            (jikanSearchResult[0].title || jikanSearchResult[0].titles?.find(t => t.type === 'Default')?.title).replace(/the|\(tv\)|\s+/gi, '') ===
            (jikanSearchResult[1].title || jikanSearchResult[1].titles?.find(t => t.type === 'Default')?.title).replace(/the|\(tv\)|\s+/gi, '') &&
            (jikanSearchResult[0].type.match(/ova|ona/gi) && Number(jikanSearchResult[0].episodes) < Number(jikanSearchResult[1].episodes))
        ) {
            jikanSearchResult.shift();
        }

        for (let i = 0; i < jikanSearchResult.length; i++) {
            if (
                (
                    type.includes('serial') &&
                    jikanSearchResult[i].aired?.from?.split('-')[0] !== year &&
                    Number(jikanSearchResult[i].episodes) === 0
                ) ||
                (type.includes('movie') && Number(jikanSearchResult[i].episodes) > 1)
            ) {
                continue;
            }

            let allTitles = getTitlesFromData(jikanSearchResult[i]);

            if (checkTitle(title, type, allTitles)) {
                let animeUrl = `https://api.jikan.moe/v4/anime/${jikanSearchResult[i].mal_id}/full`;
                let fullData = await handleApiCall(animeUrl);
                if (!fullData) {
                    return null;
                }
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
    let animeSearchUrl = `https://api.jikan.moe/v4/anime?q=${searchTitle}&limit=10${yearSearch}`.trim();
    let data = await handleApiCall(animeSearchUrl);
    data = data?.data;
    if (!data && title.length === 2) {
        let searchTitle = title.split('').join('\'');
        let animeSearchUrl = `https://api.jikan.moe/v4/anime?q=${searchTitle}&limit=10${yearSearch}`.trim();
        data = await handleApiCall(animeSearchUrl);
        data = data?.data;
    } else if (title.includes('vol ')) {
        const editTitle = title.replace(/(?<=(^|\s))vol \d/, (res) => res.replace('vol', 'volume'));
        if (title !== editTitle) {
            let animeSearchUrl = `https://api.jikan.moe/v4/anime?q=${editTitle}&limit=10${yearSearch}`.trim();
            data = await handleApiCall(animeSearchUrl);
            data = data?.data;
        }
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
        title.replace(/tv|the|precent|\s+/g, '').replace(/volume \d/, (res) => res.replace('volume', 'vol')).trim() ===
        apiTitle_simple.replace(/the|tv|precent|\s+/g, '').replace(/volume \d/, (res) => res.replace('volume', 'vol')).trim() ||
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
            summary_en: getFixedSummary(data.synopsis),
            genres: getFixedGenres(data.genres.map(item => item.name)),
            status: data.status.toLowerCase().includes('finished') ? 'ended' : 'running',
            endYear: data.aired.to ? data.aired.to.split('T')[0] || '' : '',
            myAnimeListScore: Number(data.score) || 0,
            youtubeTrailer: data.trailer.url,
            updateFields: {
                rawTitle: data.titleObj.rawTitle.replace(/^["']|["']$/g, '').replace(/volume \d/i, (res) => res.replace('Volume', 'Vol')),
                premiered: data.aired.from ? data.aired.from.split('T')[0] : '',
                year: data.aired.from ? data.aired.from.split(/[-–]/g)[0] : '',
                animeType: data.animeType,
                duration: (data.duration === "Unknown" || data.duration === "1 min per ep" || data.duration.match(/\d+ sec/g))
                    ? ''
                    : utils.convertHourToMinute(data.duration.replace('per ep', '').trim()).replace('23 min', '24 min'),
                releaseDay: (data.broadcast === null || data.broadcast === 'Unknown') ? '' : data.broadcast.day?.replace(/s$/, '').toLowerCase() || '',
                rated: data.rating === "None" ? '' : data.rating || '',
                animeSource: data.source,
                animeSeason: data.season?.toLowerCase() || '',
            }
        };
        if (apiFields.updateFields.duration === '0 min' && apiFields.updateFields.animeType.toLowerCase() === 'tv') {
            apiFields.updateFields.duration = '24 min';
        }
        if (!apiFields.releaseDay && apiFields.premiered && apiFields.animeType.toLowerCase() === 'tv') {
            let dayNumber = new Date(data.aired.from).getDay();
            apiFields.releaseDay = utils.getDayName(dayNumber);
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
        let animeCharactersUrl = `https://api.jikan.moe/v4/anime/${jikanID}/characters`;
        let animeCharacters = await handleApiCall(animeCharactersUrl);
        let animeStaffUrl = `https://api.jikan.moe/v4/anime/${jikanID}/staff`;
        let animeStaff = await handleApiCall(animeStaffUrl);
        if (animeCharacters || animeStaff) {
            return {
                characters: animeCharacters || [],
                staff: animeStaff || [],
            }
        }
    }
    return null;
}

export async function getPersonInfo(jikanID) {
    if (jikanID) {
        let url = `https://api.jikan.moe/v4/people/${jikanID}`;
        return await handleApiCall(url, 8);
    }
    return null;
}

export async function getCharacterInfo(jikanID) {
    if (jikanID) {
        let url = `https://api.jikan.moe/v4/characters/${jikanID}`;
        return await handleApiCall(url, 8);
    }
    return null;
}

function getRelatedTitles(data) {
    if (!data.relations) {
        return [];
    }

    let relatedTitles = [];
    for (let i = 0; i < data.relations.length; i++) {
        let relation = data.relations[i].relation;
        if (relation === 'Character') {
            continue;
        }
        let entry = data.relations[i].entry;
        for (let j = 0; j < entry.length; j++) {
            if (entry[j].type === 'anime') {
                relatedTitles.push({
                    jikanID: entry[j].mal_id,
                    relation: relation,
                });
            }
        }
    }
    return relatedTitles;
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
        rawTitle: allTitles.apiTitle.replace(/^["']|["']$/g, '').replace(/volume \d/i, (res) => res.replace('Volume', 'Vol')),
        alternateTitles: [],
        titleSynonyms: allTitles.titleSynonyms,
    }
    let temp = utils.removeDuplicateElements(
        [allTitles.apiTitleEnglish, allTitles.apiTitleJapanese]
            .filter(Boolean)
            .map(value => value.toLowerCase())
    );
    if (temp.length > 1 && temp[1].includes(temp[0].replace('.', '')) && temp[1].match(/(\dth|2nd|3rd) season/gi)) {
        temp.shift();
    }
    titleObj.alternateTitles = temp;
    return titleObj;
}

async function handleRateLimits() {
    while (true) {
        let now = new Date();
        let minute = now.getMinutes();
        let second = now.getSeconds();
        if (rateLimitConfig.minute !== minute) {
            rateLimitConfig.minute = minute;
            rateLimitConfig.minute_call = 0;
        }
        if (rateLimitConfig.second !== second) {
            rateLimitConfig.second = second;
            rateLimitConfig.second_call = 0;
        }
        if (rateLimitConfig.second_call < rateLimitConfig.secondLimit && rateLimitConfig.minute_call < rateLimitConfig.minuteLimit) {
            rateLimitConfig.minute_call++;
            rateLimitConfig.second_call++;
            break;
        }
        await new Promise((resolve => setTimeout(resolve, 50)));
    }
}

async function handleApiCall(url, timeoutSec = 0) {
    const cacheResult = cache.get(url);
    if (cacheResult === 'notfound: jikan error') {
        return null;
    }
    if (cacheResult) {
        return cacheResult;
    }

    let waitCounter = 0;
    while (waitCounter < 12) {
        try {
            let response = await new Promise(async (resolve, reject) => {
                await handleRateLimits();

                const source = axios.CancelToken.source();
                let hardTimeout = timeoutSec === 0 ? 3 * 60 * 1000 : (1.5 * timeoutSec * 1000) + 7;
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

            let data = response.data.data;
            if (response.data.pagination) {
                data = {
                    pagination: response.data.pagination,
                    data: response.data.data,
                }
            }
            cache.set(url, {...data});
            return data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                let waitTime = 2000;
                waitCounter++;
                await new Promise((resolve => setTimeout(resolve, waitTime)));
            } else {
                if (error.code === 'EAI_AGAIN') {
                    const warningMessages = getCrawlerWarningMessages('');
                    await saveCrawlerWarning(warningMessages.apiCalls.jikan.eaiError);
                    return null;
                }
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
                cache.set(url, 'notfound: jikan error');
                return null;
            }
        }
    }
    await saveCrawlerWarning(getCrawlerWarningMessages().apiCalls.jikan.lotsOfApiCall);
    return null;
}

function getTitlesFromData(fullData) {
    let apiTitle = fullData.title || fullData.titles?.find(t => t.type === 'Default')?.title;
    let yearMatch = apiTitle?.match(/\(\d\d\d\d\)/g)?.pop() || null;
    if (yearMatch) {
        apiTitle = apiTitle.replace(yearMatch, '').trim();
    }
    let apiTitle_simple = utils.replaceSpecialCharacters(apiTitle?.toLowerCase() || '');
    let apiTitleEnglish = (fullData.title_english || fullData.titles?.find(t => t.type === 'English')?.title || '').replace(/-....+-/g, '');
    let apiTitleEnglish_simple = utils.replaceSpecialCharacters(apiTitleEnglish.toLowerCase());
    let japaneseTitle = (fullData.title_japanese || fullData.titles?.find(t => t.type === 'Japanese')?.title || '').toLowerCase();
    japaneseTitle = japaneseTitle.includes('movie')
        ? japaneseTitle
        : japaneseTitle.replace(/-....+-/g, '');
    let apiTitleJapanese = utils.replaceSpecialCharacters(japaneseTitle);
    let titleSynonyms = fullData.title_synonyms?.map(value => value.toLowerCase()) || [];

    let splitApiTitle = apiTitle_simple.split(' ');
    let splitApiTitle_lastPart = splitApiTitle[splitApiTitle.length - 1];
    if (!isNaN(splitApiTitle_lastPart) && Number(splitApiTitle_lastPart) > 2000) {
        let number = splitApiTitle.pop();
        apiTitle_simple = splitApiTitle.join(' ');
        apiTitle = apiTitle.replace(`(${number})`, '').trim();
        apiTitle = apiTitle.replace(number, '').trim();
    }

    apiTitle_simple = apiTitle_simple.replace(/tv/gi, '').replace(/\s\s+/g, ' ').trim();
    apiTitle_simple = apiTitle_simple.replace(/(?<=(^|\s))volume \d/, (res) => res.replace('volume', 'vol'));
    apiTitle = apiTitle.replace('(TV)', '').replace(/\s\s+/g, ' ').trim();
    apiTitle = apiTitle.replace(/(?<=(^|\s))volume \d/i, (res) => res.replace('Volume', 'Vol'));
    apiTitleEnglish_simple = apiTitleEnglish_simple.replace(/tv/gi, '').replace(/\s\s+/g, ' ').trim();
    apiTitleEnglish_simple = apiTitleEnglish_simple.replace(/(?<=(^|\s))volume \d/i, (res) => res.replace('Volume', 'Vol'));

    return {
        apiTitle,
        apiTitle_simple,
        apiTitleEnglish,
        apiTitleEnglish_simple,
        apiTitleJapanese,
        titleSynonyms,
    };
}

export async function updateJikanData(isJobFunction = false) {

    if (isJobFunction) {
        updateCronJobsStatus('updateJikanData', 'comingSoon');
    }
    // reset temp rank
    await crawlerMethodsDB.resetTempRank(true);
    await crawlerMethodsDB.changeMoviesReleaseStateDB('comingSoon', 'comingSoon_temp_anime', ['anime_movie', 'anime_serial']);
    await add_comingSoon_topAiring_Titles('comingSoon', 8, isJobFunction);
    await crawlerMethodsDB.changeMoviesReleaseStateDB('comingSoon_temp_anime', 'waiting', ['anime_movie', 'anime_serial']);
    await crawlerMethodsDB.replaceRankWithTempRank('animeTopComingSoon', true);

    if (isJobFunction) {
        updateCronJobsStatus('updateJikanData', 'topAiring');
    }
    // reset temp rank
    await crawlerMethodsDB.resetTempRank(true);
    await add_comingSoon_topAiring_Titles('topAiring', 8, isJobFunction);
    await crawlerMethodsDB.replaceRankWithTempRank('animeTopAiring', true);

    if (isJobFunction) {
        updateCronJobsStatus('updateJikanData', 'animeSeasonNow');
    }
    // reset temp rank
    await crawlerMethodsDB.resetTempRank(true);
    await add_comingSoon_topAiring_Titles('animeSeasonNow', 4, isJobFunction);
    await crawlerMethodsDB.replaceRankWithTempRank('animeSeasonNow', true);

    if (isJobFunction) {
        updateCronJobsStatus('updateJikanData', 'animeSeasonUpcoming');
    }
    // reset temp rank
    await crawlerMethodsDB.resetTempRank(true);
    await add_comingSoon_topAiring_Titles('animeSeasonUpcoming', 4, isJobFunction);
    await crawlerMethodsDB.replaceRankWithTempRank('animeSeasonUpcoming', true);
}

async function add_comingSoon_topAiring_Titles(mode, numberOfPage, isJobFunction) {
    const updatePromiseQueue = new PQueue({concurrency: 25});
    const insertPromiseQueue = new PQueue({concurrency: 5});

    let intervalId = null;
    let page = 1;
    if (isJobFunction) {
        intervalId = setInterval(() => {
            updateCronJobsStatus('updateJikanData', `Mode: ${mode}, page: ${page}/${numberOfPage},
            insert remained: ${insertPromiseQueue.size + insertPromiseQueue.pending}(-${insertPromiseQueue.pending}),
            update remained: ${updatePromiseQueue.size + updatePromiseQueue.pending}(-${updatePromiseQueue.pending})`.replace(/([\n\t]+)|\s+/g, " "));
        }, 1000);
    }

    let rank = 0;
    for (let k = 1; k <= numberOfPage; k++) {
        page = k;
        let url = '';
        if (mode === 'comingSoon') {
            url = `https://api.jikan.moe/v4/top/anime?filter=upcoming&page=${k}`;
        } else if (mode === 'topAiring') {
            url = `https://api.jikan.moe/v4/top/anime?filter=airing&page=${k}`;
        } else if (mode === 'animeSeasonNow') {
            url = `https://api.jikan.moe/v4/seasons/now?page=${k}`;
        } else {
            url = `https://api.jikan.moe/v4/seasons/upcoming?page=${k}`;
        }

        let apiData = await handleApiCall(url);
        if (!apiData) {
            continue;
        }

        let comingSoon_topAiring_titles = apiData.data;
        let uniqueTitles = [];
        for (let i = 0; i < comingSoon_topAiring_titles.length; i++) {
            if (!uniqueTitles.find(t => t.mal_id === comingSoon_topAiring_titles[i].mal_id)) {
                uniqueTitles.push(comingSoon_topAiring_titles[i]);
            }
        }
        comingSoon_topAiring_titles = uniqueTitles;

        for (let i = 0; i < comingSoon_topAiring_titles.length; i++) {
            rank++;
            let titleDataFromDB = await crawlerMethodsDB.searchOnMovieCollectionDB({"apiIds.jikanID": comingSoon_topAiring_titles[i].mal_id}, {
                ...dataLevelConfig['medium'],
                apiIds: 1,
                castUpdateDate: 1,
                endYear: 1,
                poster_s3: 1,
                poster_wide_s3: 1,
                trailer_s3: 1,
            });
            if (titleDataFromDB) {
                const saveRank = rank;
                updatePromiseQueue.add(() => update_comingSoon_topAiring_Title(titleDataFromDB, comingSoon_topAiring_titles[i], mode, saveRank));
            } else {
                const saveRank = rank;
                insertPromiseQueue.add(() => insert_comingSoon_topAiring_Title(comingSoon_topAiring_titles[i], mode, saveRank));
            }
        }

        if (!apiData.pagination.has_next_page) {
            break;
        }
    }

    await updatePromiseQueue.onIdle();
    await insertPromiseQueue.onIdle();
    if (intervalId) {
        clearInterval(intervalId);
    }
}

async function update_comingSoon_topAiring_Title(titleDataFromDB, semiJikanData, mode, rank) {
    try {
        let updateFields = {};

        if (mode === 'comingSoon' || mode === 'animeSeasonUpcoming') {
            if (titleDataFromDB.releaseState !== "done" && titleDataFromDB.releaseState !== 'comingSoon' && titleDataFromDB.releaseState !== 'waiting') {
                updateFields.releaseState = 'comingSoon';
            }
        } else {
            // topAiring|animeSeasonNow
            if (titleDataFromDB.releaseState === 'comingSoon') {
                updateFields.releaseState = 'waiting';
            }
        }
        updateFields.tempRank_anime = rank;

        let jikanApiFields = null;
        if (titleDataFromDB.castUpdateDate !== 0) {
            let titles = getTitlesFromData(semiJikanData);
            jikanApiFields = getJikanApiFields(getModifiedJikanApiData(titles, semiJikanData));
        } else {
            //need related titles, doesnt exist in semiJikanData
            let type = semiJikanData.type === 'Movie' ? 'anime_movie' : 'anime_serial';
            let title = utils.replaceSpecialCharacters((semiJikanData.title || semiJikanData.titles?.find(t => t.type === 'Default')?.title).toLowerCase());
            let jikanData = await getJikanApiData(title, '', type, semiJikanData.mal_id);
            if (jikanData) {
                jikanApiFields = getJikanApiFields(jikanData);
            }
        }

        if (jikanApiFields) {
            const keys1 = Object.keys(jikanApiFields.updateFields);
            for (let i = 0; i < keys1.length; i++) {
                if (!isEqual(titleDataFromDB[keys1[i]], jikanApiFields.updateFields[keys1[i]])) {
                    updateFields[keys1[i]] = jikanApiFields.updateFields[keys1[i]];
                }
            }

            const keys2 = ['genres', 'status', 'endYear'];
            for (let i = 0; i < keys2.length; i++) {
                if (!isEqual(titleDataFromDB[keys2[i]], jikanApiFields[keys2[i]])) {
                    updateFields[keys2[i]] = jikanApiFields[keys2[i]];
                }
            }

            if (titleDataFromDB.apiIds.jikanID !== jikanApiFields.jikanID) {
                titleDataFromDB.apiIds.jikanID = jikanApiFields.jikanID;
                updateFields.apiIds = titleDataFromDB.apiIds;
            }

            if (titleDataFromDB.rating.myAnimeList !== jikanApiFields.myAnimeListScore) {
                titleDataFromDB.rating.myAnimeList = jikanApiFields.myAnimeListScore;
                updateFields.rating = titleDataFromDB.rating;
            }

            jikanApiFields.summary_en = jikanApiFields.summary_en.replace(/([.…])+$/, '');
            if (titleDataFromDB.summary.english !== jikanApiFields.summary_en && jikanApiFields.summary_en) {
                titleDataFromDB.summary.english = jikanApiFields.summary_en;
                titleDataFromDB.summary.english_source = 'jikan';
                updateFields.summary = titleDataFromDB.summary;
            }

            await handleAnimeRelatedTitles(titleDataFromDB._id, jikanApiFields.jikanRelatedTitles);
        }

        const imageUrl = getImageUrl(semiJikanData);
        if (imageUrl && titleDataFromDB.posters.length === 0) {
            await uploadTitlePosterAndAddToTitleModel(titleDataFromDB, imageUrl, updateFields);
        } else if (imageUrl && titleDataFromDB.posters.length === 1 && (!titleDataFromDB.poster_s3 || titleDataFromDB.poster_s3.originalUrl !== imageUrl)) {
            await uploadTitlePosterAndAddToTitleModel(titleDataFromDB, imageUrl, updateFields, true);
        }

        if (titleDataFromDB.poster_wide_s3 === null) {
            let kitsuApiData = await getKitsuApiData(titleDataFromDB.title, titleDataFromDB.year, titleDataFromDB.type, titleDataFromDB.apiIds.kitsuID);
            if (kitsuApiData) {
                let kitsuApiFields = getKitsuApiFields(kitsuApiData);
                if (kitsuApiFields && kitsuApiFields.kitsuPosterCover) {
                    let s3WidePoster = await uploadTitlePosterToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, kitsuApiFields.kitsuPosterCover, false, true);
                    if (s3WidePoster) {
                        titleDataFromDB.poster_wide_s3 = s3WidePoster;
                        updateFields.poster_wide_s3 = s3WidePoster;
                    }
                }
            }
        }

        if (checkNeedTrailerUpload(titleDataFromDB.trailer_s3, titleDataFromDB.trailers)) {
            await uploadTitleYoutubeTrailerAndAddToTitleModel("", titleDataFromDB, semiJikanData.trailer.url, updateFields);
        }

        if (titleDataFromDB.castUpdateDate === 0) {
            let allApiData = {
                jikanApiFields: jikanApiFields || {
                    jikanID: titleDataFromDB.apiIds.jikanID,
                },
            };
            await addStaffAndCharacters("", titleDataFromDB._id, allApiData, titleDataFromDB.castUpdateDate);
            updateFields.castUpdateDate = new Date();
        }

        await crawlerMethodsDB.updateMovieByIdDB(titleDataFromDB._id, updateFields);
    } catch (error) {
        saveError(error);
    }
}

async function insert_comingSoon_topAiring_Title(semiJikanData, mode, rank) {
    let type = semiJikanData.type === 'Movie' ? 'anime_movie' : 'anime_serial';
    let title = utils.replaceSpecialCharacters((semiJikanData.title || semiJikanData.titles?.find(t => t.type === 'Default')?.title).toLowerCase());
    let jikanApiData = await getJikanApiData(title, '', type, semiJikanData.mal_id);

    if (jikanApiData) {
        let titleModel = getMovieModel(
            jikanApiData.titleObj, '', type, [], [],
            '', '', '', '',
            [], [], [],
            {
                poster: '',
                trailer: '',
            }
        );

        let jikanApiFields = getJikanApiFields(jikanApiData);
        if (jikanApiFields) {
            titleModel = {...titleModel, ...jikanApiFields.updateFields};
            titleModel.status = jikanApiFields.status;
            if (config.ignoreHentai && jikanApiFields.updateFields.rated === 'Rx - Hentai') {
                return 'ignore hentai';
            }
            if (titleModel.apiIds.jikanID !== jikanApiFields.jikanID) {
                titleModel.apiIds.jikanID = jikanApiFields.jikanID;
            }
        }

        let imageUrl = getImageUrl(jikanApiData);
        await uploadTitlePosterAndAddToTitleModel(titleModel, imageUrl);
        await uploadTitleYoutubeTrailerAndAddToTitleModel("", titleModel, jikanApiData.trailer.url);

        titleModel.insert_date = 0;
        titleModel.apiUpdateDate = 0;
        if (mode === 'comingSoon' || mode === 'animeSeasonUpcoming') {
            titleModel.releaseState = 'comingSoon';
        } else {
            titleModel.releaseState = 'waiting';
        }
        titleModel.tempRank_anime = rank;
        titleModel.movieLang = 'japanese';
        titleModel.country = 'japan';
        titleModel.endYear = jikanApiFields.endYear;
        titleModel.rating.myAnimeList = jikanApiFields.myAnimeListScore;
        titleModel.summary.english = jikanApiFields.summary_en.replace(/([.…])+$/, '');
        titleModel.summary.english_source = 'jikan';
        titleModel.genres = jikanApiFields.genres;

        let kitsuApiData = await getKitsuApiData(titleModel.title, titleModel.year, titleModel.type, titleModel.apiIds.kitsuID);
        if (kitsuApiData) {
            let kitsuApiFields = getKitsuApiFields(kitsuApiData);
            if (kitsuApiFields && kitsuApiFields.kitsuPosterCover) {
                let s3WidePoster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, kitsuApiFields.kitsuPosterCover, false, true);
                if (s3WidePoster) {
                    titleModel.poster_wide_s3 = s3WidePoster;
                }
            }
        }

        let insertedId = await crawlerMethodsDB.insertMovieToDB(titleModel);

        if (insertedId && jikanApiFields) {
            let allApiData = {
                jikanApiFields,
            };
            await handleAnimeRelatedTitles(insertedId, jikanApiFields.jikanRelatedTitles);
            await addStaffAndCharacters("", insertedId, allApiData, titleModel.castUpdateDate);
            await crawlerMethodsDB.updateMovieByIdDB(insertedId, {
                castUpdateDate: new Date(),
            });
        }
    }
}

export async function handleAnimeRelatedTitles(titleId, jikanRelatedTitles) {
    try {
        for (let i = 0; i < jikanRelatedTitles.length; i++) {
            let searchResult = await crawlerMethodsDB.searchOnMovieCollectionDB(
                {"apiIds.jikanID": jikanRelatedTitles[i].jikanID},
                {_id: 1}
            );

            if (searchResult) {
                await moviesDbMethods.addRelatedMovies(searchResult._id, titleId, jikanRelatedTitles[i].relation);
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function getImageUrl(jikanData) {
    let images = [
        jikanData.images?.webp?.large_image_url,
        jikanData.images?.jpg?.large_image_url,
        jikanData.images?.webp?.image_url,
        jikanData.images?.jpg?.image_url,
        jikanData.images?.webp?.small_image_url,
        jikanData.images?.jpg?.small_image_url,
    ];
    for (let i = 0; i < images.length; i++) {
        if (images[i] && !images[i].includes('/icon/')) {
            return images[i];
        }
    }
    return '';
}
