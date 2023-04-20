import * as moviesDbMethods from '../data/db/moviesDbMethods.js';
import * as crawlerMethodsDB from '../data/db/crawlerMethodsDB.js';
import * as userStatsDbMethods from '../data/db/userStatsDbMethods.js';
import * as botsDbMethods from '../data/db/botsDbMethods.js';
import {dataLevelConfig} from "../models/movie.js";
import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {setCache} from "../api/middlewares/moviesCache.js";
import {dataLevelConfig_staff} from "../models/person.js";
import {dataLevelConfig_character} from "../models/character.js";
import {getDatesBetween, replaceSpecialCharacters} from "../crawlers/utils.js";
import PQueue from 'p-queue';
import {
    getFollowedStaffTodayBirthday,
    getTodayStaffOrCharactersBirthday
} from "../data/db/staffAndCharactersDbMethods.js";

export async function getNews(userId, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await moviesDbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (newMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (newMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: newMovies}, 200, '');
}

export async function getNewsWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await moviesDbMethods.getNewMoviesWithDate(userId, date, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (newMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (newMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: newMovies}, 200, '');
}

export async function getUpdates(userId, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await moviesDbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (updateMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (updateMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: updateMovies}, 200, '');
}

export async function getUpdatesWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await moviesDbMethods.getUpdateMoviesWithDate(userId, date, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (updateMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (updateMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: updateMovies}, 200, '');
}

export async function getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await moviesDbMethods.getTopsByLikesMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (topsByLikesMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (topsByLikesMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: topsByLikesMovies}, 200, '');
}

export async function getTrailers(userId, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await moviesDbMethods.getNewTrailers(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (trailersData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (trailersData.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: trailersData}, 200, '');
}

export async function getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let sortedData = await moviesDbMethods.getSortedMovies(userId, sortBase, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (sortedData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (sortedData.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: sortedData}, 200, '');
}

export async function getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await moviesDbMethods.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, skip, limit, dataLevelConfig["medium"], isTestUser);
    if (seriesOfDay === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (seriesOfDay.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: seriesOfDay}, 200, '');
}

export async function getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count, isTestUser) {
    let {skip, limit} = getSkipLimit(page, count);

    let result = await Promise.allSettled([
        moviesDbMethods.getSortedMovies(userId, 'inTheaters', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser),
        moviesDbMethods.getSortedMovies(userId, 'comingSoon', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser),
        moviesDbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser),
        moviesDbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser)
    ]);
    let multiple = {
        inTheaters: result[0].value,
        comingSoon: result[1].value,
        news: result[2].value,
        update: result[3].value,
    }

    if (multiple.inTheaters === 'error' || multiple.comingSoon === 'error' || multiple.news === 'error' || multiple.update === 'error') {
        return generateServiceResult({
            data: {
                inTheaters: [],
                comingSoon: [],
                news: [],
                update: [],
            }
        }, 500, errorMessage.serverError);
    } else if (multiple.inTheaters.length === 0 && multiple.comingSoon.length === 0 && multiple.news.length === 0 && multiple.update.length === 0) {
        return generateServiceResult({data: multiple}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: multiple}, 200, '');
}

export async function searchMovieStaffCharacter(userId, title, dataLevel, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let searchDataArray = await Promise.allSettled([
        moviesDbMethods.searchOnMovieCollectionWithFilters(userId, {title}, skip, limit, dataLevelConfig[dataLevel], isTestUser),
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('staff', userId, {name: title}, skip, limit, dataLevelConfig_staff[staffCharacterDataLevel], isTestUser),
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('characters', userId, {name: title}, skip, limit, dataLevelConfig_character[staffCharacterDataLevel], isTestUser),
    ]);
    let searchData = {
        movies: searchDataArray[0].value,
        staff: searchDataArray[1].value,
        characters: searchDataArray[2].value,
    }

    if (searchData.movies === 'error' || searchData.staff === 'error' || searchData.characters === 'error') {
        return generateServiceResult({
            data: {
                movies: [],
                staff: [],
                characters: [],
            }
        }, 500, errorMessage.serverError);
    } else if (searchData.movies.length === 0 && searchData.staff.length === 0 && searchData.characters.length === 0) {
        return generateServiceResult({data: searchData}, 404, errorMessage.mscNotFound);
    }
    return generateServiceResult({data: searchData}, 200, '');
}

