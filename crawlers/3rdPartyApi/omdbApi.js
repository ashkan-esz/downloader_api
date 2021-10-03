const axios = require('axios').default;
const {replaceSpecialCharacters, purgeObjFalsyValues} = require("../utils");
const {getEpisodeModel} = require("../models/episode");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');

const apiKeyArray = getApiKeys();
let apiKeyCounter = -1;

export async function getOMDBApiData(title, alternateTitles, titleSynonyms, premiered, type, canRetry = true) {
    try {
        title = title.toLowerCase()
            .replace('!!', '!')
            .replace(' all seasons', '')
            .replace(' all', '')
            .replace(' full episodes', '');
        title = replaceSpecialCharacters(title);

        let titleYear = premiered.split('-')[0];
        let searchType = (type.includes('movie')) ? 'movie' : 'series';
        let url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&type=${searchType}&plot=full`;
        let data = await handle_OMDB_ApiKeys(url);
        if (data === null) {
            if (canRetry) {
                let newTitle = getEditedTitle(title);
                if (newTitle !== title) {
                    return await getOMDBApiData(newTitle, alternateTitles, titleSynonyms, premiered, type, false);
                }
            }
            return null;
        }

        if (
            type.includes('anime') &&
            data.Country.toLowerCase() !== 'n/a' &&
            !data.Country.toLowerCase().includes('japan') &&
            !data.Country.toLowerCase().includes('china') &&
            !data.Country.toLowerCase().includes('korea') &&
            !data.Language.toLowerCase().includes('japanese')
        ) {
            return null;
        }

        return checkTitle(data, title, alternateTitles, titleSynonyms, titleYear, type) ? data : null;
    } catch (error) {
        await saveError(error);
        return null;
    }
}

function getEditedTitle(title) {
    return title
        .replace('!', '')
        .replace('arc', 'ark')
        .replace('5 ', 'go ')
        .replace('hunter x hunter movie 1 phantom rouge', 'gekijouban hunter x hunter fantomu ruju')
        .replace('date a bullet dead or bullet', 'date a bullet zenpen dead or bullet')
        .replace('ookami', 'okami')
        .replace('apple', 'aplle')
        .replace('douchuu', 'dochu')
        .replace('yuusha', 'yusha')
        .replace('oukoku', 'okoku')
        .replace('suizou wo tabetai', 'suizo o tabetai')
        .replace(' wo ', ' o ')
        .replace(/\swo$/, ' o')
        .replace('yume o minai', 'yume wo minai')
        .replace('yuu yuu', 'yu yu')
        .replace('saibou', 'saibo')
        .replace('youma', 'yoma')
        .replace('yarou', 'yaro')
        .replace(/yuusha/g, 'yusha')
        .replace(/shinchou/g, 'shincho')
        .replace('kazarou', 'kazaro')
        .replace('majuu', 'maju')
        .replace('maid', 'meido')
        .replace('juunin', 'junin')
        .replace('gakkou', 'gakko')
        .replace('makenai love comedy', 'makenai love come')
        .replace('love comedy', 'rabukome')
        .replace('nani ka', 'nanika')
        .replace('drugstore', 'drug store')
        .replace('saikenki', 'saiken ki')
        .replace('maoujou', 'maou jou')
        .replace('oishasan', 'oisha san')
        .replace('tatteiru', 'tatte iru')
        .replace('regenesis', 're genesis')
        .replace('kancolle', 'kan colle')
        .replace('aruiwa', 'arui wa')
        .replace(' the movie', '')
        .replace(' movie ', ' ')
        .replace('summons', 'calls')
        .replace('dont', 'don\'t')
        .replace('wont', 'won\'t')
        .replace('heavens', 'heaven\'s')
        .replace('havent', 'haven\'t')
        .replace(' im ', ' i\'m ')
        .replace(' comedy', ' come')
        .replace(' renai ', ' ren\'ai ')
        .replace(' zunousen', ' zuno sen')
        .replace(' kusoge', ' kusogee')
        .replace(/\s\s+/g, '')
        .trim();
}

export function getOMDBApiFields(data, type) {
    try {
        let apiFields = {
            directorsNames: data.Director.split(',').filter(value => value && value.toLowerCase() !== 'n/a'),
            writersNames: data.Writer.split(',').filter(value => value && value.toLowerCase() !== 'n/a'),
            actorsNames: data.Actors.split(',').filter(value => value && value.toLowerCase() !== 'n/a'),
            summary_en: (data.Plot) ? data.Plot.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : '',
            genres: data.Genre ? data.Genre.toLowerCase().split(',').map(value => value.trim()) : [],
            rating: data.Ratings ? extractRatings(data.Ratings) : {},
            omdbTitle: replaceSpecialCharacters(data.Title.toLowerCase()),
            updateFields: {
                imdbID: data.imdbID,
                rawTitle: data.Title.trim(),
                year: data.Year.split(/[-–]/g)[0],
                duration: data.Runtime || '0 min',
                totalSeasons: (type.includes('movie')) ? 0 : Number(data.totalSeasons),
                rated: data.Rated,
                movieLang: data.Language.toLowerCase(),
                country: data.Country.toLowerCase(),
                boxOffice: (type.includes('movie')) ? data.BoxOffice : '',
                awards: data.Awards || '',
            },
        };
        apiFields.updateFields = purgeObjFalsyValues(apiFields.updateFields);
        return apiFields;
    } catch (error) {
        saveError(error);
        return null;
    }
}

function extractRatings(ratings) {
    let ratingObj = {};
    for (let i = 0; i < ratings.length; i++) {
        let sourceName = ratings[i].Source.toLowerCase();
        if (sourceName === "internet movie database") {
            ratingObj.imdb = Number(ratings[i].Value.split('/')[0]);
        }
        if (sourceName === "rotten tomatoes") {
            ratingObj.rottenTomatoes = Number(ratings[i].Value.replace('%', ''));
        }
        if (sourceName === "metacritic") {
            ratingObj.metacritic = Number(ratings[i].Value.split('/')[0]);
        }
    }
    return ratingObj;
}

export async function get_OMDB_seasonEpisode_info(omdbTitle, totalSeasons, type, duration, lastSeasonsOnly = false) {
    try {
        let seasons = [];
        let episodes = [];
        totalSeasons = isNaN(totalSeasons) ? 0 : Number(totalSeasons);
        let startSeasonNumber = (lastSeasonsOnly && totalSeasons > 1) ? totalSeasons - 1 : 1;
        let promiseArray = [];

        for (let j = startSeasonNumber; j <= totalSeasons; j++) {
            let seasonResult = await handle_OMDB_ApiKeys(`https://www.omdbapi.com/?t=${omdbTitle}&Season=${j}&type=series`);
            if (seasonResult === null || seasonResult.Title.toLowerCase() !== omdbTitle.toLowerCase()) {
                seasons.push({
                    season: j,
                    episodes: 0
                });
            } else {
                let thisSeasonEpisodes = seasonResult.Episodes;
                let seasonsEpisodeNumber = Number(thisSeasonEpisodes[thisSeasonEpisodes.length - 1].Episode);
                seasons.push({
                    season: j,
                    episodes: seasonsEpisodeNumber
                });
                for (let k = 1; k <= seasonsEpisodeNumber; k++) {
                    let episodeResultPromise = getSeasonEpisode_episode(omdbTitle, episodes, thisSeasonEpisodes, j, k);
                    promiseArray.push(episodeResultPromise);
                }
            }
        }
        await Promise.allSettled(promiseArray);
        seasons = seasons.sort((a, b) => (a.season > b.season ? 1 : -1));
        episodes = episodes.sort((a, b) => {
            return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
        });
        fixEpisodesZeroDuration(episodes, duration, type);
        return {seasons, episodes};
    } catch (error) {
        await saveError(error);
        return null;
    }
}

