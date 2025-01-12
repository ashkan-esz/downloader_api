import axios from "axios";
import {saveError} from "../../error/saveError.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "../status/crawlerWarnings.js";
import {getFixedSummary} from "../extractors/utils.js";
import * as utils from "../utils/utils.js";


export async function getKitsuApiData(title, year, type, kitsuID) {
    try {
        let yearMatch = title.match(/\(?\d\d\d\d\)?/g);
        yearMatch = yearMatch ? yearMatch.pop() : null;
        if (yearMatch && !year && Number(yearMatch) < 3000) {
            title = title.replace(yearMatch, '').trim();
            year = yearMatch;
        }

        title = title.toLowerCase()
            .replace(' all seasons', '')
            .replace(' all', '')
            .replace(' full episodes', '');
        title = utils.replaceSpecialCharacters(title);

        if (kitsuID) {
            let animeUrl = "https://kitsu.io/api/edge/anime/" + kitsuID;
            let fullData = await handleApiCall(animeUrl);
            if (fullData) {
                fullData = fullData.data;
                if (fullData) {
                    addTitleObjToKitsuData(fullData, year);
                    if (checkTitle(title, year, type, fullData)) {
                        return fullData;
                    }
                }
            }
        }

        const url = `https://kitsu.io/api/edge/anime?filter[text]=${decodeURIComponent(title)}`;
        let searchResult = await handleApiCall(url);
        if (!searchResult || !searchResult.data) {
            return null;
        }
        searchResult = searchResult.data;

        if (!year && searchResult.length > 1) {
            return null;
        }

        for (let i = 0; i < searchResult.length; i++) {
            if (
                (
                    type.includes('serial') &&
                    year && searchResult[i].attributes?.startDate?.split('-')[0] !== year &&
                    Number(searchResult[i].attributes.episodeCount) === 0
                ) ||
                (type.includes('serial') && searchResult[i].attributes.subtype === 'movie') ||
                (type.includes('movie') && Number(searchResult[i].attributes.episodeCount) > 1) ||
                (searchResult[i].attributes.subtype === 'music')
            ) {
                continue;
            }

            //check year
            if (!searchResult[i].attributes.startDate) {
                continue;
            }
            if (year) {
                let apiYear = Number(searchResult[i].attributes.startDate.split('-')[0]);
                if (Math.abs(apiYear - Number(year)) > 1) {
                    continue;
                }
            }

            if (searchResult[i]) {
                addTitleObjToKitsuData(searchResult[i], year);
                if (checkTitle(title, year, type, searchResult[i])) {
                    return searchResult[i];
                }
            }
        }
        return null;
    } catch (error) {
        saveError(error);
        return null;
    }
}

function checkTitle(title, year, type, apiData) {
    return (
        normalizeText(title) === normalizeText(apiData.titleObj.title) ||
        (type.includes('movie') && normalizeText(title.replace(/\spart\s\d+/, '')) === normalizeText(apiData.titleObj.title.replace(/\spart\s\d+/, ''))) ||
        normalizeSeasonText(title) === normalizeSeasonText(apiData.titleObj.title) ||
        title === apiData.attributes.slug.replace(/-/g, ' ') ||
        apiData.titleObj.alternateTitles.includes(title) ||
        apiData.titleObj.alternateTitles.map(item => item.toLowerCase().replace(/:/g, '').replace(/-/g, ' ')).includes(title) ||
        apiData.titleObj.alternateTitles.map(item => item.toLowerCase().replace(/:/g, '').replace(/-/g, ' ')).includes(title.replace('3rd season', '3')) ||
        apiData.titleObj.alternateTitles.map(item => utils.replaceSpecialCharacters(item)).includes(title) ||
        apiData.titleObj.alternateTitles.some(item => normalizeText(item) === normalizeText(title)) ||
        apiData.titleObj.titleSynonyms.includes(title) ||
        apiData.titleObj.rawTitle.toLowerCase().includes("\"" + title + "\"")
    );
}

function normalizeText(text) {
    return utils.replaceSpecialCharacters(text)
        .replace(' movie', '')
        .replace('chapter', 'movie')
        .replace('specials', 'ova')
        .replace(/\sthe animation(\s\d+)?$/, '')
        .replace(/tv|the|precent|will|\s+/g, '')
        .replace(/volume \d/, (res) => res.replace('volume', 'vol'))
        .replace(/[ck]/g, 'c')
        .replace(/wo|ou/g, 'o')
        .replace(/ai|an/g, 'a')
        .trim()
}

function normalizeSeasonText(text) {
    return text
        .replace('2nd season', '2').replace('2nd attack', '2').replace('zoku hen', 'season 2')
        .replace('3rd season', '3').replace('season 3', '3')
        .replace(/\dth season/, r => r.replace('th season', '')).replace(/season \d/, r => r.replace('season ', ''))
        .replace(/[ck]/g, 'c');
}

