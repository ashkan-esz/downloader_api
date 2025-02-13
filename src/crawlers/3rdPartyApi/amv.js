import axios from "axios";
import * as utils from "../utils/utils.js";
import {saveError} from "../../error/saveError.js";
import {getCrawlerWarningMessages} from "../status/crawlerWarnings.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";
import {getFixedSummary} from "../extractors/utils.js";

const rateLimitConfig = {
    minuteLimit: 290, //300
    minute: new Date().getMinutes(),
    minute_call: 0,
};

export async function getAmvApiData(title, alternateTitles, year, type, amvID) {
    try {
        //TODO : remove this? or self-host
        return null;

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

        if (amvID) {
            let animeUrl = "https://api.amvstr.me/api/v2/info/" + amvID;
            let fullData = await handleApiCall(animeUrl);
            if (fullData) {
                addTitleObjToAmvData(fullData, year);
                if (checkTitle(title, alternateTitles, year, fullData)) {
                    return fullData;
                }
            }
        }

        const url = `https://api.amvstr.me/api/v2/search?q=${decodeURIComponent(title)}&p=1&limit=20`;
        let searchResult = await handleApiCall(url);
        if (!searchResult || !searchResult.results) {
            return null;
        }
        searchResult = searchResult.results;

        if (!year && searchResult.length > 1) {
            return null;
        }

        for (let i = 0; i < searchResult.length; i++) {
            if (
                (type.includes('serial') && searchResult[i].format?.toLowerCase() === 'movie') ||
                (type.includes('movie') && searchResult[i].episodes > 1) ||
                (searchResult[i].format?.toLowerCase() === 'music') ||
                (!searchResult[i].seasonYear)
            ) {
                continue;
            }

            if (year) {
                let apiYear = Number(searchResult[i].seasonYear.toString().split('-')[0]);
                if (Math.abs(apiYear - Number(year)) > 1) {
                    continue;
                }
            }

            addTitleObjToAmvData(searchResult[i], year);
            if (checkTitle(title, alternateTitles, year, searchResult[i])) {
                // return searchResult[i];
                let animeUrl = "https://api.amvstr.me/api/v2/info/" + searchResult[i].id;
                let fullData = await handleApiCall(animeUrl);
                if (fullData) {
                    addTitleObjToAmvData(fullData, year);
                    if (checkTitle(title, alternateTitles, year, fullData)) {
                        return fullData;
                    }
                }
            }
        }
        return null;
    } catch (error) {
        saveError(error);
        return null;
    }
}

