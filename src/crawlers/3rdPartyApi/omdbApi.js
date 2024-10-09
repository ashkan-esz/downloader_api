import config from "../../config/index.js";
import axios from "axios";
import {replaceSpecialCharacters, purgeObjFalsyValues, getDatesBetween} from "../utils/utils.js";
import {getEpisodeModel} from "../../models/episode.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "../status/crawlerWarnings.js";
import {saveError} from "../../error/saveError.js";
import {getFixedGenres, getFixedSummary} from "../extractors/utils.js";
import PQueue from "p-queue";

const apiKeys = createApiKeys(config.apiKeys.omdbApiKeys);

export async function getOMDBApiData(title, alternateTitles, titleSynonyms, premiered, type, canRetry = true) {
    try {
        title = title.toLowerCase()
            .replace('!!', '!')
            .replace(' all seasons', '')
            .replace(' all', '')
            .replace(' full episodes', '');
        title = replaceSpecialCharacters(title, ['\'']);

        let titleYear = premiered.split('-')[0];
        let searchType = (type.includes('movie')) ? 'movie' : 'series';
        let url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&type=${searchType}&plot=full`;
        let data;
        let yearIgnored = false;
        if (titleYear) {
            data = await handle_OMDB_ApiCall(url + `&y=${titleYear}`);
            if (data === null) {
                data = await handle_OMDB_ApiCall(url);
                yearIgnored = true;
                if (data && data.Year && (Number(data.Year) - Number(titleYear) > 7)) {
                    return null;
                }
            }
        } else {
            data = await handle_OMDB_ApiCall(url);
        }

        if (data === null) {
            if (canRetry) {
                let newTitle = getEditedTitle(title);
                if (newTitle !== title) {
                    let retryRes = await getOMDBApiData(newTitle, alternateTitles, titleSynonyms, premiered, type, false);
                    if (retryRes) {
                        return retryRes;
                    }
                }

                let splitTitle = title.split(" ").filter(item => item.endsWith('s'));
                for (let i = 0; i < splitTitle.length; i++) {
                    let newSpl = splitTitle[i].replace(/s$/, '\'s');
                    newTitle = title.replace(splitTitle[i], newSpl);
                    let retryRes = await getOMDBApiData(newTitle, alternateTitles, titleSynonyms, premiered, type, false);
                    if (retryRes) {
                        return retryRes;
                    }
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

        if (data) {
            data.yearIgnored = yearIgnored;
        }
        return checkTitle(data, title, alternateTitles, titleSynonyms, titleYear, yearIgnored, type) ? data : null;
    } catch (error) {
        if (!error.response || error.response.status !== 500) {
            await saveError(error);
        }
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
        .replace(/(?<=(^|\s))vol \d/, (res) => res.replace('vol', 'volume'))
        .replace(' part 1', ' part one')
        .replace(' part 2', ' part two')
        .replace(' part 3', ' part three')
        .replace(' part 4', ' part four')
        .replace(/\s\s+/g, '')
        .trim();
}

export function getOMDBApiFields(data, type) {
    try {
        let apiFields = {
            imdbID: data.imdbID,
            directorsNames: data.Director.split(',').map(item => item.trim()).filter(value => value && value.toLowerCase() !== 'n/a'),
            writersNames: data.Writer.split(',').map(item => item.trim()).filter(value => value && value.toLowerCase() !== 'n/a'),
            actorsNames: data.Actors.split(',').map(item => item.trim()).filter(value => value && value.toLowerCase() !== 'n/a'),
            summary_en: getFixedSummary(data.Plot),
            genres: data.Genre ? getFixedGenres(data.Genre.split(',')) : [],
            isAnime: (data.Genre?.toLowerCase().includes('anime')),
            rating: data.Ratings ? extractRatings(data.Ratings) : {},
            omdbTitle: replaceSpecialCharacters(data.Title.toLowerCase()),
            yearIgnored: data.yearIgnored,
            year: data.Year.split(/[-–]/g)[0],
            poster: data?.Poster?.replace('N/A', '') || "",
            updateFields: {
                rawTitle: data.Title.trim().replace(/^["']|["']$/g, '').replace(/volume \d/i, (res) => res.replace('Volume', 'Vol')),
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
        if (!error.response || error.response.status !== 500) {
            saveError(error);
        }
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

export async function get_OMDB_EpisodesData(omdbTitle, yearIgnored, totalSeasons, premiered, lastSeasonsOnly = false) {
    try {
        let titleYear = premiered.split('-')[0];
        let episodes = [];
        totalSeasons = isNaN(totalSeasons) ? 0 : Number(totalSeasons);
        let startSeasonNumber = (lastSeasonsOnly && totalSeasons > 1) ? totalSeasons - 1 : 1;
        let promiseArray = [];

        for (let j = startSeasonNumber; j <= totalSeasons; j++) {
            let url = `https://www.omdbapi.com/?t=${omdbTitle}&Season=${j}&type=series`;
            if (!yearIgnored) {
                url += `&y=${titleYear}`;
            }
            let seasonResult = await handle_OMDB_ApiCall(url);

            if (seasonResult !== null && seasonResult.Title.toLowerCase() === omdbTitle.toLowerCase()) {
                let thisSeasonEpisodes = seasonResult.Episodes;
                let seasonsEpisodeNumber = Number(thisSeasonEpisodes[thisSeasonEpisodes.length - 1].Episode);

                for (let k = 1; k <= seasonsEpisodeNumber; k++) {
                    let searchYear = !yearIgnored ? `&y=${titleYear}` : '';
                    let episodeResultPromise = getSeasonEpisode_episode(omdbTitle, searchYear, episodes, thisSeasonEpisodes, j, k);
                    promiseArray.push(episodeResultPromise);
                }
            }
        }

        await Promise.allSettled(promiseArray);
        episodes = episodes.sort((a, b) => {
            return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
        });

        return episodes;
    } catch (error) {
        if (!error.response || error.response.status !== 500) {
            await saveError(error);
        }
        return null;
    }
}

