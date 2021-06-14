const axios = require('axios').default;
const {replaceSpecialCharacters, convertHourToMinute, purgeObjFalsyValues} = require("../utils");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');


let jikanApiCache = [];
let jikanCacheStartDate = new Date();


export function resetJikanApiCache(now) {
    let hoursBetween = (now.getTime() - jikanCacheStartDate.getTime()) / (3600 * 1000);
    if (hoursBetween > 4) {
        jikanApiCache = [];
        jikanCacheStartDate = now;
    }
}

function getFromJikanApiCache(title, rawTitle, type) {
    for (let i = 0; i < jikanApiCache.length; i++) {
        if (
            jikanApiCache[i].type === type &&
            (
                jikanApiCache[i].siteTitle === title ||
                jikanApiCache[i].apiTitle === title ||
                jikanApiCache[i].apiTitle === rawTitle ||
                jikanApiCache[i].apiTitle_simple === title ||
                jikanApiCache[i].apiTitleEnglish === title ||
                jikanApiCache[i].apiTitleEnglish_simple === title ||
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
    let jikanCacheResult = getFromJikanApiCache(title, rawTitle, type);
    if (jikanCacheResult || fromCacheOnly) {
        return jikanCacheResult;
    }

    let waitCounter = 0;
    while (waitCounter < 20) {
        try {
            let response = await axios.get(`https://api.jikan.moe/v3/search/anime?q=${title}&limit=8`);
            let data = response.data;
            for (let i = 0; i < data.results.length && i <= 6; i++) {
                let fullData = await getJikanApiFullData(data.results[i].mal_id, '');
                if (!fullData || (fullData.duration && fullData.duration === "1 min per ep")) {
                    continue;
                }
                let jikanID = fullData.mal_id;

                let {
                    apiTitle, apiTitle_simple,
                    apiTitleEnglish, apiTitleEnglish_simple,
                    apiTitleJapanese, titleSynonyms,
                    splitTitle, splitApiTitle
                } = getTitlesFromData(title, fullData);

                title = title.replace(' the', '').replace('memories', 'memory').replace('tv', '').trim();
                apiTitle_simple = apiTitle_simple.replace(' the', '').replace('memories', 'memory').replace('tv', '').trim();
                apiTitle = apiTitle.replace('(TV)','');
                apiTitleEnglish_simple = apiTitleEnglish_simple.replace(' the', '').replace('memories', 'memory');

                let typeAndEpisodes = checkTypeEpisodes(type, fullData.episodes, fullData.aired.from);
                let title_movieNumber = title.match(/\d/g);
                title_movieNumber = title_movieNumber && title_movieNumber[0];
                let apiTitle_simple_movieNumber = apiTitle_simple.match(/\d/g);
                apiTitle_simple_movieNumber = apiTitle_simple_movieNumber && apiTitle_simple_movieNumber[0];

                // console.log(title); //todo : remove
                // console.log(apiTitle_simple)
                // console.log(title_movieNumber,' | ',apiTitle_simple_movieNumber)
                // console.log(title_movieNumber === apiTitle_simple_movieNumber)
                // console.log(apiTitle)
                // console.log(apiTitleEnglish_simple)
                // console.log(apiTitleEnglish)
                // console.log()

                if (
                    title.replace(/\s/g, '') === apiTitle_simple.replace(/\s/g, '') ||
                    title.replace(/\s/g, '') === apiTitle_simple.replace(/\s/g, '').replace('uu', 'u').replace(/[^\d]$/g, '') ||
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
                ) {
                    let apiData = await saveJikanApiData(title, type, apiTitle_simple, apiTitle, apiTitleEnglish, apiTitleJapanese, titleSynonyms, fullData, jikanID);
                    jikanApiCache.push(apiData);
                    return apiData;
                }
            }

            return null;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1500)));
                waitCounter++;
            } else {
                if (error.response && error.response.status !== 404) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    await Sentry.captureMessage('lots of jikan api 1 call');
    return null;
}

export function getJikanApiFields(data) {
    //todo : maybe cast/writer/director overwrite from omdb api
    try {
        //todo : add characters_staff

        let apiFields = {
            relatedTitles: getRelatedTitles(data),
            summary_en: data.synopsis || '',
            genres: data.genres.map(item => item.name.toLowerCase()) || [],
            status: data.status.toLowerCase().includes('finished') ? 'ended' : 'running',
            endYear: data.aired.to ? data.aired.to.split('T')[0] || '' : '',
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
            jikanID: item.mal_id,
            id: '',
            title: replaceSpecialCharacters(item.name.toLowerCase()),
        });
    });
}

async function saveJikanApiData(title, type, apiTitle_simple, apiTitle, apiTitleEnglish, apiTitleJapanese, titleSynonyms, fullData, jikanID) {
    delete fullData.title;
    delete fullData.title_english;
    delete fullData.title_japanese;
    delete fullData.title_synonyms;
    delete fullData.mal_id;
    // let characters_staff = await getJikanApiFullData(jikanID, '/characters_staff');
    let apiData = {
        ...fullData,
        jikanID: jikanID,
        siteTitle: title,
        type: type,
        apiTitle_simple: apiTitle_simple,
        apiTitle: apiTitle,
        apiTitleEnglish: apiTitleEnglish,
        apiTitleJapanese: apiTitleJapanese,
        titleSynonyms: titleSynonyms,
        //todo : add characters_staff
        characters_staff: [],
    };
    jikanApiCache.push(apiData);
    return apiData;
}

export async function getJikanApiFullData(jikanId, request) {
    let waitCounter = 0;
    while (waitCounter < 20) {
        try {
            let url = `https://api.jikan.moe/v3/anime/${jikanId}` + request;
            let response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1500)));
                waitCounter++;
            } else {
                if (error.response && error.response.status !== 404) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    await Sentry.captureMessage(`lots of jikan api 2 ${request} call`);
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
        ((type === 'anime_movie') && (episodes === 1)) ||
        ((type === 'anime_serial') && (episodes > 1 || daysBetween < 10))
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
