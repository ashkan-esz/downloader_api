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

    let animeSearchUrl = `https://api.jikan.moe/v3/search/anime?q=${title}&limit=7`;
    let data = await handleApiCall(animeSearchUrl);
    if (!data) {
        return null;
    }

    for (let i = 0; i < data.results.length && i <= 6; i++) {
        let animeUrl = `https://api.jikan.moe/v3/anime/${data.results[i].mal_id}`;
        let fullData = await handleApiCall(animeUrl);
        if (!fullData || (fullData.duration && fullData.duration === "1 min per ep")) {
            continue;
        }
        let jikanID = fullData.mal_id;

        let allTitles = getTitlesFromData(title, fullData);

        title = title.replace(' the', '').replace('memories', 'memory').replace('tv', '').trim();
        allTitles.apiTitle_simple = allTitles.apiTitle_simple.replace(' the', '').replace('memories', 'memory').replace('tv', '').trim();
        allTitles.apiTitle = allTitles.apiTitle.replace('(TV)', '');
        allTitles.apiTitleEnglish_simple = allTitles.apiTitleEnglish_simple.replace(' the', '').replace('memories', 'memory');

        if (checkTitle(title, type, allTitles, fullData)) {
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

function checkTitle(title, type, allTitles, fullData) {
    let {
        apiTitle, apiTitle_simple,
        apiTitleEnglish, apiTitleEnglish_simple,
        apiTitleJapanese, titleSynonyms,
        splitTitle, splitApiTitle
    } = allTitles;

    let typeAndEpisodes = checkTypeEpisodes(type, fullData.episodes, fullData.aired.from);
    let title_movieNumber = title.match(/\d/g);
    title_movieNumber = title_movieNumber && title_movieNumber[0];
    let apiTitle_simple_movieNumber = allTitles.apiTitle_simple.match(/\d/g);
    apiTitle_simple_movieNumber = apiTitle_simple_movieNumber && apiTitle_simple_movieNumber[0];

    // console.log(title); //todo : remove
    // console.log(apiTitle_simple)
    // console.log(title_movieNumber,' | ',apiTitle_simple_movieNumber)
    // console.log(title_movieNumber === apiTitle_simple_movieNumber)
    // console.log(apiTitle)
    // console.log(apiTitleEnglish_simple)
    // console.log(apiTitleEnglish)
    // console.log()

    return (
        title.replace(/\s/g, '') === apiTitle_simple.replace(/\s/g, '') ||
        title.replace(/\s/g, '') === apiTitle_simple.replace(/\s/g, '')
            .replace('uu', 'u').replace(/[^\d]$/g, '') ||
        title === apiTitle_simple ||
        title === apiTitleEnglish_simple ||
        title === apiTitleJapanese ||
        checkEqualTitleWithEdit(title, apiTitle_simple) ||
        titleSynonyms.includes(title) ||

        (
            splitTitle.length !== 2 &&
            typeAndEpisodes &&
            title.includes('movie') === apiTitle_simple.includes('movie') &&
            !title.includes('season') && !apiTitle_simple.includes('season') &&
            title_movieNumber === apiTitle_simple_movieNumber &&
            apiTitle_simple.includes(title)
        ) ||

        (
            splitTitle.length > 6 &&
            typeAndEpisodes &&
            (
                (splitTitle.length > splitApiTitle.length && title.includes(apiTitle_simple)) ||
                title === apiTitleEnglish_simple.replace(/\s\d/g, '') ||
                title === apiTitleEnglish_simple.replace(' i ', ' ')
            )
        ) ||

        (
            splitTitle.length > 4 &&
            typeAndEpisodes &&
            (
                apiTitle_simple.includes(title.replace(/\sova/g, '')) ||
                apiTitleEnglish_simple.includes(title.replace(/\sova/g, '')) ||
                title.replace(/\sova \d+/g, '') === apiTitleEnglish_simple ||
                title.replace(/\sova \d+|.$/g, '') === apiTitleEnglish_simple
            )
        ) ||

        (
            splitTitle.length > 3 &&
            !apiTitle_simple.includes(title) &&
            checkPartsExist(splitTitle, apiTitle_simple)
        )
    );
}

export function getJikanApiFields(data) {
    //todo : maybe cast/writer/director overwrite from omdb api
    try {
        //todo : add characters_staff

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
                duration: data.duration === "Unknown" ? '' : convertHourToMinute(data.duration.replace('per ep', '').trim()),
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
    while (waitCounter < 35) {
        try {
            let response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
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

    let splitTitle = title.split(' ');
    let splitApiTitle = apiTitle_simple.split(' ');

    let splitApiTitle_lastPart = splitApiTitle[splitApiTitle.length - 1];
    if (!isNaN(splitApiTitle_lastPart) && Number(splitApiTitle_lastPart) > 2000) {
        let number = splitApiTitle.pop();
        apiTitle_simple = splitApiTitle.join(' ');
        apiTitle = apiTitle.replace(`(${number})`, '').trim();
        apiTitle = apiTitle.replace(number, '').trim();
    }

    return {
        apiTitle,
        apiTitle_simple,
        apiTitleEnglish,
        apiTitleEnglish_simple,
        apiTitleJapanese,
        titleSynonyms,
        splitTitle,
        splitApiTitle
    };
}

function checkEqualTitleWithEdit(title, apiTitle) {
    let case1 = title.replace(' no ', ' wo ');
    let case2 = case1.replace('yarinaosu', 'yarinaoshi');
    let case3 = case2.replace(' hero', ' hirou');
    let case4 = case3.replace(' wa ', ' no ');
    let case5 = case4.replace('go ', '5 ');
    return (
        case1 === apiTitle ||
        case2 === apiTitle ||
        case3 === apiTitle ||
        case4 === apiTitle ||
        case5 === apiTitle
    );
}

function checkTypeEpisodes(type, episodes, apiStartDate) {
    let now = new Date();
    let startDate = new Date(apiStartDate);
    let daysBetween = (now.getTime() - startDate.getTime()) / (24 * 3600 * 1000);
    return (
        ((type.includes('movie')) && (episodes === 1)) ||
        ((type.includes('serial')) && (episodes > 1 || daysBetween < 10))
    );
}

function checkPartsExist(splitTitle, apiTitle) {
    let hasAllPart = true;
    let matchCounter = 0;
    let notMatchIndex = -1;
    for (let j = 0; j < splitTitle.length; j++) {
        if (!apiTitle.includes(splitTitle[j])) {
            hasAllPart = false;
            notMatchIndex = j;
        } else {
            matchCounter++;
        }
    }
    return (
        hasAllPart ||
        ((splitTitle.length === matchCounter + 1) &&
            !splitTitle[notMatchIndex].match(/\d/g) &&
            !splitTitle[notMatchIndex].includes('season') &&
            !splitTitle[notMatchIndex].includes('ova'))
    );
}
