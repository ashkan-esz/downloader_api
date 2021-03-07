const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const {replaceSpecialCharacters} = require("./utils");
const {saveError} = require("../saveError");
const Sentry = require('@sentry/node');

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

export async function get_OMDB_Api_Data(title, premiered, mode) {
    try {
        let titleYear = premiered.split('-')[0];
        let type = (mode === 'movie') ? 'movie' : 'series';
        let url = `http://www.omdbapi.com/?t=${title}&type=${type}`;
        let data = await handle_OMDB_ApiKeys(url);
        if (data === null || data === '404') {
            return null;
        }

        let apiTitle = replaceSpecialCharacters(data.Title.toLowerCase().trim());
        let apiYear = data.Year.split(/[-–]/g)[0];
        let equalYear = (mode === 'movie') ? Math.abs(Number(titleYear) - Number(apiYear)) <= 1 : true;
        let titlesMatched = true;
        let splitTitle = title.split(' ');
        let splitApiTitle = apiTitle.split(' ');
        for (let j = 0; j < splitTitle.length; j++) {
            if (!splitApiTitle.includes(splitTitle[j])) {
                titlesMatched = false;
                break;
            }
        }

        if ((title !== apiTitle && !titlesMatched) || !equalYear) {
            return null;
        }

        return data;
    } catch (error) {
        await saveError(error);
        return null;
    }
}

export function get_OMDB_Api_Fields(data, summary, mode) {
    summary.english = (data.Plot) ? data.Plot.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : '';
    let collectedData = {
        totalSeasons: (mode === 'movie') ? '' : data.totalSeasons,
        boxOffice: (mode === 'movie') ? data.BoxOffice : '',
        summary: summary,
        rawTitle: data.Title.trim(),
        imdbID: data.imdbID,
        rated: data.Rated,
        movieLang: data.Language.toLowerCase(),
        country: data.Country.toLowerCase(),
        genres: data.Genre.toLowerCase().split(',').map(value => value.trim()),
        rating: data.Ratings ? data.Ratings.map((value) => {
            value.Value = value.Value.split('/')[0];
            return value;
        }) : [],
        duration: data.Runtime || '0 min',
        director: data.Director.toLowerCase(),
        writer: data.Writer.toLowerCase(),
        cast: data.Actors.toLowerCase().split(',').map(value => value.trim()),
        awards: data.Awards
    };

    if (mode === 'movie') {
        collectedData.premiered = data.Year.split(/[-–]/g)[0];
    }
    return collectedData;
}

export function get_OMDB_Api_nullFields(summary, mode) {
    summary.english = '';
    let collectedData = {
        totalSeasons: '',
        boxOffice: '',
        summary: summary,
        rawTitle: "",
        imdbID: "",
        rated: "",
        movieLang: "",
        country: "",
        genres: [],
        rating: [],
        duration: "",
        director: "",
        writer: "",
        cast: [],
        awards: "",
    };
    if (mode === 'movie') {
        collectedData.premiered = '';
    }
    return collectedData;
}

export async function get_OMDB_seasonEpisode_info(title, rawTitle, totalSeasons, duration, lastSeasonsOnly = false) {
    try {
        let seasons = [];
        let episodes = [];
        totalSeasons = isNaN(totalSeasons) ? 0 : totalSeasons;
        let startSeasonNumber = (lastSeasonsOnly && totalSeasons > 1) ? totalSeasons - 1 : 1;
        for (let j = startSeasonNumber; j <= totalSeasons; j++) {
            let seasonResult = await handle_OMDB_ApiKeys(`http://www.omdbapi.com/?t=${title}&Season=${j}&type=series`);
            if (seasonResult === null || (seasonResult !== '404' && seasonResult.Title !== rawTitle)) {
                return null;
            }
            if (seasonResult === '404') {
                seasons.push({
                    season: j,
                    episodes: 0
                });
                continue;
            }
            let seasonEpisodes = seasonResult.Episodes;
            let seasonsEpisodeNumber = Number(seasonEpisodes[seasonEpisodes.length - 1].Episode);
            seasons.push({
                season: j,
                episodes: seasonsEpisodeNumber
            });
            let promiseArray = [];
            for (let k = 1; k <= seasonsEpisodeNumber; k++) {
                let episodeResultPromise = handle_OMDB_ApiKeys(`http://www.omdbapi.com/?t=${title}&Season=${j}&Episode=${k}&type=series`).then(episodeResult => {
                    if (episodeResult === null) {
                        return null;
                    }

                    let releaseDate = 'unknown';
                    if (episodeResult !== '404') {
                        for (let i = 0; i < seasonEpisodes.length; i++) {
                            if (seasonEpisodes[i].Episode === episodeResult.Episode) {
                                releaseDate = seasonEpisodes[i].Released;
                                break;
                            }
                        }
                    }

                    let lastEpisodeDuration = (episodes.length === 0) ? '0 min' : episodes[episodes.length - 1].duration;
                    let episodeInfo = {
                        title: (episodeResult === '404') ? 'unknown' : episodeResult.Title,
                        released: releaseDate,
                        releaseStamp: '',
                        duration: (episodeResult === '404') ? lastEpisodeDuration : episodeResult.Runtime,
                        season: j,
                        episode: k,
                        imdbRating: (episodeResult === '404') ? '0' : episodeResult.imdbRating,
                        imdbID: (episodeResult === '404') ? '' : episodeResult.imdbID
                    };
                    episodes.push(episodeInfo);
                });
                promiseArray.push(episodeResultPromise);
            }
            await Promise.all(promiseArray);
        }
        episodes = episodes.sort((a, b) => {
            return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
        });
        fixEpisodesZeroDuration(episodes, duration);
        return {seasons, episodes};
    } catch (error) {
        await saveError(error);
        return null;
    }
}

