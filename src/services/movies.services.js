import * as moviesDbMethods from '../data/db/moviesDbMethods.js';
import * as crawlerMethodsDB from '../data/db/crawlerMethodsDB.js';
import * as usersDbMethods from '../data/db/usersDbMethods.js';
import * as userStatsDbMethods from '../data/db/userStatsDbMethods.js';
import * as botsDbMethods from '../data/db/botsDbMethods.js';
import * as staffAndCharactersDbMethods from '../data/db/staffAndCharactersDbMethods.js';
import {dataLevelConfig} from "../models/movie.js";
import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import {setRedis} from "../data/redis.js";
import {getDatesBetween, replaceSpecialCharacters} from "../crawlers/utils/utils.js";
import PQueue from 'p-queue';
import {saveError} from "../error/saveError.js";

//todo : cache movies data

export async function getNews(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await moviesDbMethods.getNewMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (newMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (newMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(newMovies, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, newMovies, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: newMovies}, 200, '');
}

export async function getNewsWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await moviesDbMethods.getNewMoviesWithDate(date, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (newMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (newMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(newMovies, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, newMovies, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: newMovies}, 200, '');
}

export async function getUpdates(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await moviesDbMethods.getUpdateMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (updateMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (updateMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(updateMovies, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, updateMovies, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: updateMovies}, 200, '');
}

export async function getUpdatesWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await moviesDbMethods.getUpdateMoviesWithDate(date, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (updateMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (updateMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(updateMovies, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, updateMovies, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: updateMovies}, 200, '');
}

export async function getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await moviesDbMethods.getTopsByLikesMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (topsByLikesMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (topsByLikesMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(topsByLikesMovies, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, topsByLikesMovies, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: topsByLikesMovies}, 200, '');
}

export async function getTrailers(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await moviesDbMethods.getNewTrailers(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (trailersData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (trailersData.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(trailersData, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, trailersData, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: trailersData}, 200, '');
}

export async function getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let sortedData = await moviesDbMethods.getSortedMovies(sortBase, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (sortedData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (sortedData.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(sortedData, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, sortedData, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: sortedData}, 200, '');
}

export async function getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await moviesDbMethods.getSeriesOfDay(dayNumber, types, imdbScores, malScores, skip, limit, dataLevelConfig["medium"]);
    if (seriesOfDay === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (seriesOfDay.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(seriesOfDay, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, seriesOfDay, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: seriesOfDay}, 200, '');
}

export async function getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, count);

    let result = await Promise.allSettled([
        moviesDbMethods.getSortedMovies('inTheaters', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.getSortedMovies('comingSoon', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.getNewMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.getUpdateMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
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
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(multiple.inTheaters, embedStaffAndCharacter),
        addStaffAndCharacterDataToMovie(multiple.comingSoon, embedStaffAndCharacter),
        addStaffAndCharacterDataToMovie(multiple.news, embedStaffAndCharacter),
        addStaffAndCharacterDataToMovie(multiple.update, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, multiple.inTheaters, noUserStats, isGuest),
        addUserStatsDataToMovie(userId, multiple.comingSoon, noUserStats, isGuest),
        addUserStatsDataToMovie(userId, multiple.news, noUserStats, isGuest),
        addUserStatsDataToMovie(userId, multiple.update, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: multiple}, 200, '');
}

export async function searchStaffAndCharacter(userId, filters, dataLevel, page, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let searchDataArray = await Promise.allSettled([
        staffAndCharactersDbMethods.searchOnStaffOrCharactersWithFilters('staff', userId, filters, skip, limit, dataLevel, noUserStats, isGuest),
        staffAndCharactersDbMethods.searchOnStaffOrCharactersWithFilters('character', userId, filters, skip, limit, dataLevel, noUserStats, isGuest),
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

export async function searchStaffOrCharacter(userId, staffOrCharacter, filters, dataLevel, page, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let searchResult = await staffAndCharactersDbMethods.searchOnStaffOrCharactersWithFilters(staffOrCharacter, userId, filters, skip, limit, dataLevel, noUserStats, isGuest)

    if (searchResult === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (searchResult.length === 0) {
        let temp = staffOrCharacter === 'staff' ? errorMessage.staffNotFound : errorMessage.characterNotFound;
        return generateServiceResult({data: []}, 404, temp);
    }
    return generateServiceResult({data: searchResult}, 200, '');
}

export async function searchMovie(userId, filters, dataLevel, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let searchResult = await moviesDbMethods.searchOnMovieCollectionWithFilters(filters, skip, limit, dataLevelConfig[dataLevel]);

    if (searchResult === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (searchResult.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(searchResult, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, searchResult, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: searchResult}, 200, '');
}

export async function searchMovieById(userId, id, dataLevel, filters, embedStaffAndCharacter, noUserStats, isGuest) {
    let movieData = await moviesDbMethods.searchOnMoviesById(id, filters, dataLevelConfig[dataLevel], dataLevel);
    if (movieData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!movieData) {
        return generateServiceResult({data: null}, 404, errorMessage.movieNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie([movieData], embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, [movieData], noUserStats, isGuest),
    ]);
    if (!isGuest && filters.embedDownloadLinksConfig) {
        movieData.downloadLinksConfig = await usersDbMethods.getUserSettingsDB(userId, 'downloadLinks');
    }
    return generateServiceResult({data: movieData}, 200, '');
}

export async function searchStaffById(userId, id, creditsCount, noUserStats, isGuest) {
    let staffData = await staffAndCharactersDbMethods.getStaffById(userId, id, creditsCount, noUserStats, isGuest);
    if (staffData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!staffData) {
        return generateServiceResult({data: null}, 404, errorMessage.staffNotFound);
    }
    await addMovieDataToCredits(staffData.credits);
    return generateServiceResult({data: staffData}, 200, '');
}

export async function searchCharacterById(userId, id, creditsCount, noUserStats, isGuest) {
    let characterData = await staffAndCharactersDbMethods.getCharacterById(userId, id, creditsCount, noUserStats, isGuest);
    if (characterData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!characterData) {
        return generateServiceResult({data: null}, 404, errorMessage.characterNotFound);
    }
    await addMovieDataToCredits(characterData.credits);
    return generateServiceResult({data: characterData}, 200, '');
}

//--------------------------------------------
//--------------------------------------------

export async function getMovieCreditsById(userId, id, page, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await staffAndCharactersDbMethods.getStaffAndCharacterOfMovie(id, skip, limit);
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: null}, 404, errorMessage.staffNotFound);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getStaffCreditsById(userId, id, page, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await staffAndCharactersDbMethods.getCreditsOfStaff(id, skip, limit);
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: null}, 404, errorMessage.staffNotFound);
    }
    await addMovieDataToCredits(result);
    return generateServiceResult({data: result}, 200, '');
}

export async function getCharacterCreditsById(userId, id, page, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await staffAndCharactersDbMethods.getCreditsOfCharacter(id, skip, limit);
    if (result === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: null}, 404, errorMessage.staffNotFound);
    }
    await addMovieDataToCredits(result);
    return generateServiceResult({data: result}, 200, '');
}

//--------------------------------------------
//--------------------------------------------

export async function userStatsLikeDislikeService(userId, statType, id, isRemove) {
    let result = await userStatsDbMethods.addUserStats_likeDislike(userId, statType, id, isRemove);
    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsFollowStaffService(userId, statType, id, isRemove) {
    let result = statType === 'follow_staff'
        ? await userStatsDbMethods.addUserStats_followStaff(userId, statType, id, isRemove)
        : await userStatsDbMethods.addUserStats_favoriteCharacter(userId, statType, id, isRemove);

    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsFinishMovieService(userId, id, startDate, endDate, score, remove, favorite) {
    let drop = false;
    if (!remove) {
        //don't need to check its ended, if you want to remove from table
        let movieData = await moviesDbMethods.getMovieState(id);
        if (movieData === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!movieData) {
            return generateServiceResult({}, 404, errorMessage.documentNotFound);
        } else {
            //check its dropped or finished
            if (movieData.releaseState !== 'waiting' && movieData.releaseState !== 'done') {
                return generateServiceResult({}, 409, 'Movie didnt released yet');
            }
            if (!movieData.type.includes('movie') && movieData.status !== 'ended') {
                drop = true;
            }
        }
    }

    let result = await userStatsDbMethods.addUserStats_finishedMovie(userId, id, startDate, endDate, score, drop, favorite, remove);

    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsFavoriteMovieService(userId, id, favorite) {
    let result = await userStatsDbMethods.addUserStats_handleFavoriteMovie(userId, id, favorite);

    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, 'Movie not found in finished movies list');
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsFollowMovieService(userId, id, watch_season, watch_episode, score, remove) {
    let movieType = await moviesDbMethods.getTitleType(id);
    if (movieType === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (!movieType) {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    } else if (!movieType.type.includes('serial')) {
        return generateServiceResult({}, 409, 'Works for serials only');
    }

    let result = await userStatsDbMethods.addUserStats_followMovie(userId, id, watch_season, watch_episode, score, remove);
    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    } else if (result === 'already watched') {
        return generateServiceResult({}, 404, 'Already watched, cannot follow');
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsWatchListMovieService(userId, id, score, remove) {
    let result = await userStatsDbMethods.addUserStats_watchListMovie(userId, id, score, remove);

    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    } else if (result === 'already following or watched') {
        return generateServiceResult({}, 409, 'Already following or watched');
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsHandleScore(userId, id, score, stat_list_type) {
    let result = await userStatsDbMethods.addUserStats_updateScore(userId, id, score, stat_list_type);

    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    return generateServiceResult({}, 200, '');
}

export async function userStatsHandleWatchState(userId, id, watch_season, watch_episode, stat_list_type) {
    let movieData = await moviesDbMethods.getMovieState(id);
    if (movieData === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (!movieData) {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    } else if (!movieData.type.includes('serial')) {
        return generateServiceResult({}, 409, 'Works for serials only');
    } else if (watch_season > movieData.latestData.season || (watch_season === movieData.latestData.season && watch_episode > movieData.latestData.episode)) {
        return generateServiceResult({}, 409, 'Didnt released yet');
    }

    let result = await userStatsDbMethods.addUserStats_updateWatchState(userId, id, watch_season, watch_episode, stat_list_type);
    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result === 'notfound') {
        return generateServiceResult({}, 404, errorMessage.documentNotFound);
    }
    return generateServiceResult({}, 200, '');
}

export async function getUserStatsList(userId, statType, dataLevel, page, embedStaffAndCharacter, noUserStats) {
    let {skip, limit} = getSkipLimit(page, 12);

    let userStatsList = await userStatsDbMethods.getUserStatsListDB(userId, statType, skip, limit, noUserStats);
    if (userStatsList === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (userStatsList.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.documentsNotFound);
    }

    if (statType.includes('staff')) {
        normalizeStaffAndCharactersUserStats('staff', userStatsList, statType, noUserStats);
    } else if (statType.includes('character')) {
        normalizeStaffAndCharactersUserStats('character', userStatsList, statType, noUserStats);
    } else {
        await addStaffAndCharacterDataToMovie(userStatsList, embedStaffAndCharacter);
        normalizeMoviesUserStats(userStatsList, statType, noUserStats);
        await addMovieDataToUserStatsList(userStatsList, dataLevelConfig[dataLevel]);
    }

    return generateServiceResult({data: userStatsList}, 200, '');
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getGenresStatus(routeUrl) {
    let genres = await moviesDbMethods.getGenresStatusDB();
    if (genres === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (genres.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.genresNotFound);
    }

    await setRedis(routeUrl, {
        data: genres,
        code: 200,
        errorMessage: '',
        isGuest: false,
        isCacheData: true,
    }, 60 * 60);

    return generateServiceResult({data: genres}, 200, '');
}

export async function getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page, embedStaffAndCharacter, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await moviesDbMethods.getGenresMoviesDB(genres, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(result, embedStaffAndCharacter),
        addUserStatsDataToMovie(userId, result, noUserStats, isGuest),
    ]);
    return generateServiceResult({data: result}, 200, '');
}

export async function getMovieSources(routeUrl) {
    let result = await crawlerMethodsDB.getSourcesObjDB();
    if (!result || result === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    }

    delete result._id;
    delete result.title;
    let sourcesUrls = Object.keys(result).map(sourceName => ({
        sourceName: sourceName,
        url: result[sourceName].movie_url.replace('/page/', '')
    }));

    if (sourcesUrls.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.movieSourcesNotFound);
    }

    await setRedis(routeUrl, {
        data: sourcesUrls,
        code: 200,
        errorMessage: '',
        isGuest: false,
        isCacheData: true,
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

export async function getTodayBirthday(jwtUserData, staffOrCharacter, followedOnly, dataLevel, page, noUserStats, isGuest) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await staffAndCharactersDbMethods.getTodayStaffOrCharactersBirthday(staffOrCharacter, jwtUserData.userId, followedOnly, skip, limit, dataLevel, noUserStats, isGuest);
    if (result === 'error') {
        return generateServiceResult({}, 500, errorMessage.serverError);
    } else if (result.length === 0) {
        return generateServiceResult({}, 404, errorMessage.scNotFound);
    }

    return generateServiceResult({data: result}, 200, '');
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getMoviesDataForBot(botId, apiName, types, dataLevel, imdbScores, malScores, embedStaffAndCharacter, noUserStats, dontUpdateServerDate) {
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
        moviesData = await moviesDbMethods.getNewMoviesWithDate(botData.lastApiCall_news, types, imdbScores, malScores, 0, 24, projection);
    } else if (apiName === 'updates') {
        moviesData = await moviesDbMethods.getUpdateMoviesWithDate(botData.lastApiCall_updates, types, imdbScores, malScores, 0, 24, projection, true);
    } else if (apiName === 'newsandupdates') {
        let result = await Promise.allSettled([
            moviesDbMethods.getNewMoviesWithDate(botData.lastApiCall_news, types, imdbScores, malScores, 0, 12, projection),
            moviesDbMethods.getUpdateMoviesWithDate(botData.lastApiCall_updates, types, imdbScores, malScores, 0, 12, projection),
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
    await Promise.allSettled([
        addStaffAndCharacterDataToMovie(moviesData, embedStaffAndCharacter),
        addUserStatsDataToMovie('', moviesData, noUserStats, true),
    ]);
    return generateServiceResult({data: moviesData, hasNextPage}, 200, '');
}

//-----------------------------------------------------
//-----------------------------------------------------

async function addStaffAndCharacterDataToMovie(movies, embedStaffAndCharacter) {
    if (embedStaffAndCharacter) {
        let promiseArray = [];
        for (let i = 0; i < movies.length; i++) {
            let prom = staffAndCharactersDbMethods.getStaffAndCharacterOfMovie(movies[i]._id.toString(), 0, 24).then(res => {
                let actorsAndCharacters = [];
                let staff = {
                    directors: [],
                    writers: [],
                    others: [],
                };

                if (res !== 'error') {
                    for (let i = 0; i < res.length; i++) {
                        let positions = res[i].actorPositions.map(item => item.toLowerCase()).join(' , ');
                        if (positions.includes('actor')) {
                            actorsAndCharacters.push(res[i]);
                        } else if (positions.includes('director')) {
                            staff.directors.push(res[i]);
                        } else if (positions.includes('writer')) {
                            staff.writers.push(res[i]);
                        } else {
                            staff.others.push(res[i]);
                        }
                    }
                }

                movies[i].actorsAndCharacters = actorsAndCharacters;
                movies[i].staff = staff;
            });
            promiseArray.push(prom);
        }
        await Promise.allSettled(promiseArray);
    }
}

async function addUserStatsDataToMovie(userId, movies, noUserStats, isGuest) {
    try {
        if (movies.length === 0) {
            return movies;
        }

        if (noUserStats) {
            for (let i = 0; i < movies.length; i++) {
                movies[i].userStats = null;
                movies[i].userStats_extra = null;
            }
            return movies;
        }

        const defaultUserStats = userStatsDbMethods.defaultUserStats;
        const defaultUserStats_extra = userStatsDbMethods.defaultUserStats_extra;

        if (isGuest) {
            let userStats = await userStatsDbMethods.getMoviesUserStatsCounts(movies.map(m => m._id.toString()));
            for (let i = 0; i < movies.length; i++) {
                let statsData = userStats.find(u => u.movieId === movies[i]._id.toString());
                if (statsData) {
                    delete statsData.movieId;
                    movies[i].userStats = {...defaultUserStats, ...statsData};
                } else {
                    movies[i].userStats = defaultUserStats;
                }
                movies[i].userStats_extra = null;
            }
            if (movies.length === 1) {
                movies[0].userStats_extra = defaultUserStats_extra;
            }
            return movies;
        } else if (movies.length > 1) {
            const userStats = await userStatsDbMethods.getMoviesUserStats_likeDislike(userId, movies.map(m => m._id.toString()));
            for (let i = 0; i < movies.length; i++) {
                let statsData = userStats.find(u => u.movieId === movies[i]._id.toString());
                if (statsData) {
                    movies[i].userStats = {
                        likes_count: statsData.likes_count,
                        dislikes_count: statsData.dislikes_count,
                        favorite_count: statsData.favorite_count,
                        dropped_count: statsData.dropped_count,
                        finished_count: statsData.finished_count,
                        follow_count: statsData.follow_count,
                        watchlist_count: statsData.watchlist_count,
                        continue_count: statsData.continue_count,
                        like: false,
                        dislike: false,
                    }
                    if (statsData.likeDislikeMovies[0]) {
                        movies[i].userStats.like = statsData.likeDislikeMovies[0].type === 'like';
                        movies[i].userStats.dislike = statsData.likeDislikeMovies[0].type === 'dislike';
                    }
                } else {
                    movies[i].userStats = defaultUserStats;
                }
                movies[i].userStats_extra = null;
            }
            return movies;
        } else {
            //single movie
            const userStats = await userStatsDbMethods.getMovieFullUserStats(userId, movies[0]._id.toString());
            movies[0].userStats_extra = defaultUserStats_extra;
            if (userStats) {
                movies[0].userStats = {
                    likes_count: userStats.likes_count,
                    dislikes_count: userStats.dislikes_count,
                    favorite_count: userStats.favorite_count,
                    dropped_count: userStats.dropped_count,
                    finished_count: userStats.finished_count,
                    follow_count: userStats.follow_count,
                    watchlist_count: userStats.watchlist_count,
                    continue_count: userStats.continue_count,
                    like: false,
                    dislike: false,
                    favorite: false,
                    dropped: false,
                    finished: false,
                    follow: false,
                    watchlist: false,
                };
                if (userStats.likeDislikeMovies[0]) {
                    movies[0].userStats.like = userStats.likeDislikeMovies[0].type === 'like';
                    movies[0].userStats.dislike = userStats.likeDislikeMovies[0].type === 'dislike';
                }
                if (userStats.watchListMovies[0]) {
                    movies[0].userStats.watchlist = true;
                    movies[0].userStats_extra.myScore = userStats.watchListMovies[0].score;
                }
                if (userStats.watchedMovies[0]) {
                    movies[0].userStats.dropped = userStats.watchedMovies[0].dropped;
                    movies[0].userStats.finished = !userStats.watchedMovies[0].dropped;
                    movies[0].userStats.favorite = !userStats.watchedMovies[0].favorite;
                    movies[0].userStats_extra.watch_start = userStats.watchedMovies[0].startDate;
                    movies[0].userStats_extra.watch_end = userStats.watchedMovies[0].date;
                    movies[0].userStats_extra.watch_season = userStats.watchedMovies[0].watch_season;
                    movies[0].userStats_extra.watch_episode = userStats.watchedMovies[0].watch_episode;
                    movies[0].userStats_extra.myScore = userStats.watchedMovies[0].score;
                }
                if (userStats.followMovies[0]) {
                    movies[0].userStats.follow = true;
                    movies[0].userStats_extra.watch_season = userStats.followMovies[0].watch_season;
                    movies[0].userStats_extra.watch_episode = userStats.followMovies[0].watch_episode;
                    movies[0].userStats_extra.myScore = userStats.followMovies[0].score;
                }
            } else {
                movies[0].userStats = defaultUserStats;
            }
            return movies;
        }
    } catch (error) {
        saveError(error);
        return movies;
    }
}

function normalizeMoviesUserStats(movies, statType, noUserStats) {
    for (let i = 0; i < movies.length; i++) {
        if (noUserStats) {
            movies[i].userStats = null;
            movies[i].userStats_extra = null;
        } else {
            let statsData = movies[i].movie;
            movies[i].userStats = {
                likes_count: statsData.likes_count,
                dislikes_count: statsData.dislikes_count,
                favorite_count: statsData.favorite_count,
                dropped_count: statsData.dropped_count,
                finished_count: statsData.finished_count,
                follow_count: statsData.follow_count,
                watchlist_count: statsData.watchlist_count,
                continue_count: statsData.continue_count,
                like: false,
                dislike: false,
            }
            if (statsData.likeDislikeMovies && statsData.likeDislikeMovies[0]) {
                movies[i].userStats.like = statsData.likeDislikeMovies[0].type === 'like';
                movies[i].userStats.dislike = statsData.likeDislikeMovies[0].type === 'dislike';
            } else if (statType === 'like_movie') {
                movies[i].userStats.like = true;
            } else if (statType === 'dislike_movie') {
                movies[i].userStats.dislike = true;
            }

            if (statType === 'watchlist_movie') {
                movies[i].userStats.watchlist = true;
            } else if (statType === 'follow_movie') {
                movies[i].userStats.follow = true;
            } else if (statType === 'finish_movie') {
                movies[i].userStats.dropped = movies[i].dropped;
                movies[i].userStats.finished = !movies[i].dropped;
                movies[i].userStats.favorite = movies[i].favorite;
            }

            movies[i].userStats_extra = {
                watch_start: movies[i].startDate || '',
                watch_end: movies[i].startDate ? movies[i].date || '' : '',
                watch_season: movies[i].watch_season || 0,
                watch_episode: movies[i].watch_episode || 0,
                myScore: movies[i].score || 0,
            };
        }

        delete movies[i].score;
        delete movies[i].date;
        delete movies[i].userId;
        delete movies[i].startDate;
        delete movies[i].watch_season;
        delete movies[i].watch_episode;
        delete movies[i].dropped;
        delete movies[i].favorite;
        delete movies[i].type;
        delete movies[i].movie;
    }
}

async function addMovieDataToUserStatsList(movies, projection) {
    let moviesData = await moviesDbMethods.getMoviesDataInBatch(movies.map(m => m.movieId), projection);
    for (let i = 0; i < movies.length; i++) {
        let movie = moviesData.find(m => m._id.toString() === movies[i].movieId);
        if (movie) {
            movies[i] = {...movies[i], ...movie};
        } else {
            movies[i] = null;
        }
    }
}

async function addMovieDataToCredits(credits) {
    let movies = await moviesDbMethods.getMoviesDataInBatch(credits.map(c => c.movie.movieId), {
        rawTitle: 1,
        type: 1,
        posters: 1,
    });
    for (let i = 0; i < credits.length; i++) {
        let movie = movies.find(m => m._id.toString() === credits[i].movie.movieId);
        if (movie) {
            credits[i].movie = {...credits[i].movie, ...movie};
        } else {
            credits[i].movie = null;
        }
    }
}

function normalizeStaffAndCharactersUserStats(type, data, statType, noUserStats) {
    if (type === 'staff') {
        for (let i = 0; i < data.length; i++) {
            data[i] = {...data[i], ...data[i].staff};
            delete data[i].staff;
            if (noUserStats) {
                data[i].userStats = null;
            } else {
                data[i].userStats = {
                    likes_count: data[i].likes_count,
                    dislikes_count: data[i].dislikes_count,
                    follow_count: data[i].follow_count,
                    like: false,
                    dislike: false,
                    followStaff: false,
                }

                if (data[i].likeDislikeStaff) {
                    data[i].userStats.like = data[i].likeDislikeStaff[0]?.type === 'like';
                    data[i].userStats.dislike = data[i].likeDislikeStaff[0]?.type === 'dislike';
                } else if (statType === 'like_staff') {
                    data[i].userStats.like = true;
                } else if (statType === 'dislike_staff') {
                    data[i].userStats.dislike = true;
                }

                if (data[i].followStaff) {
                    data[i].userStats.followStaff = !!data[i].followStaff[0];
                } else if (statType === 'follow_staff') {
                    data[i].userStats.followStaff = true;
                }
            }

            delete data[i].likes_count;
            delete data[i].dislikes_count;
            delete data[i].follow_count;
            delete data[i].likeDislikeStaff;
            delete data[i].followStaff;
            delete data[i].type;
            delete data[i].date;
            delete data[i].userId;
        }
    } else {
        for (let i = 0; i < data.length; i++) {
            data[i] = {...data[i], ...data[i].character};
            delete data[i].character;
            if (noUserStats) {
                data[i].userStats = null;
            } else {
                data[i].userStats = {
                    likes_count: data[i].likes_count,
                    dislikes_count: data[i].dislikes_count,
                    favorite_count: data[i].favorite_count,
                    like: false,
                    dislike: false,
                    favorite: false,
                }
                if (data[i].likeDislikeCharacter) {
                    data[i].userStats.like = data[i].likeDislikeCharacter[0]?.type === 'like';
                    data[i].userStats.dislike = data[i].likeDislikeCharacter[0]?.type === 'dislike';
                } else if (statType === 'like_character') {
                    data[i].userStats.like = true;
                } else if (statType === 'dislike_character') {
                    data[i].userStats.dislike = true;
                }

                if (data[i].favoriteCharacter) {
                    data[i].userStats.favorite = !!data[i].favoriteCharacter[0];
                } else if (statType === 'favorite_character') {
                    data[i].userStats.favorite = true;
                }
            }

            delete data[i].likes_count;
            delete data[i].dislikes_count;
            delete data[i].favorite_count;
            delete data[i].likeDislikeCharacter;
            delete data[i].favoriteCharacter;
            delete data[i].type;
            delete data[i].date;
            delete data[i].userId;
        }
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}