export async function searchStaffAndCharacter(userId, filters, dataLevel, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let searchDataArray = await Promise.allSettled([
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('staff', userId, filters, skip, limit, dataLevelConfig_staff[staffCharacterDataLevel], isTestUser),
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('characters', userId, filters, skip, limit, dataLevelConfig_character[staffCharacterDataLevel], isTestUser),
    ]);
    let searchData = {
        staff: searchDataArray[0].value,
        characters: searchDataArray[1].value,
    }

    if (searchData.staff === 'error' || searchData.characters === 'error') {
        return generateServiceResult({
            data: {
                staff: [],
                characters: [],
            }
        }, 500, errorMessage.serverError);
    } else if (searchData.staff.length === 0 && searchData.characters.length === 0) {
        return generateServiceResult({data: searchData}, 404, errorMessage.scNotFound);
    }
    return generateServiceResult({data: searchData}, 200, '');
}

export async function searchStaffOrCharacter(userId, staffOrCharacters, filters, dataLevel, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let searchResult = await moviesDbMethods.searchOnStaffOrCharactersWithFilters(staffOrCharacters, userId, filters, skip, limit, dataLevelConfig_staff[staffCharacterDataLevel], isTestUser)

    if (searchResult === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (searchResult.length === 0) {
        let temp = staffOrCharacters === 'staff' ? errorMessage.staffNotFound : errorMessage.characterNotFound;
        return generateServiceResult({data: []}, 404, temp);
    }
    return generateServiceResult({data: searchResult}, 200, '');
}

export async function searchMovie(userId, filters, dataLevel, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let searchResult = await moviesDbMethods.searchOnMovieCollectionWithFilters(userId, filters, skip, limit, dataLevelConfig[dataLevel], isTestUser);

    if (searchResult === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (searchResult.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: searchResult}, 200, '');
}

export async function searchMovieById(userId, id, dataLevel, filters, isTestUser) {
    let movieData = await moviesDbMethods.searchOnCollectionById("movies", userId, id, filters, dataLevelConfig[dataLevel], dataLevel, isTestUser);
    if (movieData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!movieData) {
        return generateServiceResult({data: null}, 404, errorMessage.movieNotFound);
    }
    return generateServiceResult({data: movieData}, 200, '');
}

export async function searchStaffById(userId, id, isTestUser) {
    let staffData = await moviesDbMethods.searchOnCollectionById("staff", userId, id, {}, {}, isTestUser);
    if (staffData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!staffData) {
        return generateServiceResult({data: null}, 404, errorMessage.staffNotFound);
    }
    return generateServiceResult({data: staffData}, 200, '');
}

export async function searchCharacterById(userId, id, isTestUser) {
    let characterData = await moviesDbMethods.searchOnCollectionById("characters", userId, id, {}, {}, isTestUser);
    if (characterData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!characterData) {
        return generateServiceResult({data: null}, 404, errorMessage.characterNotFound);
    }
    return generateServiceResult({data: characterData}, 200, '');
}

export async function userStatsService(userId, statType, id, isRemove) {
    if (isRemove) {
        let removeResult = await userStatsDbMethods.handleRemoveUserStatsTransaction(userId, statType, id);
        const code = removeResult === 'error' ? 500 : removeResult === 'notfound' ? 404 : 200;
        const message = removeResult === 'error' ? errorMessage.serverError : removeResult === 'notfound' ? errorMessage.documentNotFound : '';
        return generateServiceResult({}, code, message);
    }

    let result = await userStatsDbMethods.handleAddUserStatsTransaction(userId, statType, id);
    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
    if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    if (result === 'already exist') {
        return generateServiceResult({}, 409, errorMessage.alreadyExist);
    }
    return generateServiceResult({}, 200, '');
}

export async function getUserStatsList(userId, statType, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let projection;
    if (statType.includes('staff')) {
        projection = dataLevelConfig_staff[dataLevel];
    } else if (statType.includes('character')) {
        projection = dataLevelConfig_character[dataLevel];
    } else {
        projection = dataLevelConfig[dataLevel];
    }

    let userStatsList = await userStatsDbMethods.getUserStatsListDB(userId, statType, skip, limit, projection);
    if (userStatsList === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (userStatsList.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.documentsNotFound);
    }
    return generateServiceResult({data: userStatsList}, 200, '');
}

export async function getGenresStatus(routeUrl) {
    let genres = await moviesDbMethods.getGenresStatusDB();
    if (genres === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (genres.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.genresNotFound);
    }

    routeUrl = routeUrl.replace(/\?testUser=(true|false)$/i, '');
    setCache(routeUrl, {
        data: genres,
        code: 200,
        errorMessage: '',
    }, 60 * 60);

    return generateServiceResult({data: genres}, 200, '');
}

export async function getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await moviesDbMethods.getGenresMoviesDB(userId, genres, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel], isTestUser);
    if (result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getMovieSources(routeUrl) {
    let result = await crawlerMethodsDB.getSourcesObjDB();
    if (!result || result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }

    delete result._id;
    delete result.title;
    delete result.pageCounter_time;
    let sourcesUrls = Object.keys(result).map(sourceName => ({
        sourceName: sourceName,
        url: result[sourceName].movie_url.replace('/page/', '')
    }));

    if (sourcesUrls.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.movieSourcesNotFound);
    }

    setCache(routeUrl, {
        data: sourcesUrls,
        code: 200,
        errorMessage: '',
    }, 30 * 60);

    return generateServiceResult({data: sourcesUrls}, 200, '');
}

