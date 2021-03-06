const axios = require('axios').default;
const {replaceSpecialCharacters, purgeObjFalsyValues} = require("../utils");
const {getEpisodeModel} = require("../models/episode");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');

export async function getTvMazeApiData(title, alternateTitles, titleSynonyms, imdbID, type, canReTry = true) {
    let waitCounter = 0;
    while (waitCounter < 12) {
        try {
            title = title.toLowerCase();
            let response = await axios.get(`https://api.tvmaze.com/singlesearch/shows?q=${title}&embed[]=nextepisode&embed[]=episodes&embed[]=cast`);
            let data = response.data;
            let titleMatch = checkTitle(data, title, alternateTitles, titleSynonyms, imdbID);
            if (titleMatch) {
                return data;
            } else {
                return await getTvMazeApiData_multiSearches(title, alternateTitles, titleSynonyms, imdbID);
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
                waitCounter++;
            } else if (error.response && error.response.status === 404) {
                if (type === 'anime_serial' && canReTry) {
                    let newTitle = title
                        .replace(' the ', ' this ')
                        .replace('summons', 'calls')
                        .replace('dont', 'don\'t')
                        .replace('wont', 'won\'t')
                        .replace('heavens', 'heaven\'s')
                        .replace('havent', 'haven\'t')
                        .replace(' im ', ' i\'m ')
                        .replace(' comedy', ' come')
                        .replace(' renai ', ' ren\'ai ')
                        .replace(' zunousen', ' zunô sen')
                        .replace(' kusoge', ' kusogee');
                    if (newTitle !== title) {
                        return await getTvMazeApiData(newTitle, alternateTitles, titleSynonyms, imdbID, type, false);
                    }
                }
                return null;
            } else {
                await saveError(error);
                return null;
            }
        }
    }
    await Sentry.captureMessage('lots of tvmaze api call');
    return null;
}

async function getTvMazeApiData_multiSearches(title, alternateTitles, titleSynonyms, imdbID) {
    let multiSearcheUrl = `https://api.tvmaze.com/search/shows?q=${title}&embed[]=nextepisode&embed[]=episodes&embed[]=cast`;
    let data = await handleApiCall(multiSearcheUrl);
    if (!data) {
        return null;
    }
    for (let i = 0; i < data.length; i++) {
        let thisTitleData = data[i].show;
        if (checkTitle(thisTitleData, title, alternateTitles, titleSynonyms, imdbID)) {
            let titleUrl = `https://api.tvmaze.com/shows/${thisTitleData.id}?embed[]=nextepisode&embed[]=episodes&embed[]=cast`;
            let titleData = await handleApiCall(titleUrl);
            if (titleData && checkTitle(titleData, title, alternateTitles, titleSynonyms, imdbID)) {
                return titleData;
            }
        }
    }
    return null;
}

export function getTvMazeApiFields(data) {
    try {
        //todo : add cast

        let apiFields = {
            nextEpisode: getNextEpisode(data),
            episodes: getEpisodes(data),
            summary_en: data.summary ? data.summary.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : '',
            genres: data.genres.map(value => value.toLowerCase()) || [],
            isAnimation: (data.type.toLowerCase() === 'animation'),
            isAnime: (data.genres.includes('Anime')),
            updateFields: {
                imdbID: data.externals.imdb || '',
                tvmazeID: Number(data.id) || 0,
                rawTitle: data.name.trim(),
                premiered: data.premiered || '',
                year: data.premiered ? data.premiered.split(/[-–]/g)[0] : '',
                duration: data.runtime ? data.runtime + ' min' :
                    data.averageRuntime ? data.averageRuntime + ' min' : '',
                status: data.status.toLowerCase(),
                movieLang: data.language || '',
                releaseDay: data.schedule.days ? (data.schedule.days[0] || '').toLowerCase() : '',
                officialSite: data.officialSite || "",
                webChannel: data.webChannel ? data.webChannel.name || '' : '',
            },
        }
        apiFields.updateFields = purgeObjFalsyValues(apiFields.updateFields);
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
            let response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
                waitCounter++;
            } else {
                if (error.response && error.response.status === 404) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    await Sentry.captureMessage(`lots of tvmaze api call: ${url}`);
    return null;
}

function checkTitle(data, title, alternateTitles, titleSynonyms, imdbID) {
    let apiTitle = data.name.toLowerCase();
    let apiTitle_simple = replaceSpecialCharacters(apiTitle);
    alternateTitles = alternateTitles.map(value => replaceSpecialCharacters(value.toLowerCase()));
    titleSynonyms = titleSynonyms.map(value => replaceSpecialCharacters(value.toLowerCase()));

    return (
        imdbID && imdbID === data.externals.imdb ||
        title === apiTitle ||
        title === apiTitle_simple ||
        title.replace(' wo ', ' o ') === apiTitle_simple ||
        alternateTitles.includes(apiTitle) ||
        alternateTitles.includes(apiTitle_simple) ||
        alternateTitles.includes(apiTitle_simple.replace('this', 'the')) ||
        titleSynonyms.includes(apiTitle) ||
        title.replace(/.$/, '') === apiTitle_simple ||
        title.replace(/..$/, '') === apiTitle_simple
    );
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
            summary: nextEpisodeInfo.summary ? nextEpisodeInfo.summary.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : ''
        };
    }
    return nextEpisode;
}

function getEpisodes(data) {
    return data._embedded.episodes.map(value => {
        return getEpisodeModel(
            value.name || '',
            value.airdate,
            value.airstamp,
            value.runtime ? value.runtime + ' min' : '0 min',
            value.season,
            value.number,
            '0',
            ''
        );
    });
}