async function handle_OMDB_ApiKeys(url) {
    try {
        let apiKeyArray = [
            '48621e95', '4de5ec8d', '1bc90abf', '7c0fe6e', '16070419',
            '8cf4fc9a', 'e42203dc', '25e38d4e', 'a3a8d729', '51f6c05a',
            'b9a766e3', 'e0c9d334', '91a3f2ee', '88862eae', 'aa0723f2', //10
            '20ccbf2b', 'aed32a13', 'f0bdcac7', '844e1160', '1c15c5bd',
            '926ff44d', '2c76a960', '81ee4b8c', 'a7469a3b', '6e9a6749', //20
            'c6de5a73', '68f6caf9', 'c9aec5c9', '76eb4d17', 'ba450d4d',
            '4d77f7e2', '4d9852f0', 'cb4138ce', '1ac50e8f', 'e221e620', //30
            '9821979c', 'b1e93bd1', 'fbfdd6b9', '263256ae', '8a3dcfd3',
            '5d55fa67', 'd7173993', '8d943b26', 'e84d6d3f', 'bea91417', //40
            '73c80ebd', '4ed35fd', 'b4d97241', '983b3335', '2724e93b',
            'c98bd9c0', '5837c85', '80fca094', 'd2bbde1a', '2432c2d0', //50
            '94fcccef', 'e28e2e3b', '3d58e8e4', '4af5698e', 'a3a36ebb',
            '1f22f193', 'ba77978c', 'bbd390a6', '50527320', 'e3e67ddf', //60
            'fcf7d223', '710829ae', '7e8d4f94', '8bc0f117', '3bb301a',
            '15ab15a5', '8471f363', '5ad67ef6', 'cb646df1', '56f21919', //70
            '7e1997fd', '57c7344d', '4d6afd7', '74960d2', '964dd637',
            '3b0cc1e8', 'cf3efbaf', '7385ce05', 'cca2bd4a'];
        let apiKeyCounter = 0;
        let response;
        while (true) {
            try {
                response = await axios.get(url + `&apikey=${apiKeyArray[apiKeyCounter]}`);
                break;
            } catch (error) {
                apiKeyCounter++;
                if (apiKeyCounter === apiKeyArray.length) {
                    Sentry.captureMessage('more omdb api keys are needed');
                    return null;
                }
            }
        }

        if (response.data.Error && response.data.Error.includes('not found')) {
            return '404';
        }
        if (response.data.Response === 'False') {
            return null;
        }
        return response.data;
    } catch (error) {
        await saveError(error);
        return null;
    }
}

export function fixEpisodesZeroDuration(episodes, duration) {
    let badCases = [null, 'null min', '', 'N/A', 'N/A min', '0 min'];
    duration = badCases.includes(duration) ? '0 min' : duration;
    for (let i = 0; i < episodes.length; i++) {
        if (!badCases.includes(episodes[i].duration) && episodes[i].duration && !isNaN(episodes[i].duration)) {
            episodes[i].duration = episodes[i].duration + ' min';
            continue;
        }
        if (badCases.includes(episodes[i].duration)) {
            let fixed = false;
            let prevEpisodesIndex = i;
            while (prevEpisodesIndex >= 0) {
                if (!badCases.includes(episodes[prevEpisodesIndex].duration)) {
                    episodes[i].duration = episodes[prevEpisodesIndex].duration;
                    fixed = true;
                    break;
                }
                prevEpisodesIndex--;
            }
            if (!fixed) {
                let nextEpisodesIndex = i;
                while (nextEpisodesIndex < episodes.length) {
                    if (!badCases.includes(episodes[nextEpisodesIndex].duration)) {
                        episodes[i].duration = episodes[nextEpisodesIndex].duration;
                        fixed = true;
                        break;
                    }
                    nextEpisodesIndex++;
                }
            }
            if (!fixed) {
                episodes[i].duration = duration || '0 min';
            }
        }
    }
}
