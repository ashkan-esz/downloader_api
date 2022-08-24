import * as moviesDbMethods from '../data/db/moviesDbMethods.js';
import * as crawlerMethodsDB from '../data/db/crawlerMethodsDB.js';
import * as userStatsDbMethods from '../data/db/userStatsDbMethods.js';
import {dataLevelConfig} from "../models/movie.js";
import {generateServiceResult, errorMessage} from "./serviceUtils.js";
import {setCache} from "../api/middlewares/moviesCache.js";
import {dataLevelConfig_staff} from "../models/person.js";
import {dataLevelConfig_character} from "../models/character.js";

export async function getNews(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await moviesDbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (newMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (newMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: newMovies}, 200, '');
}

export async function getUpdates(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await moviesDbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (updateMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (updateMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: updateMovies}, 200, '');
}

export async function getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await moviesDbMethods.getTopsByLikesMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (topsByLikesMovies === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (topsByLikesMovies.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: topsByLikesMovies}, 200, '');
}

export async function getTrailers(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await moviesDbMethods.getNewTrailers(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (trailersData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (trailersData.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: trailersData}, 200, '');
}

export async function getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let sortedData = await moviesDbMethods.getSortedMovies(userId, sortBase, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (sortedData === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (sortedData.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: sortedData}, 200, '');
}

export async function getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await moviesDbMethods.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, skip, limit, dataLevelConfig["medium"]);
    if (seriesOfDay === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (seriesOfDay.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: seriesOfDay}, 200, '');
}

export async function getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count) {
    let {skip, limit} = getSkipLimit(page, count);

    let result = await Promise.allSettled([
        moviesDbMethods.getSortedMovies(userId, 'inTheaters', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.getSortedMovies(userId, 'comingSoon', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel])
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

export async function searchMovieStaffCharacter(userId, title, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let searchDataArray = await Promise.allSettled([
        moviesDbMethods.searchOnMovieCollectionWithFilters(userId, {title}, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('staff', userId, {name: title}, skip, limit, dataLevelConfig_staff[staffCharacterDataLevel]),
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('characters', userId, {name: title}, skip, limit, dataLevelConfig_character[staffCharacterDataLevel]),
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

export async function searchStaffAndCharacter(userId, filters, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let searchDataArray = await Promise.allSettled([
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('staff', userId, filters, skip, limit, dataLevelConfig_staff[staffCharacterDataLevel]),
        moviesDbMethods.searchOnStaffOrCharactersWithFilters('characters', userId, filters, skip, limit, dataLevelConfig_character[staffCharacterDataLevel]),
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

export async function searchStaffOrCharacter(userId, staffOrCharacters, filters, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffCharacterDataLevel = ['low', 'medium', 'high'].includes(dataLevel) ? dataLevel : 'high';
    let searchResult = await moviesDbMethods.searchOnStaffOrCharactersWithFilters(staffOrCharacters, userId, filters, skip, limit, dataLevelConfig_staff[staffCharacterDataLevel])

    if (searchResult === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (searchResult.length === 0) {
        let temp = staffOrCharacters === 'staff' ? errorMessage.staffNotFound : errorMessage.characterNotFound;
        return generateServiceResult({data: []}, 404, temp);
    }
    return generateServiceResult({data: searchResult}, 200, '');
}

export async function searchMovie(userId, filters, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let searchResult = await moviesDbMethods.searchOnMovieCollectionWithFilters(userId, filters, skip, limit, dataLevelConfig[dataLevel]);

    if (searchResult === 'error') {
        return generateServiceResult({data: []}, 500, errorMessage.serverError);
    } else if (searchResult.length === 0) {
        return generateServiceResult({data: []}, 404, errorMessage.moviesNotFound);
    }
    return generateServiceResult({data: searchResult}, 200, '');
}

export async function searchMovieById(userId, id, dataLevel, filters) {
    let movieData = await moviesDbMethods.searchOnCollectionById("movies", userId, id, filters, dataLevelConfig[dataLevel]);
    if (movieData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!movieData) {
        return generateServiceResult({data: null}, 404, errorMessage.movieNotFound);
    }
    return generateServiceResult({data: movieData}, 200, '');
}

export async function searchStaffById(userId, id) {
    let staffData = await moviesDbMethods.searchOnCollectionById("staff", userId, id, {}, {});
    if (staffData === 'error') {
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    } else if (!staffData) {
        return generateServiceResult({data: null}, 404, errorMessage.staffNotFound);
    }
    return generateServiceResult({data: staffData}, 200, '');
}

export async function searchCharacterById(userId, id) {
    let characterData = await moviesDbMethods.searchOnCollectionById("characters", userId, id, {}, {});
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

    setCache(routeUrl, {
        data: genres,
        code: 200,
        errorMessage: '',
    }, 30 * 60);

    return generateServiceResult({data: genres}, 200, '');
}

export async function getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await moviesDbMethods.getGenresMoviesDB(userId, genres, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
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

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}