function checkTitle(title, alternateTitles, year, apiData) {
    alternateTitles = alternateTitles.map(value => utils.replaceSpecialCharacters(value.toLowerCase()).replace('uu', 'u'));
    return (
        normalizeText(title) === normalizeText(apiData.titleObj.title) ||
        normalizeSeasonText(title) === normalizeSeasonText(apiData.titleObj.title) ||
        alternateTitles.includes(apiData.titleObj.title.replace('uu', 'u')) ||
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

function addTitleObjToAmvData(apiData, year) {
    const yearRegex = new RegExp(` \\(?${year}\\)?\$`);
    let titleObj = {
        title: utils.replaceSpecialCharacters(apiData.title?.userPreferred?.toLowerCase() || "").replace(yearRegex, '').replace(/\stv$/i, ''),
        rawTitle: (apiData.title?.userPreferred || "").replace(/^["']|["']$/g, '')
            .replace(/volume \d/i, (res) => res.replace('Volume', 'Vol'))
            .replace(/!+/g, '!')
            .replace(yearRegex, '')
            .replace(/\stv$/i, ''),
        alternateTitles: [],
        titleSynonyms: [],
    }
    let temp = utils.removeDuplicateElements(
        [apiData.title?.userPreferred, apiData.title?.romaji, apiData.title?.english, apiData.title?.native]
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

export function getAmvApiFields(data) {
    try {
        let apiFields = {
            titleObj: data.titleObj,
            amvID: Number(data.id),
            jikanID: Number(data.idMal),
            gogoID: data.id_provider?.idGogo || "",
            summary_en: getFixedSummary(data.description),
            status: data.status.toLowerCase()
                .replace('finished', 'ended')
                .replace('current', 'running')
                .replace('unreleased', 'running')
                .replace('releasing', 'running')
                .replace('tba', 'to be determined'),
            youtubeTrailer: (data.trailer?.id && data.trailer?.site === "youtube") ? `https://www.youtube.com/watch?v=${data.trailer.id}` : '',
            amvPoster: getImageUrl(data.coverImage),
            amvPosterCover: data.bannerImage || "",
            endYear: data.endIn?.year?.toString() || '',
            premiered: data.startIn.year?.toString() || '',
            year: data.year?.toString() || '',
            animeType: data.format?.toLowerCase() || '',
            duration: data.duration ? data.duration + ' min' : '',
            totalDuration: data.duration ? data.duration + ' min' : '',
            officialSite: data.siteUrl || "",
            animeSeason: data.season?.toLowerCase() || "",
            genres: data.genres?.map(item => item.toLowerCase().trim()
                .replace(/\s+/g, '-')
                .replace('sports', 'sport'))
                .filter(item => item !== 'n/a' && item !== 'anime') || [],
        };
        if (apiFields.duration === '0 min' && apiFields.animeType.toLowerCase() === 'tv') {
            apiFields.duration = '24 min';
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
        imageData.extraLarge,
        imageData.large,
        imageData.original,
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

export async function getGogoDownloadLink(gogoID, episodeNumber) {
    try {
        // sample: https://api.amvstr.me/api/v1/download/ore-dake-level-up-na-ken-episode-1
        let url = `https://api.amvstr.me/api/v1/download/${gogoID}-episode-${episodeNumber}`;
        let data = await handleApiCall(url);
        return data?.download || "";
    } catch (error) {
        saveError(error);
        return "";
    }
}

export async function getGogoOnlineLink(gogoID, nineAnimeID, episodeNumber) {
    try {
        // sample: https://api.amvstr.me/api/v2/stream/ore-dake-level-up-na-ken-episode-1
        let url = `https://api.amvstr.me/api/v2/stream/${gogoID}-episode-${episodeNumber}`;
        let data = await handleApiCall(url);
        if (!data) {
            return null
        }
        return {
            stream: data.stream,
            iframe: data.iframe,
            plyr: data.plyr,
            nspl: data.nspl,
            otherSources: {
                marin: `https://marinn.me/watch/${gogoID}-episode-${episodeNumber}`,
                zoroxtv: `https://zoroxtv.to/watch/${nineAnimeID}/ep-${episodeNumber}`,
                ryuk: `https://ryuk.to/watch/${gogoID}-episode-${episodeNumber}`,
                anitaku: `https://anitaku.so/${gogoID}-episode-${episodeNumber}`,
            },
        }
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function handleApiCall(url) {
    let waitCounter = 0;
    while (waitCounter < 12) {
        try {
            await handleRateLimits();
            let response = await axios.get(url, {timeout: 20000});
            if (response.data?.code === 500) {
                waitCounter++;
                await new Promise((resolve => setTimeout(resolve, 3000)));
                continue;
            }
            if (response.data?.code === 404) {
                return null;
            }
            // special cases like maintenance mode?
            if (typeof response.data == "string") {
                return null;
            }
            return response.data;
        } catch (error) {
            if (error.message === 'timeout of 20000ms exceeded') {
                return null;
            }
            if (error.response && error.response.status === 429) {
                //too much request
                waitCounter++;
                await new Promise((resolve => setTimeout(resolve, 3000)));
            } else if (error.response?.status === 500 || error.response?.status === 504) {
                waitCounter += 3;
                await new Promise((resolve => setTimeout(resolve, 3000)));
            } else if (error.code === 'EAI_AGAIN') {
                const warningMessages = getCrawlerWarningMessages('');
                await saveCrawlerWarning(warningMessages.apiCalls.amv.eaiError);
                return null;
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
    await saveCrawlerWarning(getCrawlerWarningMessages().apiCalls.amv.lotsOfApiCall);
    return null;
}

async function handleRateLimits() {
    while (true) {
        let now = new Date();
        let minute = now.getMinutes();
        if (rateLimitConfig.minute !== minute) {
            rateLimitConfig.minute = minute;
            rateLimitConfig.minute_call = 0;
        }

        if (rateLimitConfig.minute_call < rateLimitConfig.minuteLimit) {
            rateLimitConfig.minute_call++;
            break;
        }
        await new Promise((resolve => setTimeout(resolve, 100)));
    }
}