function getSeasonEpisode_episode(omdbTitle, searchYear, episodes, seasonEpisodes, j, k) {
    const url = `https://www.omdbapi.com/?t=${omdbTitle}&Season=${j}&Episode=${k}&type=series` + searchYear;
    return handle_OMDB_ApiCall(url).then(episodeResult => {
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
                episodeResult.Runtime, Number(episodeResult.Season), Number(episodeResult.Episode),
                episodeResult.imdbRating, episodeResult.imdbID);
            episodes.push(episodeModel);
        }
    });
}

function checkTitle(data, title, alternateTitles, titleSynonyms, titleYear, yearIgnored, type) {
    let originalTitle = title;
    title = replaceSpecialCharacters(originalTitle).replace(/volume \d/, (res) => res.replace('volume', 'vol'));
    alternateTitles = alternateTitles.map(value => replaceSpecialCharacters(value.toLowerCase()).replace('uu', 'u'));
    titleSynonyms = titleSynonyms.map(value => replaceSpecialCharacters(value.toLowerCase()).replace('uu', 'u'));
    let apiTitle = replaceSpecialCharacters(data.Title.toLowerCase().trim()).replace(/volume \d/, (res) => res.replace('volume', 'vol'));
    let apiYear = data.Year.split(/[-–]/g)[0];
    let matchYear = (type.includes('movie') || yearIgnored) ? Math.abs(Number(titleYear) - Number(apiYear)) <= 1 : true;
    if (!matchYear) {
        return false;
    }
    let splitTitle = title.split(' ');
    let splitApiTitle = apiTitle.split(' ');
    let titlesMatched = true;
    for (let i = 0; i < splitTitle.length; i++) {
        if (!splitApiTitle.includes(splitTitle[i])) {
            titlesMatched = false;
            break;
        }
    }

    const normalizeRegex = /\s+|precent|movie|eiga|gekijouban/gi;

    return (
        matchYear &&
        (
            title.replace(normalizeRegex, '') === apiTitle.replace(normalizeRegex, '') ||
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

async function handle_OMDB_ApiCall(url) {
    try {
        let key = null;
        let response;
        while (true) {
            try {
                key = getApiKey();
                if (!key) {
                    if (config.nodeEnv === 'dev') {
                        console.log('ERROR: more omdb api keys are needed');
                    } else {
                        await saveCrawlerWarning(getCrawlerWarningMessages().apiCalls.omdb.moreApiKeyNeeded);
                    }
                    return null;
                }
                response = await axios.get(url + `&apikey=${key.apiKey}`);
                break;
            } catch (error) {
                if (
                    (error.response && error.response.data.Error === 'Request limit reached!') ||
                    (error.response && error.response.status === 401)
                ) {
                    if (error.response.data.Error && error.response.data.Error !== 'Request limit reached!' && key) {
                        if (config.nodeEnv === 'dev') {
                            console.log(`ERROR: Invalid omdb api key: ${key.apiKey}, (${error.response.data?.Error})`);
                        } else {
                            await saveCrawlerWarning(getCrawlerWarningMessages(key.apiKey, error.response.data?.Error).apiCalls.omdb.invalid);
                        }
                        key.limit = 0;
                    }
                    if (key) {
                        key.callCount = key.limit + 1;
                    }
                } else if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
                    error.isAxiosError = true;
                    error.url = url;
                    await saveError(error);
                    return null;
                } else {
                    if (error.code === 'EAI_AGAIN') {
                        const warningMessages = getCrawlerWarningMessages('');
                        await saveCrawlerWarning(warningMessages.apiCalls.omdb.eaiError);
                        continue;
                    } else if (error.response?.status !== 500 &&
                        error.response?.status !== 503 &&
                        error.response?.status !== 520 &&
                        error.response?.status !== 521 &&
                        error.response?.status !== 522 &&
                        error.response?.status !== 524) {
                        saveError(error);
                    }
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
        if (error.response?.status !== 500 &&
            error.response?.status !== 503 &&
            error.response?.status !== 520 &&
            error.response?.status !== 521 &&
            error.response?.status !== 524) {
            await saveError(error);
        }
        return null;
    }
}

function getApiKey() {
    freeApiKeys();
    let activeKeys = apiKeys.filter(item => item.limit > item.callCount);
    let usedKeys = activeKeys.filter(item => item.callCount > 0);
    let keys = usedKeys.length > 6
        ? usedKeys.sort((a, b) => a.callCount - b.callCount)
        : activeKeys.sort((a, b) => a.callCount - b.callCount);

    if (keys.length === 0) {
        return null;
    }
    if (keys[0].callCount === 0) {
        keys[0].firstCallTime = new Date();
    }
    keys[0].callCount++;
    return keys[0];
}

function freeApiKeys() {
    let now = new Date();
    for (let i = 0; i < apiKeys.length; i++) {
        if (apiKeys[i].firstCallTime && getDatesBetween(now, apiKeys[i].firstCallTime).hours >= 12) {
            apiKeys[i].callCount = 0;
            apiKeys[i].firstCallTime = 0;
        }
    }
}

function createApiKeys(omdbApiKeys) {
    return omdbApiKeys.map(item => {
        return {
            apiKey: item,
            callCount: 0,
            limit: 1000,
            firstCallTime: 0,
        };
    });
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export async function checkOmdbApiKeys() {
    const badKeys = [];

    const promiseQueue = new PQueue({concurrency: 3});
    for (let i = 0; i < apiKeys.length; i++) {
        promiseQueue.add(() => axios.get(`https://www.omdbapi.com/?t=attack&apikey=${apiKeys[i].apiKey}`).then(response => {
            if (
                response.data.Response === 'False' ||
                (response.data.Error && response.data.Error.includes('not found'))
            ) {
                badKeys.push(response.data.Error);
            }
        }).catch(error => {
            if (
                (error.response && error.response.data.Error === 'Request limit reached!') ||
                (error.response && error.response.status === 401)
            ) {
                badKeys.push(error.response?.data?.Error);
            } else {
                badKeys.push(error.code);
            }
        }));
    }
    await promiseQueue.onIdle();
    return {
        badKeys: badKeys,
        totalKeys: apiKeys.length
    }
}