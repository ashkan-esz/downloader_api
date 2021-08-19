const axios = require('axios').default;
const {replaceSpecialCharacters, convertHourToMinute, purgeObjFalsyValues} = require("../utils");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');


let jikanCacheStartDate = new Date();
let jikanApiCache404 = [];
let jikanApiCache = [];


export function resetJikanApiCache(now) {
    let hoursBetween = (now.getTime() - jikanCacheStartDate.getTime()) / (3600 * 1000);
    if (hoursBetween > 8) {
        jikanApiCache404 = [];
        jikanApiCache = [];
        jikanCacheStartDate = now;
    }
}

function getFromJikanApiCache404(title, rawTitle, type) {
    let editedTitle = title.toLowerCase()
        .replace(' the', '')
        .replace('memories', 'memory')
        .replace('tv', '')
        .trim();
    for (let i = 0; i < jikanApiCache404.length; i++) {
        if (jikanApiCache404[i].type === type &&
            jikanApiCache404[i].title.toLowerCase() === editedTitle) {
            return '404';
        }
    }
    return null;
}

function getFromJikanApiCache(title, rawTitle, type) {
    title = title.toLowerCase();
    rawTitle = rawTitle.toLowerCase();
    for (let i = 0; i < jikanApiCache.length; i++) {
        if (
            jikanApiCache[i].type.replace('anime_', '') === type.replace('anime_', '') &&
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

export async function getJikanApiData(title, rawTitle, type, fromCacheOnly = false) {
    let jikanCacheResult404 = getFromJikanApiCache404(title, rawTitle, type);
    if (jikanCacheResult404 === '404') {
        return null;
    }
    let jikanCacheResult = getFromJikanApiCache(title, rawTitle, type);
    if (jikanCacheResult || fromCacheOnly) {
        return jikanCacheResult;
    }

    let searchTitle = (title.match(/^\d+$/g) || title.length < 3) ? (' ' + title) : title;
    searchTitle = (searchTitle.length < 3) ? (' ' + searchTitle) : searchTitle;
    let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${searchTitle}&limit=10`;
    let data = await handleApiCall(animeSearchUrl);
    if (!data) {
        if (title.length === 2) {
            let searchTitle = title.split('').join('\'');
            let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${searchTitle}&limit=10`;
            data = await handleApiCall(animeSearchUrl);
            if (!data) {
                return null;
            }
        } else {
            return null;
        }
    }

    for (let i = 0; i < data.results.length; i++) {
        if (type.includes('movie') && Number(data.results[i].episodes) > 1) {
            continue;
        }

        let animeUrl = `https://api.jikan.moe/v3/anime/${data.results[i].mal_id}`;
        let fullData = await handleApiCall(animeUrl);
        if (!fullData) {
            continue;
        }
        let jikanID = fullData.mal_id;

        let allTitles = getTitlesFromData(title, fullData);

        if (checkTitle(title, type, allTitles)) {
            let apiData = await getJikanApiData_simple(title, type, allTitles, fullData, jikanID);
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
    //todo : maybe cast/writer/director overwrite from omdb api
    try {
        //todo : add characters_staff

        //todo : add field for ova-ona-...

        let apiFields = {
            jikanRelatedTitles: getRelatedTitles(data),
            summary_en: data.synopsis || '',
            genres: data.genres.map(item => item.name.toLowerCase()) || [],
            status: data.status.toLowerCase().includes('finished') ? 'ended' : 'running',
            endYear: data.aired.to ? data.aired.to.split('T')[0] || '' : '',
            myAnimeListScore: Number(data.score) || 0,
            updateFields: {
                jikanID: data.jikanID,
                rawTitle: data.apiTitle,
                premiered: data.aired.from ? data.aired.from.split('T')[0] : '',
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

function getRelatedTitles(data) {
    let temp = [];
    if (data.related.Prequel) {
        temp.push(...data.related.Prequel);
    }
    if (data.related.Sequel) {
        temp.push(...data.related.Sequel);
    }
    if (data.related['Side story']) {
        temp.push(...data.related['Side story']);
    }
    if (data.related['Parent story']) {
        temp.push(...data.related['Parent story']);
    }
    if (data.related['Spin-off']) {
        temp.push(...data.related['Spin-off']);
    }
    temp = temp.filter(item => item.type === 'anime');
    return temp.map(item => {
        return ({
            _id: '',
            jikanID: item.mal_id,
            title: replaceSpecialCharacters(item.name.toLowerCase()),
            rawTitle: item.name,
        });
    });
}

async function getJikanApiData_simple(title, type, allTitles, fullData, jikanID) {
    delete fullData.title;
    delete fullData.title_english;
    delete fullData.title_japanese;
    delete fullData.title_synonyms;
    delete fullData.mal_id;
    // let characters_staff = await getJikanApiFullData(jikanID, '/characters_staff');
    return {
        ...fullData,
        jikanID: jikanID,
        siteTitle: title,
        type: type,
        apiTitle_simple: allTitles.apiTitle_simple,
        apiTitle: allTitles.apiTitle,
        apiTitleEnglish: allTitles.apiTitleEnglish,
        apiTitleJapanese: allTitles.apiTitleJapanese,
        titleSynonyms: allTitles.titleSynonyms,
        //todo : add characters_staff
        characters_staff: [],
    };
}

async function handleApiCall(url) {
    let waitCounter = 0;
    while (waitCounter < 40) {
        try {
            let response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1100)));
                waitCounter++;
            } else {
                if (error.response && error.response.status !== 404) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    await Sentry.captureMessage(`lots of jikan api call: ${url}`);
    return null;
}

function getTitlesFromData(title, fullData) {
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
