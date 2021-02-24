const axios = require('axios').default;
const {replaceSpecialCharacters} = require("./utils");
const {saveError} = require("../saveError");
const Sentry = require('@sentry/node');

export async function get_tvmazeApi_Alldata(title, rawTitle, imdbID) {
    let waitCounter = 0;
    while (waitCounter < 10) {
        try {
            let response = await axios.get(`http://api.tvmaze.com/singlesearch/shows?q=${title}&embed[]=nextepisode&embed[]=episodes&embed[]=cast`);
            let data = response.data;
            let foundTitle = checkTitle(data, title, rawTitle, imdbID);
            let day = foundTitle ? data.schedule.days[0] : '';
            return {
                nextEpisode: foundTitle ? getNextEpisode(data) : null,
                episodes: foundTitle ? getEpisodes(data) : [],
                //todo : add cast
                tvmazeID: Number(data.id) || 0,
                isAnimation: (data.type.toLowerCase() === 'animation'),
                isAnime: (data.genres.includes('Anime')),
                genres: data.genres || [],
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
            saveError(error);
            if (error.response && error.response.status === 404) {
                return null;
            } else {
                await new Promise((resolve => setTimeout(resolve, 600)));
                waitCounter++;
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
