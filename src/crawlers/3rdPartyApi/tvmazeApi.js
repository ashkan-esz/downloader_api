import axios from "axios";
import * as utils from "../utils/utils.js";
import {getEpisodeModel} from "../../models/episode.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "../status/crawlerWarnings.js";
import {saveError} from "../../error/saveError.js";
import {getFixedGenres, getFixedSummary} from "../extractors/utils.js";


export async function getTvMazeApiData(title, alternateTitles, titleSynonyms, imdbID, premiered, type, canReTry = true) {
    title = title.toLowerCase()
        .replace(' all seasons', '')
        .replace(/\sall$/, '')
        .replace(' full episodes', '');
    title = utils.replaceSpecialCharacters(title);
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${decodeURIComponent(title)}&embed[]=nextepisode&embed[]=episodes&embed[]=cast&embed[]=images`;
    let waitCounter = 0;
    while (waitCounter < 12) {
        try {
            let response = await axios.get(url);
            let data = response.data;
            let titleMatch = checkTitle(data, title, alternateTitles, titleSynonyms, imdbID, premiered);
            if (titleMatch) {
                return data;
            } else {
                return await getTvMazeApiData_multiSearches(title, alternateTitles, titleSynonyms, imdbID, premiered);
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
                waitCounter++;
            } else if (error.code === "EAI_AGAIN") {
                if (waitCounter > 6) {
                    return null;
                }
                await new Promise((resolve => setTimeout(resolve, 3000)));
                waitCounter += 3;
            } else if (error.response && error.response.status === 404) {
                if (type.includes('anime') && canReTry) {
                    let newTitle = getEditedTitle(title);
                    if (newTitle !== title) {
                        return await getTvMazeApiData(newTitle, alternateTitles, titleSynonyms, imdbID, premiered, type, false);
                    }
                }
                return null;
            } else {
                if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    error.isAxiosError = true;
                    error.url = url;
                }
                await saveError(error);
                return null;
            }
        }
    }
    await saveCrawlerWarning(getCrawlerWarningMessages().apiCalls.tvmaze.lotsOfApiCall);
    return null;
}

function getEditedTitle(title) {
    return title
        .replace('saenai heroine no sodatekata fine', 'saenai heroine no sodatekata')
        .replace('biohazard infinite darkness', 'resident evil infinite darkness')
        .replace(' wo ', ' o ')
        .replace(' the ', ' this ')
        .replace(' sotsu', '')
        .replace('brorhood', 'brotherhood')
        .replace(' zunousen', ' zuno sen')
        .replace(' kusoge', ' kusogee')
        .replace('summons', 'calls')
        .replace('dont', 'don\'t')
        .replace('wont', 'won\'t')
        .replace('heavens', 'heaven\'s')
        .replace('havent', 'haven\'t')
        .replace(' im ', ' i\'m ')
        .replace(' comedy', ' come')
        .replace(' renai ', ' ren\'ai ')
        .replace(/(?<=(^|\s))vol \d/, (res) => res.replace('vol', 'volume'));
}

async function getTvMazeApiData_multiSearches(title, alternateTitles, titleSynonyms, imdbID, premiered) {
    let multiSearcheUrl = `https://api.tvmaze.com/search/shows?q=${decodeURIComponent(title)}&embed[]=nextepisode&embed[]=episodes&embed[]=cast`;
    let data = await handleApiCall(multiSearcheUrl);
    if (!data) {
        return null;
    }
    for (let i = 0; i < data.length; i++) {
        let thisTitleData = data[i].show;
        if (checkTitle(thisTitleData, title, alternateTitles, titleSynonyms, imdbID, premiered)) {
            let titleUrl = `https://api.tvmaze.com/shows/${thisTitleData.id}?embed[]=nextepisode&embed[]=episodes&embed[]=cast&embed[]=images`;
            let titleData = await handleApiCall(titleUrl);
            if (titleData && checkTitle(titleData, title, alternateTitles, titleSynonyms, imdbID, premiered)) {
                return titleData;
            }
        }
    }

    if (data.length === 1) {
        let id = data[0]?.show?.id;
        if (id) {
            let url = `https://api.tvmaze.com/shows/${id}/akas`;
            let res = await handleApiCall(url);
            if (res) {
                for (let i = 0; i < res.length; i++) {
                    data[0].show.name = res[i].name;
                    if (checkTitle(data[0].show, title, alternateTitles, titleSynonyms, imdbID, premiered)) {
                        let titleUrl = `https://api.tvmaze.com/shows/${id}?embed[]=nextepisode&embed[]=episodes&embed[]=cast&embed[]=images`;
                        let titleData = await handleApiCall(titleUrl);
                        if (titleData) {
                            return titleData;
                        }
                    }
                }
            }
        }
    }

    return null;
}

