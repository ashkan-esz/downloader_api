import * as moviesDbMethods from '../data/db/moviesDbMethods.js';
import * as crawlerMethodsDB from '../data/db/crawlerMethodsDB.js';
import * as userStatsDbMethods from '../data/db/userStatsDbMethods.js';
import {dataLevelConfig} from "../models/movie.js";
import {generateServiceResult} from "./serviceUtils.js";
import {setCache} from "../api/middlewares/moviesCache.js";
import {dataLevelConfig_staff} from "../models/person.js";
import {dataLevelConfig_character} from "../models/character.js";

export async function getNews(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await moviesDbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (newMovies === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (newMovies.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
    }
    return generateServiceResult({data: newMovies}, 200, '');
}

export async function getUpdates(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await moviesDbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (updateMovies === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (updateMovies.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
    }
    return generateServiceResult({data: updateMovies}, 200, '');
}

export async function getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await moviesDbMethods.getTopsByLikesMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (topsByLikesMovies === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (topsByLikesMovies.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
    }
    return generateServiceResult({data: topsByLikesMovies}, 200, '');
}

export async function getTrailers(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await moviesDbMethods.getNewTrailers(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (trailersData === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (trailersData.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
    }
    return generateServiceResult({data: trailersData}, 200, '');
}

export async function getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let sortedData = await moviesDbMethods.getSortedMovies(userId, sortBase, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (sortedData === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (sortedData.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
    }
    return generateServiceResult({data: sortedData}, 200, '');
}

export async function getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await moviesDbMethods.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, skip, limit, dataLevelConfig["medium"]);
    if (seriesOfDay === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (seriesOfDay.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
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
        }, 500, 'Server error, try again later');
    } else if (multiple.inTheaters.length === 0 && multiple.comingSoon.length === 0 && multiple.news.length === 0 && multiple.update.length === 0) {
        return generateServiceResult({data: multiple}, 404, 'Movies not found');
    }
    return generateServiceResult({data: multiple}, 200, '');
}

export async function searchByTitle(userId, title, types, dataLevel, years, genres, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let searchDataArray = await Promise.allSettled([
        moviesDbMethods.searchOnMovieCollectionByTitle(userId, title, types, years, genres, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        moviesDbMethods.searchOnCollectionByName('staff', userId, title, skip, limit, dataLevelConfig_staff[dataLevel]),
        moviesDbMethods.searchOnCollectionByName('characters', userId, title, skip, limit, dataLevelConfig_character[dataLevel]),
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
        }, 500, 'Server error, try again later');
    } else if (searchData.movies.length === 0 && searchData.staff.length === 0 && searchData.characters.length === 0) {
        return generateServiceResult({data: searchData}, 404, 'Movie/Staff/Character not found');
    }
    return generateServiceResult({data: searchData}, 200, '');
}

export async function searchMovieById(userId, id, dataLevel) {
    let movieData = await moviesDbMethods.searchOnCollectionById("movies", userId, id, dataLevelConfig[dataLevel]);
    if (movieData === 'error') {
        return generateServiceResult({data: null}, 500, 'Server error, try again later');
    } else if (!movieData) {
        return generateServiceResult({data: null}, 404, 'Movie not found');
    }
    return generateServiceResult({data: movieData}, 200, '');
}

export async function searchStaffById(userId, id) {
    let staffData = await moviesDbMethods.searchOnCollectionById("staff", userId, id, {});
    if (staffData === 'error') {
        return generateServiceResult({data: null}, 500, 'Server error, try again later');
    } else if (!staffData) {
        return generateServiceResult({data: null}, 404, 'Staff not found');
    }
    return generateServiceResult({data: staffData}, 200, '');
}

export async function searchCharacterById(userId, id) {
    let characterData = await moviesDbMethods.searchOnCollectionById("characters", userId, id, {});
    if (characterData === 'error') {
        return generateServiceResult({data: null}, 500, 'Server error, try again later');
    } else if (!characterData) {
        return generateServiceResult({data: null}, 404, 'Character not found');
    }
    return generateServiceResult({data: characterData}, 200, '');
}

export async function userStatsService(userId, statType, id, isRemove) {
    //todo : handle invalid statType
    if (isRemove) {
        let removeResult = await userStatsDbMethods.handleRemoveUserStatsTransaction(userId, statType, id);
        const code = removeResult === 'error' ? 500 : removeResult === 'notfound' ? 404 : 200;
        const errorMessage = removeResult === 'error' ? 'Server error, try again later' : removeResult === 'notfound' ? 'Document not found' : '';
        return generateServiceResult({}, code, errorMessage);
    }

    let result = await userStatsDbMethods.handleAddUserStatsTransaction(userId, statType, id);
    if (result === 'error') {
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
    if (result === 'notfound') {
        return generateServiceResult({}, 404, 'Document not found');
    }
    if (result === 'already exist') {
        return generateServiceResult({}, 409, 'Already exist');
    }
    return generateServiceResult({}, 200, '');
}

export async function getUserStatsList(userId, statType, dataLevel, page) {
    //todo : handle invalid statType
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
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (userStatsList.length === 0) {
        return generateServiceResult({data: []}, 404, 'Documents not found');
    }
    return generateServiceResult({data: userStatsList}, 200, '');
}

export async function getGenresStatus(routeUrl) {
    let genres = await moviesDbMethods.getGenresStatusDB();
    if (genres === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (genres.length === 0) {
        return generateServiceResult({data: []}, 404, 'Genres not found');
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
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    } else if (result.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movies not found');
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getMovieSources(routeUrl) {
    let result = await crawlerMethodsDB.getSourcesObjDB();
    if (!result || result === 'error') {
        return generateServiceResult({data: []}, 500, 'Server error, try again later');
    }

    delete result._id;
    delete result.title;
    delete result.pageCounter_time;
    let sourcesUrls = Object.keys(result).map(sourceName => ({
        sourceName: sourceName,
        url: result[sourceName].movie_url.replace('/page/', '')
    }));

    if (sourcesUrls.length === 0) {
        return generateServiceResult({data: []}, 404, 'Movie sources not found');
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
