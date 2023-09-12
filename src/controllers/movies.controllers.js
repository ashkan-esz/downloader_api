import {moviesServices} from '../services/index.js';
import {sendResponse} from "./controllerUtils.js";

export async function getMoviesOfApiName(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {apiName, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getMoviesOfApiName(userId, apiName, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getNewsWithDate(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {date, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getNewsWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getUpdatesWithDate(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {date, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getUpdatesWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getSortedMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {sortBase, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getSeriesOfDay(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {dayNumber, types, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getMultipleStatus(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {types, dataLevel, imdbScores, malScores, page, count} = req.params;
    let result = await moviesServices.getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaffAndCharacter(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    delete filters.noUserStats;
    let {noUserStats} = req.query;
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchStaffAndCharacter(userId, filters, dataLevel, page, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaff(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    delete filters.noUserStats;
    let {noUserStats} = req.query;
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchStaffOrCharacter(userId, 'staff', filters, dataLevel, page, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchCharacter(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    delete filters.noUserStats;
    let {noUserStats} = req.query;
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchStaffOrCharacter(userId, 'character', filters, dataLevel, noUserStats, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovie(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    delete filters.noUserStats;
    delete filters.embedStaffAndCharacter;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchMovie(userId, filters, dataLevel, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovieById(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    delete filters.noUserStats;
    delete filters.embedStaffAndCharacter;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {id, dataLevel} = req.params;
    let result = await moviesServices.searchMovieById(userId, id, dataLevel, filters, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaffOrCharacterById(req, res) {
    let userId = req.jwtUserData.userId;
    let {creditsCount, noUserStats} = req.query;
    let {id, staffOrCharacter} = req.params;
    let result = await moviesServices.searchStaffOrCharacterById(userId, staffOrCharacter, id, creditsCount, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function getMovieCreditsById(req, res) {
    let userId = req.jwtUserData.userId;
    let {id, page} = req.params;
    let result = await moviesServices.getMovieCreditsById(userId, id, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getStaffOrCharacterCreditsById(req, res) {
    let userId = req.jwtUserData.userId;
    let {staffOrCharacter, id, page} = req.params;
    let result = await moviesServices.getStaffOrCharacterCreditsById(userId, staffOrCharacter, id, page, req.isGuest);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function userStatsLikeDislikeService(req, res) {
    let userId = req.jwtUserData.userId;
    let isRemove = req.query.remove;
    let {id, statType} = req.params;
    let result = await moviesServices.userStatsLikeDislikeService(userId, statType, id, isRemove);
    return sendResponse(req, res, result);
}

export async function userStatsFollowStaffService(req, res) {
    let userId = req.jwtUserData.userId;
    let isRemove = req.query.remove;
    let {id, statType} = req.params;
    let result = await moviesServices.userStatsFollowStaffService(userId, statType, id, isRemove);
    return sendResponse(req, res, result);
}

export async function userStatsFinishMovieService(req, res) {
    let userId = req.jwtUserData.userId;
    let {remove, favorite, startDate, endDate, score} = req.query;
    let {id} = req.params;
    let result = await moviesServices.userStatsFinishMovieService(userId, id, startDate, endDate, score, remove, favorite);
    return sendResponse(req, res, result);
}

export async function userStatsFavoriteMovieService(req, res) {
    let userId = req.jwtUserData.userId;
    let {id, favorite} = req.params;
    let result = await moviesServices.userStatsFavoriteMovieService(userId, id, favorite);
    return sendResponse(req, res, result);
}

export async function userStatsFollowMovieService(req, res) {
    let userId = req.jwtUserData.userId;
    let {remove, score, watch_season, watch_episode} = req.query;
    let {id} = req.params;
    let result = await moviesServices.userStatsFollowMovieService(userId, id, watch_season, watch_episode, score, remove);
    return sendResponse(req, res, result);
}

export async function userStatsWatchListMovieService(req, res) {
    let userId = req.jwtUserData.userId;
    let {remove, score} = req.query;
    let {id} = req.params;
    let result = await moviesServices.userStatsWatchListMovieService(userId, id, score, remove);
    return sendResponse(req, res, result);
}

export async function userStatsHandleScore(req, res) {
    let userId = req.jwtUserData.userId;
    let {id, score, stat_list_type} = req.params;
    let result = await moviesServices.userStatsHandleScore(userId, id, score, stat_list_type);
    return sendResponse(req, res, result);
}

export async function userStatsHandleWatchState(req, res) {
    let userId = req.jwtUserData.userId;
    let {id, watch_season, watch_episode, stat_list_type} = req.params;
    let result = await moviesServices.userStatsHandleWatchState(userId, id, watch_season, watch_episode, stat_list_type);
    return sendResponse(req, res, result);
}

export async function getUserStatsList(req, res) {
    let userId = req.jwtUserData.userId;
    let {sortBy, favoritesOnly, dropsOnly, embedStaffAndCharacter, noUserStats} = req.query;
    let {statType, dataLevel, page} = req.params;
    let result = await moviesServices.getUserStatsList(userId, statType, dataLevel, sortBy, favoritesOnly, dropsOnly, page, embedStaffAndCharacter, noUserStats);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function getGenresStatus(req, res) {
    let result = await moviesServices.getGenresStatus();
    return sendResponse(req, res, result);
}

export async function getMovieSources(req, res) {
    let result = await moviesServices.getMovieSources();
    return sendResponse(req, res, result);
}

export async function getGenresMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter, noUserStats} = req.query;
    let {types, genres, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page, embedStaffAndCharacter, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getAnimeEnglishNames(req, res) {
    let result = await moviesServices.getAnimeEnglishNames(req.query.japaneseNames);
    return sendResponse(req, res, result);
}

export async function getTodayBirthday(req, res) {
    let {noUserStats} = req.query;
    let {staffOrCharacter, dataLevel, page} = req.params;
    let result = await moviesServices.getTodayBirthday(req.jwtUserData, staffOrCharacter, req.query.followedOnly, dataLevel, page, noUserStats, req.isGuest);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function getMoviesDataForBot(req, res) {
    let {embedStaffAndCharacter, dontUpdateServerDate, noUserStats} = req.query;
    let {botId, moviesRequestName, types, dataLevel, imdbScores, malScores} = req.params;
    let result = await moviesServices.getMoviesDataForBot(botId, moviesRequestName, types, dataLevel, imdbScores, malScores, embedStaffAndCharacter, noUserStats, dontUpdateServerDate);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

function filterObjectFalsyValues(object) {
    let filters = Object.keys(object)
        .filter((key) => {
            if (Array.isArray(object[key])) {
                return object[key].length > 0;
            }
            return object[key];
        })
        .reduce((cur, key) => {
            return Object.assign(cur, {[key]: object[key]})
        }, {});
    delete filters.testUser;
    return filters;
}
