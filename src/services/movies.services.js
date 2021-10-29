import * as dbMethods from '../data/dbMethods';
import {setCache} from "../api/middlewares/moviesCache";
import {dataLevelConfig} from "../models/movie";

export async function getNews(types, dataLevel, imdbScores, malScores, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await dbMethods.getNewMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (newMovies.length > 0) {
        setCache(routeUrl, newMovies);
    }

    return newMovies;
}

export async function getUpdates(types, dataLevel, imdbScores, malScores, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await dbMethods.getUpdateMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (updateMovies.length > 0) {
        setCache(routeUrl, updateMovies);
    }

    return updateMovies;
}

export async function getTopsByLikes(types, dataLevel, imdbScores, malScores, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await dbMethods.getTopsByLikesMovies(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (topsByLikesMovies.length > 0) {
        setCache(routeUrl, topsByLikesMovies);
    }

    return topsByLikesMovies;
}

export async function getTrailers(types, dataLevel, imdbScores, malScores, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await dbMethods.getNewTrailers(types, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]);
    if (trailersData.length > 0) {
        setCache(routeUrl, trailersData);
    }

    return trailersData;
}

export async function getSeriesOfDay(dayNumber, types, imdbScores, malScores, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await dbMethods.getSeriesOfDay(dayNumber, types, imdbScores, malScores, skip, limit, dataLevelConfig["medium"]);
    if (seriesOfDay.length > 0) {
        setCache(routeUrl, seriesOfDay);
    }

    return seriesOfDay;
}

export async function searchByTitle(title, types, dataLevel, years, imdbScores, malScores, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let staffAndCharactersProjection = dataLevel === 'high'
        ? {}
        : {
            name: 1,
            rawName: 1,
            gender: 1,
            image: 1,
            modelName: 1,
        };
    let searchData = await Promise.allSettled([
        dbMethods.searchOnMovieCollectionByTitle(title, types, years, imdbScores, malScores, skip, limit, dataLevelConfig[dataLevel]),
        dbMethods.searchOnCollectionByName('staff', title, skip, limit, staffAndCharactersProjection),
        dbMethods.searchOnCollectionByName('characters', title, skip, limit, staffAndCharactersProjection),
    ]);
    searchData = searchData.map(item => item.value).flat(1);
    if (searchData.length > 0) {
        setCache(routeUrl, searchData);
    }

    return searchData;
}

export async function searchById(id, dataLevel, routeUrl) {
    let movieData = await dbMethods.searchOnMovieCollectionById(id, dataLevelConfig[dataLevel]);
    if (movieData) {
        setCache(routeUrl, movieData);
    }

    return movieData;
}

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}