export function getTvMazeApiFields(data) {
    try {
        let apiFields = {
            imdbID: data.externals.imdb || '',
            tvmazeID: Number(data.id) || 0,
            posters: (data._embedded.images || []).filter(item => item.type === 'poster'),
            backgroundPosters: (data._embedded.images || []).filter(item => item.type === 'background'),
            cast: data._embedded.cast || [],
            nextEpisode: getNextEpisode(data),
            episodes: getEpisodes(data),
            summary_en: getFixedSummary(data.summary),
            genres: getFixedGenres(data.genres),
            isAnimation: (data.type.toLowerCase() === 'animation'),
            isAnime: (data.genres?.includes('anime') || data.genres?.includes('Anime')),
            updateFields: {
                rawTitle: data.name.trim().replace(/^["']|["']$/g, '').replace(/volume \d/i, (res) => res.replace('Volume', 'Vol')),
                premiered: data.premiered || '',
                year: data.premiered ? data.premiered.split(/[-–]/g)[0] : '',
                duration: data.runtime ? data.runtime + ' min' :
                    data.averageRuntime ? data.averageRuntime + ' min' : '',
                status: data.status.toLowerCase(),
                movieLang: data.language ? data.language.toLowerCase() : '',
                releaseDay: data.schedule.days ? (data.schedule.days[0] || '').toLowerCase() : '',
                officialSite: data.officialSite || "",
                webChannel: data.webChannel ? data.webChannel.name || '' : '',
            },
        }
        if (!apiFields.releaseDay && apiFields.premiered) {
            let dayNumber = new Date(apiFields.premiered).getDay();
            apiFields.releaseDay = utils.getDayName(dayNumber);
        }
        apiFields.updateFields = utils.purgeObjFalsyValues(apiFields.updateFields);
        return apiFields;
    } catch (error) {
        saveError(error);
        return null;
    }
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
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
                waitCounter++;
            } else if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                error.isAxiosError = true;
                error.url = url;
                await saveError(error);
                return null;
            } else {
                if (error.response && error.response.status !== 404) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    await saveCrawlerWarning(getCrawlerWarningMessages().apiCalls.tvmaze.lotsOfApiCall);
    return null;
}

function checkTitle(data, title, alternateTitles, titleSynonyms, imdbID, premiered) {
    let titleYear = premiered.split('-')[0];
    if (titleYear && data.premiered && Math.abs(Number(titleYear) - Number(data.premiered.split(/[-–]/g)[0])) > 1) {
        return false;
    }
    let apiTitle = data.name.toLowerCase();
    let apiTitle_simple = utils.replaceSpecialCharacters(apiTitle);
    alternateTitles = alternateTitles.map(value => utils.replaceSpecialCharacters(value.toLowerCase()));
    titleSynonyms = titleSynonyms.map(value => utils.replaceSpecialCharacters(value.toLowerCase()));

    let specialCase1 = title.replace('cautious hero: the hero is overpowered but overly cautious', 'the hero is overpowered but overly cautious');
    let specialCase2 = title.replace('iya na kao sare nagara opantsu misete moraitai', 'i want you to make a disgusted face and show me your underwear');
    let specialCase3 = title.replace('nounai', 'nonai').replace('love comedy wo', 'rabu kome o');
    let specialCase4 = title.replace('bougyoryoku', 'bogyoryoku');

    title = title.replace(/volume \d/, (res) => res.replace('volume', 'vol'));
    apiTitle = apiTitle.replace(/volume \d/, (res) => res.replace('volume', 'vol'));

    return (
        imdbID && imdbID === data.externals.imdb ||
        normalizeText(title) === normalizeText(apiTitle) ||
        normalizeText(title) === normalizeText(apiTitle_simple) ||
        title.replace(' wo ', ' o ') === apiTitle_simple ||
        title.replace(/\swo$/, ' o') === apiTitle_simple ||
        specialCase4 === apiTitle_simple ||
        specialCase1 === apiTitle_simple ||
        specialCase2 === apiTitle_simple ||
        specialCase3 === apiTitle_simple ||
        alternateTitles.includes(apiTitle) ||
        alternateTitles.includes(apiTitle_simple) ||
        alternateTitles.includes(apiTitle_simple.replace('this', 'the')) ||
        titleSynonyms.includes(apiTitle) ||
        titleSynonyms.includes(apiTitle_simple) ||
        title.replace(/.$/, '') === apiTitle_simple ||
        title.replace(/..$/, '') === apiTitle_simple ||
        checkSpecialCases(title, apiTitle_simple)
    );
}

function checkSpecialCases(title, apiTitle_simple) {
    let lastWord = title.split(" ").pop();
    let temp = apiTitle_simple.split(" ");
    let words = temp.slice(temp.length - lastWord.length);
    return title === apiTitle_simple.replace(words.join(' '), words.map(w => w[0]).join(''));
}

function normalizeText(text) {
    return text
        .replace(' movie', '')
        .replace('specials', 'ova')
        .replace(/\sthe animation(\s\d+)?$/, '')
        .replace(/tv|the|precent|will|\s+/g, '')
        .replace(/volume \d/, (res) => res.replace('volume', 'vol'))
        .replace(/[ck]/g, 'c')
        .replace(/wo|ou/g, 'o')
        .replace(/ai|ia|s/g, '')
        .replace(/an/g, 'a')
        .replace(/\s?[&:]\s?/g, '')
        .trim();
}

function getNextEpisode(data) {
    let nextEpisodeInfo = data._embedded.nextepisode;
    let nextEpisode = null;
    if (nextEpisodeInfo) {
        nextEpisode = {
            title: nextEpisodeInfo.name || '',
            season: nextEpisodeInfo.season,
            episode: nextEpisodeInfo.number,
            releaseStamp: nextEpisodeInfo.airstamp || '',
            summary: nextEpisodeInfo.summary ? nextEpisodeInfo.summary.replace(/<p>|<\/p>|<b>|<\/b>/g, '').replace(/([.…])+$/, '').trim() : ''
        };
    }
    return nextEpisode;
}

function getEpisodes(data) {
    return data._embedded.episodes.map(value => {
        let episodeDurations = value.runtime ? value.runtime + ' min' : '0 min';
        episodeDurations = episodeDurations.replace('30 min', '24 min');
        return getEpisodeModel(
            value.name || '',
            value.airdate,
            value.airstamp,
            episodeDurations,
            value.season,
            value.number,
            '0',
            ''
        );
    });
}
