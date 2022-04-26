import * as dbMethods from '../data/dbMethods';
import * as likeDbMethods from '../data/likeDbMethods';
import {dataLevelConfig} from "../models/movie";
import {generateServiceResult} from "./users.services";
import {setCache} from "../api/middlewares/moviesCache";

export async function getNews(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await dbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    addFieldLikeOrDislike(newMovies);

    return newMovies;
}

export async function getUpdates(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await dbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    addFieldLikeOrDislike(updateMovies);

    return updateMovies;
}

export async function getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await dbMethods.getTopsByLikesMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    addFieldLikeOrDislike(topsByLikesMovies);

    return topsByLikesMovies;
}

export async function getTrailers(userId, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await dbMethods.getNewTrailers(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    addFieldLikeOrDislike(trailersData);

    return trailersData;
}

export async function getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);
    let sortedData = await dbMethods.getSortedMovies(userId, sortBase, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    addFieldLikeOrDislike(sortedData);

    return sortedData;
}

export async function getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await dbMethods.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, skip, limit, dataLevelConfig["medium"]);
    addFieldLikeOrDislike(seriesOfDay);

    return seriesOfDay;
}

export async function getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count) {
    let {skip, limit} = getSkipLimit(page, count);

    let result = await Promise.allSettled([
        dbMethods.getSortedMovies(userId, 'inTheaters', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        dbMethods.getSortedMovies(userId, 'comingSoon', types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        dbMethods.getNewMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        dbMethods.getUpdateMovies(userId, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel])
    ]);

    let multipleStatus = {
        inTheaters: result[0].value || [],
        comingSoon: result[1].value || [],
        news: result[2].value || [],
        update: result[3].value || [],
    }

    addFieldLikeOrDislike(multipleStatus.inTheaters);
    addFieldLikeOrDislike(multipleStatus.comingSoon);
    addFieldLikeOrDislike(multipleStatus.news);
    addFieldLikeOrDislike(multipleStatus.update);

    return multipleStatus;
}

export async function searchByTitle(userId, title, types, dataLevel, years, genres, imdbScores, malScores, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffAndCharactersProjection = dataLevel === 'high'
        ? {}
        : {
            name: 1,
            rawName: 1,
            gender: 1,
            imageData: 1,
            likesCount: 1,
            dislikesCount: 1,
        };
    let searchDataArray = await Promise.allSettled([
        dbMethods.searchOnMovieCollectionByTitle(userId, title, types, years, genres, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        dbMethods.searchOnCollectionByName('staff', userId, title, skip, limit, staffAndCharactersProjection),
        dbMethods.searchOnCollectionByName('characters', userId, title, skip, limit, staffAndCharactersProjection),
    ]);
    let searchData = {
        movies: searchDataArray[0].value || [],
        staff: searchDataArray[1].value || [],
        characters: searchDataArray[2].value || [],
    }

    addFieldLikeOrDislike(searchData.movies);
    addFieldLikeOrDislike(searchData.staff);
    addFieldLikeOrDislike(searchData.characters);

    return searchData;
}

export async function searchMovieById(userId, id, dataLevel) {
    let movieData = await dbMethods.searchOnCollectionById("movies", userId, id, dataLevelConfig[dataLevel]);
    if (movieData) {
        addFieldLikeOrDislike([movieData]);
    }

    return movieData;
}

export async function searchStaffById(userId, id) {
    let staffData = await dbMethods.searchOnCollectionById("staff", userId, id, {});
    if (staffData) {
        addFieldLikeOrDislike([staffData]);
    }

    return staffData;
}

export async function searchCharacterById(userId, id) {
    let characterData = await dbMethods.searchOnCollectionById("characters", userId, id, {});
    if (characterData) {
        addFieldLikeOrDislike([characterData]);
    }

    return characterData;
}

export async function likeOrDislikeService(userId, docType, id, likeOrDislike, isRemove) {
    if (isRemove) {
        let removeResult = await likeDbMethods.handleRemoveLikeOrDislikeTransaction(userId, docType, id, likeOrDislike);
        const code = removeResult === 'error' ? 500 : removeResult === 'notfound' ? 404 : 200;
        const errorMessage = removeResult === 'error' ? 'Server error, try again later' : removeResult === 'notfound' ? 'Cannot find movie' : '';
        return generateServiceResult({}, code, errorMessage);
    }

    let result = await likeDbMethods.handleLikeOrDislikeTransaction(userId, docType, id, likeOrDislike);
    if (result === 'error') {
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
    if (result === 'notfound') {
        return generateServiceResult({}, 404, 'Cannot find movie');
    }
    if (result === 'already exist') {
        return generateServiceResult({}, 409, 'already exist');
    }
    return generateServiceResult({}, 200, '');
}

export async function getGenresStatus(routeUrl) {
    let result = await dbMethods.getGenresStatusDB();

    if (result === 'error') {
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
    if (result.length > 0) {
        setCache(routeUrl, {
            data: result,
            code: 200,
            errorMessage: '',
        }, 30 * 60);
    }
    return generateServiceResult({data: result}, 200, '');
}

export async function getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let result = await dbMethods.getGenresMoviesDB(userId, genres, types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (result !== 'error') {
        addFieldLikeOrDislike(result);
        return generateServiceResult({data: result}, 200, '');
    }
    return generateServiceResult({}, 500, 'Server error, try again later');
}

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}

export function addFieldLikeOrDislike(docs) {
    for (let i = 0; i < docs.length; i++) {
        docs[i].likeOrDislike = docs[i].likeBucket.length > 0
            ? docs[i].likeBucket[0].type
            : '';
        delete docs[i].likeBucket;
    }
}
