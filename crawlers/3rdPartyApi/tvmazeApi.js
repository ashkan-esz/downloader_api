const axios = require('axios').default;
const {replaceSpecialCharacters} = require("../utils");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');

export async function getTvMazeApiData(title, rawTitle, imdbID) {
    let waitCounter = 0;
    while (waitCounter < 12) {
        try {
            let response = await axios.get(`http://api.tvmaze.com/singlesearch/shows?q=${title}&embed[]=nextepisode&embed[]=episodes&embed[]=cast`);
            let data = response.data;
            if (!checkTitle(data, title, rawTitle, imdbID)) {
                return null;
            }
            let day = data.schedule.days ? data.schedule.days[0] : '';
            return {
                nextEpisode: getNextEpisode(data),
                episodes: getEpisodes(data),
                //todo : add cast
                tvmazeID: Number(data.id) || 0,
                isAnimation: (data.type.toLowerCase() === 'animation'),
                isAnime: (data.genres.includes('Anime')),
                genres: data.genres.map(value => value.toLowerCase()) || [],
                status: data.status.toLowerCase(),
                duration: data.runtime + ' min',
                premiered: data.premiered || "",
                officialSite: data.officialSite || "",
                releaseDay: day ? day.toLowerCase() : '',
                imdbID: data.externals.imdb || '',
                rating: data.rating.average,
                summary: data.summary ? data.summary.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : ''
            };
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1200)));
                waitCounter++;
            } else {
                await saveError(error);
                return null;
            }
        }
    }
    Sentry.captureMessage('lots of tvmaze api call');
    return null;
}

function checkTitle(data, title, rawTitle, imdbID) {
    let apiTitle = data.name.toLowerCase();
    let simpleTitle = replaceSpecialCharacters(apiTitle);
    return (title === apiTitle ||
        title === simpleTitle ||
        rawTitle.toLowerCase() === apiTitle ||
        rawTitle.toLowerCase() === simpleTitle ||
        imdbID === data.externals.imdb);
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
        return {
            title: value.name || '',
            season: value.season,
            episode: value.number,
            released: value.airdate,
            releaseStamp: value.airstamp,
            duration: value.runtime ? value.runtime + ' min' : '0 min',
            imdbRating: '0',
            imdbID: ''
        };
    });
}
