const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const {replaceSpecialCharacters, purgeObjFalsyValues} = require("../utils");
const {getEpisodeModel} = require("../models/episode");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

export async function getOMDBApiData(title, alternateTitles, titleSynonyms, premiered, type, canRetry = true) {
    try {
        title = title.toLowerCase().replace(/[∞△Ωω☆]|\(\)/g, '').trim();
        let titleYear = premiered.split('-')[0];
        let searchType = (type.includes('movie')) ? 'movie' : 'series';
        let url = `https://www.omdbapi.com/?t=${title}&type=${searchType}`;
        let data = await handle_OMDB_ApiKeys(url);
        if (data === null || data === '404') {
            if (canRetry) {
                let newTitle = title
                    .replace(' the movie', '')
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
                    return await getOMDBApiData(newTitle, alternateTitles, titleSynonyms, premiered, type, false);
                }
            }
            return null;
        }

        if (
            type.includes('anime') &&
            !data.Country.toLowerCase().includes('japan') &&
            !data.Language.toLowerCase().includes('Japanese')) {
            return null;
        }

        return checkTitle(data, title, alternateTitles, titleSynonyms, titleYear, type) ? data : null;
    } catch (error) {
        await saveError(error);
        return null;
    }
}

export function getOMDBApiFields(data, type) {
    try {
        let apiFields = {
            summary_en: (data.Plot) ? data.Plot.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : '',
            genres: data.Genre ? data.Genre.toLowerCase().split(',').map(value => value.trim()) : [],
            omdbTitle: data.Title,
            updateFields: {
                imdbID: data.imdbID,
                rawTitle: data.Title.trim(),
                year: data.Year.split(/[-–]/g)[0],
                duration: data.Runtime || '0 min',
                totalSeasons: (type.includes('movie')) ? 0 : Number(data.totalSeasons),
                rated: data.Rated,
                movieLang: data.Language.toLowerCase(),
                country: data.Country.toLowerCase(),
                rating: data.Ratings ? data.Ratings.map((item) => {
                    let sourceName = item.Source.toLowerCase();
                    sourceName = sourceName === "internet movie database" ? 'imdb' : sourceName;
                    return ({
                        source: sourceName,
                        value: item.Value
                    });
                }) : [],
                boxOffice: (type.includes('movie')) ? data.BoxOffice : '',
                awards: data.Awards || '',
                director: data.Director.toLowerCase(),
                writer: data.Writer.toLowerCase(),
                cast: data.Actors.toLowerCase()
                    .split(',')
                    .map(value => replaceSpecialCharacters(value))
                    .filter(value => value && value.toLowerCase() !== 'n/a'),
            },
        };
        apiFields.updateFields = purgeObjFalsyValues(apiFields.updateFields);
        return apiFields;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function get_OMDB_seasonEpisode_info(omdbTitle, totalSeasons, type, duration, lastSeasonsOnly = false) {
    try {
        let seasons = [];
        let episodes = [];
        totalSeasons = isNaN(totalSeasons) ? 0 : Number(totalSeasons);
        let startSeasonNumber = (lastSeasonsOnly && totalSeasons > 1) ? totalSeasons - 1 : 1;
        for (let j = startSeasonNumber; j <= totalSeasons; j++) {
            let seasonResult = await handle_OMDB_ApiKeys(`https://www.omdbapi.com/?t=${omdbTitle}&Season=${j}&type=series`);
            if (seasonResult === null || seasonResult === '404' || seasonResult.Title.toLowerCase() !== omdbTitle.toLowerCase()) {
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
                let episodeResultPromise = handle_OMDB_ApiKeys(`https://www.omdbapi.com/?t=${omdbTitle}&Season=${j}&Episode=${k}&type=series`).then(episodeResult => {
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
                    let episodeModel = (episodeResult === '404')
                        ? getEpisodeModel('unknown', releaseDate, '', lastEpisodeDuration, j, k, '0', '')
                        : getEpisodeModel(episodeResult.Title, releaseDate, '', episodeResult.Runtime, j, k, episodeResult.imdbRating, episodeResult.imdbID);
                    episodes.push(episodeModel);
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

function checkTitle(data, title, alternateTitles, titleSynonyms, titleYear, type) {
    let originalTitle = title;
    title = replaceSpecialCharacters(originalTitle);
    alternateTitles = alternateTitles.map(value => replaceSpecialCharacters(value.toLowerCase()).replace('uu', 'u'));
    titleSynonyms = titleSynonyms.map(value => replaceSpecialCharacters(value.toLowerCase()).replace('uu', 'u'));
    let apiTitle = replaceSpecialCharacters(data.Title.toLowerCase().trim());
    let apiYear = data.Year.split(/[-–]/g)[0];
    let matchYear = (type.includes('movie')) ? Math.abs(Number(titleYear) - Number(apiYear)) <= 1 : true;
    let splitTitle = title.split(' ');
    let splitApiTitle = apiTitle.split(' ');
    let titlesMatched = true;
    for (let i = 0; i < splitTitle.length; i++) {
        if (!splitApiTitle.includes(splitTitle[i])) {
            titlesMatched = false;
            break;
        }
    }

    return (
        matchYear &&
        (
            title === apiTitle ||
            title === apiTitle.replace(' movie', '') ||
            title.replace('uu', 'u') === apiTitle.replace('uu', 'u') ||
            (originalTitle.includes('the movie:') && title.replace('the movie', '').replace(/\s\s/g, ' ') === apiTitle) ||
            alternateTitles.includes(apiTitle.replace('uu', 'u')) ||
            titleSynonyms.includes(apiTitle.replace('uu', 'u')) ||
            (!type.includes('anime') && titlesMatched) ||
            title.replace('summons', 'calls') === apiTitle.replace('summons', 'calls') ||
            (splitTitle.length > 8 && apiTitle.includes(title))
        )
    );
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
                if (error.response && error.response.data.Error === 'Request limit reached!') {
                    apiKeyCounter++;
                    if (apiKeyCounter === apiKeyArray.length) {
                        await Sentry.captureMessage('more omdb api keys are needed');
                        return null;
                    }
                } else {
                    saveError(error);
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