function addTitleObjToKitsuData(apiData, year) {
    const yearRegex = new RegExp(` \\(?${year}\\)?\$`);
    let titleObj = {
        title: utils.replaceSpecialCharacters(apiData.attributes.canonicalTitle.toLowerCase()).replace(yearRegex, ''),
        rawTitle: apiData.attributes.canonicalTitle.replace(/^["']|["']$/g, '').replace(/volume \d/i, (res) => res.replace('Volume', 'Vol')).replace(/!+/g, '!').replace(yearRegex, ''),
        alternateTitles: [],
        titleSynonyms: [],
    }
    let temp = utils.removeDuplicateElements(
        [apiData.attributes.titles.en, apiData.attributes.titles.en_jp, apiData.attributes.canonicalTitle, ...apiData.attributes.abbreviatedTitles]
            .filter(Boolean)
            .filter(item => item !== titleObj.title && item !== titleObj.rawTitle)
            .map(value => value.toLowerCase()
                .replace(/^["'“]|["'”]$/g, '')
                .replace('\\r\\n', '')
                .replace(/!+/g, '!')
                .replace(yearRegex, '')
            )
    );
    if (temp.length > 1 && temp[1].includes(temp[0].replace('.', '')) && temp[1].match(/(\dth|2nd|3rd) season/gi)) {
        temp.shift();
    }
    titleObj.alternateTitles = temp;
    apiData.titleObj = titleObj;
    return titleObj;
}

export function getKitsuApiFields(data) {
    try {
        let apiFields = {
            titleObj: data.titleObj,
            kitsuID: Number(data.id),
            summary_en: getFixedSummary(data.attributes.synopsis),
            status: data.attributes.status.toLowerCase()
                .replace('finished', 'ended')
                .replace('current', 'running')
                .replace('unreleased', 'running')
                .replace('releasing', 'running')
                .replace('tba', 'to be determined'),
            endYear: data.attributes.endDate?.split('-')[0] || '',
            youtubeTrailer: data.attributes.youtubeVideoId ? `https://www.youtube.com/watch?v=${data.attributes.youtubeVideoId}` : '',
            rated: data.attributes.ageRating
                ? (data.attributes.ageRatingGuide ? (data.attributes.ageRating + ' - ' + data.attributes.ageRatingGuide) : data.attributes.ageRating)
                : '',
            kitsuPoster: getImageUrl(data.attributes.posterImage),
            kitsuPosterCover: getImageUrl(data.attributes.coverImage),
            premiered: data.attributes.startDate?.split('-')[0] || '',
            year: data.attributes.startDate?.split('-')[0] || '',
            animeType: data.attributes.subtype || '',
            duration: data.attributes.episodeLength ? data.attributes.episodeLength + ' min' : '',
            totalDuration: data.attributes.totalLength ? data.attributes.totalLength + ' min' : '',
        };
        if (apiFields.duration === '0 min' && apiFields.animeType.toLowerCase() === 'tv') {
            apiFields.duration = '24 min';
        }
        apiFields.rated = apiFields.rated
            .replace('PG -', 'PG-13 -')
            .replace('R - Violence', 'R - 17+ (violence & profanity)')
            .replace(', Profanity', '');
        if (apiFields.rated === 'PG' || apiFields.rated === 'PG-13 - Children') {
            apiFields.rated = 'PG-13 - Teens 13 or older';
        }
        if (apiFields.rated === 'R') {
            apiFields.rated = 'R - 17+ (violence & profanity)';
        }
        apiFields.animeType = apiFields.animeType.replace('movie', '').replace('special', 'Special');
        return apiFields;
    } catch (error) {
        saveError(error);
        return null;
    }
}

function getImageUrl(imageData) {
    if (!imageData) {
        return '';
    }
    let images = [
        imageData.original,
        imageData.large,
        imageData.medium,
        imageData.small,
        imageData.tiny,
    ];
    for (let i = 0; i < images.length; i++) {
        if (images[i] && !images[i].includes('/icon/')) {
            return images[i];
        }
    }
    return '';
}

async function handleApiCall(url) {
    let waitCounter = 0;
    while (waitCounter < 12) {
        try {
            let response = await axios.get(url, {timeout: 20000});
            return response.data;
        } catch (error) {
            if (error.message === 'timeout of 20000ms exceeded') {
                return null;
            }
            if (error.response?.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
                waitCounter++;
            } else if (error.response?.status === 500 && waitCounter < 2) {
                // failure from kitsu server
                await new Promise((resolve => setTimeout(resolve, 3000)));
                waitCounter++;
            } else if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                error.isAxiosError = true;
                error.url = url;
                await saveError(error);
                return null;
            } else {
                if (error.response && error.response.status !== 404 && error.response.status !== 503) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    await saveCrawlerWarning(getCrawlerWarningMessages().apiCalls.kitsu.lotsOfApiCall);
    return null;
}