export async function getAnimeEnglishNames(japaneseNames) {
    let result = [];
    const promiseQueue = new PQueue({concurrency: 10});
    for (let i = 0; i < japaneseNames.length; i++) {
        let titleObj = {
            title: japaneseNames[i].toLowerCase(),
            alternateTitles: [],
            titleSynonyms: [],
        }
        let types = ['anime_movie', 'anime_serial'];

        promiseQueue.add(() => crawlerMethodsDB.searchTitleDB(titleObj, types, '', {alternateTitles: 1}).then(async (res) => {
            if (res.length === 0) {
                let temp = replaceSpecialCharacters(titleObj.title);
                if (temp !== titleObj.title) {
                    titleObj.title = temp;
                    res = await crawlerMethodsDB.searchTitleDB(titleObj, types, '', {alternateTitles: 1});
                }
            }
            result.push({
                japaneseName: japaneseNames[i],
                englishName: res?.[0]?.alternateTitles?.[0].replace(/[-_.]/g, ' ').replace(/\s\s+/g, '').trim() || '',
            });
        }));
    }
    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();

    return generateServiceResult({data: result}, 200, '');
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getTodayBirthday(jwtUserData, staffOrCharacters, followedOnly, dataLevel, page, isTestUser) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let dataLevelConfig = staffOrCharacters === 'staff'
        ? dataLevelConfig_staff[staffCharacterDataLevel]
        : dataLevelConfig_character[staffCharacterDataLevel];

    let result = (staffOrCharacters === 'staff' && followedOnly)
        ? await getFollowedStaffTodayBirthday(jwtUserData.userId, skip, limit, dataLevelConfig, isTestUser)
        : await getTodayStaffOrCharactersBirthday(staffOrCharacters, jwtUserData.userId, skip, limit, dataLevelConfig, isTestUser);
    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({}, 404, errorMessage.scNotFound);
    }

    return generateServiceResult({data: result}, 200, '');
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getMoviesDataForBot(botId, apiName, types, dataLevel, imdbScores, malScores, dontUpdateServerDate) {
    let botData = await botsDbMethods.getBotData(botId);
    if (botData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (!botData) {
        return generateServiceResult({data: []}, 404, errorMessage.botNotFound);
    } else if (botData.disabled) {
        return generateServiceResult({data: []}, 403, errorMessage.botIsDisabled);
    }

    let projection = dataLevelConfig[dataLevel.replace('low', 'telbot')];// low dataLevel is not allowed
    let updateFields = {};
    let moviesData = [];
    let moviesData2 = [];
    if (apiName === 'news') {
        moviesData = await moviesDbMethods.getNewMoviesWithDate(null, botData.lastApiCall_news, types, imdbScores, malScores, 0, 24, projection, true);
    } else if (apiName === 'updates') {
        moviesData = await moviesDbMethods.getUpdateMoviesWithDate(null, botData.lastApiCall_updates, types, imdbScores, malScores, 0, 24, projection, true);
    } else if (apiName === 'newsandupdates') {
        let result = await Promise.allSettled([
            moviesDbMethods.getNewMoviesWithDate(null, botData.lastApiCall_news, types, imdbScores, malScores, 0, 12, projection, true),
            moviesDbMethods.getUpdateMoviesWithDate(null, botData.lastApiCall_updates, types, imdbScores, malScores, 0, 12, projection, true),
        ]);
        moviesData = result[0].value;
        moviesData2 = result[1].value;
    }

    if (moviesData === 'error' || moviesData2 === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (moviesData.length === 0 && moviesData2.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }

    let hasNextPage = false;
    if (apiName === 'news') {
        updateFields.lastApiCall_news = moviesData[moviesData.length - 1].insert_date;
        hasNextPage = moviesData.length === 24;
    } else if (apiName === 'updates') {
        updateFields.lastApiCall_updates = moviesData[moviesData.length - 1].update_date;
        hasNextPage = moviesData.length === 24;
    } else if (apiName === 'newsandupdates') {
        let lastApiCall = moviesData[moviesData.length - 1]?.insert_date || 0;
        if (lastApiCall) {
            updateFields.lastApiCall_news = lastApiCall;
        }
        let lastApiCall2 = moviesData2[moviesData2.length - 1]?.update_date || 0;
        if (lastApiCall2) {
            updateFields.lastApiCall_updates = lastApiCall2;
        }
        hasNextPage = moviesData.length === 12 || moviesData2.length === 12;
        // merge results
        for (let i = 0; i < moviesData2.length; i++) {
            let exist = false;
            for (let j = 0; j < moviesData.length; j++) {
                if (moviesData[j]._id.toString() === moviesData2[i]._id.toString()) {
                    exist = true;
                    break;
                }
            }
            if (!exist) {
                moviesData.push(moviesData2[i]);
            }
        }
        moviesData = moviesData.sort((a, b) => {
            if (!a.update_date && !b.update_date) {
                return getDatesBetween(a.insert_date, b.insert_date).milliseconds < 0 ? -1 : 1;
            }
            if (a.update_date && !b.update_date) {
                return 1;
            }
            if (!a.update_date && b.update_date) {
                return -1;
            }
            return getDatesBetween(a.update_date, b.update_date).milliseconds < 0 ? -1 : 1;
        });
    }

    if (!dontUpdateServerDate && Object.keys(updateFields).length > 0) {
        let updateResult = await botsDbMethods.updateBotApiCallDate(botId, updateFields);
        if (updateResult === 'error') {
            return generateServiceResult({data: []}, 500, errorMessage.serverError);
        }
    }

    return generateServiceResult({data: moviesData, hasNextPage}, 200, '');
}

//-----------------------------------------------------
//-----------------------------------------------------

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}
