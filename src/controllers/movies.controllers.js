import {moviesServices} from '../services/index.js';
import {sendResponse} from "./controllerUtils.js";

export async function getNews(req, res) {
    let userId = req.jwtUserData.userId;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getNews(userId, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getNewsWithDate(req, res) {
    let userId = req.jwtUserData.userId;
    let {date, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getNewsWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getUpdates(req, res) {
    let userId = req.jwtUserData.userId;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getUpdates(userId, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getUpdatesWithDate(req, res) {
    let userId = req.jwtUserData.userId;
    let {date, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getUpdatesWithDate(userId, date, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getTopsByLikes(req, res) {
    let userId = req.jwtUserData.userId;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getTrailers(req, res) {
    let userId = req.jwtUserData.userId;
    let {types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getTrailers(userId, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getSortedMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let {sortBase, types, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getSeriesOfDay(req, res) {
    let userId = req.jwtUserData.userId;
    let {dayNumber, types, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getMultipleStatus(req, res) {
    let userId = req.jwtUserData.userId;
    let {types, dataLevel, imdbScores, malScores, page, count} = req.params;
    let result = await moviesServices.getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovieStaffCharacter(req, res) {
    let userId = req.jwtUserData.userId;
    let {title, dataLevel, page} = req.params;
    let result = await moviesServices.searchMovieStaffCharacter(userId, title, dataLevel, page, req.isGuest);
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
    let result = await moviesServices.searchStaffOrCharacter(userId, 'characters', filters, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovie(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    let {dataLevel, page} = req.params;
    let result = await moviesServices.searchMovie(userId, filters, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchMovieById(req, res) {
    let userId = req.jwtUserData.userId;
    let filters = filterObjectFalsyValues(req.query);
    let {id, dataLevel} = req.params;
    let result = await moviesServices.searchMovieById(userId, id, dataLevel, filters, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchStaffById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;
    let result = await moviesServices.searchStaffById(userId, id, req.isGuest);
    return sendResponse(req, res, result);
}

export async function searchCharacterById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;
    let result = await moviesServices.searchCharacterById(userId, id, req.isGuest);
    return sendResponse(req, res, result);
}

export async function userStatsService(req, res) {
    let userId = req.jwtUserData.userId;
    let isRemove = req.query.remove;
    let {id, statType} = req.params;
    let result = await moviesServices.userStatsService(userId, statType, id, isRemove);
    return sendResponse(req, res, result);
}

export async function getUserStatsList(req, res) {
    let userId = req.jwtUserData.userId;
    let {statType, dataLevel, page} = req.params;
    let result = await moviesServices.getUserStatsList(userId, statType, dataLevel, page);
    return sendResponse(req, res, result);
}

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
    let {types, genres, dataLevel, imdbScores, malScores, page} = req.params;
    let result = await moviesServices.getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

export async function getAnimeEnglishNames(req, res) {
    let result = await moviesServices.getAnimeEnglishNames(req.query.japaneseNames);
    return sendResponse(req, res, result);
}

export async function getTodayBirthday(req, res) {
    let {staffOrCharacters, dataLevel, page} = req.params;
    let result = await moviesServices.getTodayBirthday(req.jwtUserData, staffOrCharacters, req.query.followedOnly, dataLevel, page, req.isGuest);
    return sendResponse(req, res, result);
}

//--------------------------------------------
//--------------------------------------------

export async function getMoviesDataForBot(req, res) {
    let {botId, moviesRequestName, types, dataLevel, imdbScores, malScores} = req.params;
    let result = await moviesServices.getMoviesDataForBot(botId, moviesRequestName, types, dataLevel, imdbScores, malScores, req.query.dontUpdateServerDate);
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
