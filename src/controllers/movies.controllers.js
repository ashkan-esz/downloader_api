import {moviesServices} from '../services/index.js';
import {sendResponse} from "./controllerUtils.js";

export async function getNews(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getNews(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getNewsWithDate(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {date, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getNewsWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getUpdates(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getUpdates(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getUpdatesWithDate(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {date, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getUpdatesWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getTopsByLikes(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getTrailers(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getTrailers(userId, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getSortedMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {sortBase, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getSeriesOfDay(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {dayNumber, types, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getMultipleStatus(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {types, dataLevel, imdbScores, malScores, page, count} = req.params;
    let result = await moviesServices.getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaffAndCharacter(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchStaffAndCharacter(userId, filters, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaff(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchStaffOrCharacter(userId, 'staff', filters, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchCharacter(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchStaffOrCharacter(userId, 'character', filters, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovie(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let filters = filterObjectFalsyValues(req.query);
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchMovie(userId, filters, dataLevel, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovieById(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let filters = filterObjectFalsyValues(req.query);
    let {id, dataLevel} = req.params;
    let result = await moviesServices.searchMovieById(userId, id, dataLevel, filters, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaffById(req, res) {
    let userId = req.jwtUserData.userId;
    let {creditsCount} = req.query;
    let id = req.params.id;
    let result = await moviesServices.searchStaffById(userId, id, creditsCount, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchCharacterById(req, res) {
    let userId = req.jwtUserData.userId;
    let {creditsCount} = req.query;
    let id = req.params.id;
    let result = await moviesServices.searchCharacterById(userId, id, creditsCount, req.isGuest);
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

export async function getStaffCreditsById(req, res) {
    let userId = req.jwtUserData.userId;
    let {id, page} = req.params;
    let result = await moviesServices.getStaffCreditsById(userId, id, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getCharacterCreditsById(req, res) {
    let userId = req.jwtUserData.userId;
    let {id, page} = req.params;
    let result = await moviesServices.getCharacterCreditsById(userId, id, page, req.isGuest);
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
    let {embedStaffAndCharacter} = req.query;
    let {statType, dataLevel, page} = req.params;
    let result = await moviesServices.getUserStatsList(userId, statType, dataLevel, page, embedStaffAndCharacter);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function getGenresStatus(req, res) {
    let result = await moviesServices.getGenresStatus(req.url);
    return sendResponse(req, res, result);
}

export async function getMovieSources(req, res) {
    let result = await moviesServices.getMovieSources(req.url);
    return sendResponse(req, res, result);
}

export async function getGenresMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let {embedStaffAndCharacter} = req.query;
    let {types, genres, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page, embedStaffAndCharacter, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getAnimeEnglishNames(req, res) {
    let result = await moviesServices.getAnimeEnglishNames(req.query.japaneseNames);
    return sendResponse(req, res, result);
}

export async function getTodayBirthday(req, res) {
    let {staffOrCharacter, dataLevel, page} = req.params;
    let result = await moviesServices.getTodayBirthday(req.jwtUserData, staffOrCharacter, req.query.followedOnly, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function getMoviesDataForBot(req, res) {
    let {embedStaffAndCharacter, dontUpdateServerDate} = req.query;
    let {botId, moviesRequestName, types, dataLevel, imdbScores, malScores} = req.params;
    let result = await moviesServices.getMoviesDataForBot(botId, moviesRequestName, types, dataLevel, imdbScores, malScores, embedStaffAndCharacter, dontUpdateServerDate);
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