function getSeasonEpisode_episode(omdbTitle, episodes, seasonEpisodes, j, k) {
    return handle_OMDB_ApiKeys(`https://www.omdbapi.com/?t=${omdbTitle}&Season=${j}&Episode=${k}&type=series`).then(episodeResult => {
        let lastEpisodeDuration = (episodes.length === 0) ? '0 min' : episodes[episodes.length - 1].duration;
        if (episodeResult === null) {
            let episodeModel = getEpisodeModel(
                'unknown', 'unknown', '',
                lastEpisodeDuration, j, k,
                '0', '');
            episodes.push(episodeModel);
        } else {
            let releaseDate = 'unknown';
            for (let i = 0; i < seasonEpisodes.length; i++) {
                if (seasonEpisodes[i].Episode === episodeResult.Episode) {
                    releaseDate = seasonEpisodes[i].Released;
                    break;
                }
            }

            let episodeModel = getEpisodeModel(
                episodeResult.Title, releaseDate, '',
                episodeResult.Runtime, j, k,
                episodeResult.imdbRating, episodeResult.imdbID);
            episodes.push(episodeModel);
        }
    });
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
            title.replace(/\s+/g, '') === apiTitle.replace(/\s+/g, '') ||
            title === apiTitle.replace(' movie', '') ||
            title === apiTitle.replace('eiga ', '') ||
            title === apiTitle.replace('gekijouban ', '') ||
            title.replace('uu', 'u') === apiTitle.replace('uu', 'u') ||
            (originalTitle.includes('the movie:') && title.replace('the movie', '').replace(/\s\s+/g, ' ') === apiTitle) ||
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
        let startTime = new Date();
        let response;
        while (true) {
            try {
                apiKeyCounter++;
                apiKeyCounter = apiKeyCounter % apiKeyArray.length;
                response = await axios.get(url + `&apikey=${apiKeyArray[apiKeyCounter]}`);
                break;
            } catch (error) {
                if (
                    (error.response && error.response.data.Error === 'Request limit reached!') ||
                    (error.response && error.response.status === 401)
                ) {
                    let endTime = new Date();
                    let timeElapsed = (endTime.getTime() - startTime.getTime()) / 1000;
                    if (timeElapsed > 12) {
                        Sentry.captureMessage('more omdb api keys are needed');
                        return null;
                    }
                } else {
                    saveError(error);
                    return null;
                }
            }
        }

        if (
            response.data.Response === 'False' ||
            (response.data.Error && response.data.Error.includes('not found'))
        ) {
            return null;
        }
        return response.data;
    } catch (error) {
        await saveError(error);
        return null;
    }
}

function getApiKeys() {
    let allKeys = [];
    let i = 1;
    while (true) {
        let keys = process.env[`OMDB_API_KEY${i}`];
        if (!keys) {
            break;
        }
        allKeys.push(...keys.split('-'));
        i++;
    }
    return allKeys;
}

export function fixEpisodesZeroDuration(episodes, duration, type) {
    let badCases = [null, 'null min', '', 'N/A', 'N/A min', '0 min'];
    duration = (badCases.includes(duration) || !duration) ? '0 min' : duration;
    if (duration === '0 min' && type === 'anime_serial') {
        duration = '23 min';
    }

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
                episodes[i].duration = duration;
            }
        }
    }
}
