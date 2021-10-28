import * as dbMethods from '../data/dbMethods';
import {setCache} from "../api/middlewares/moviesCache";
import {dataLevelConfig} from "../models/movie";

export async function getNews(types, dataLevel, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let newMovies = await dbMethods.getNewMovies(types, skip, limit, dataLevelConfig[dataLevel]);
    if (newMovies.length > 0) {
        setCache(routeUrl, newMovies);
    }

    return newMovies;
}

export async function getUpdates(types, dataLevel, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let updateMovies = await dbMethods.getUpdateMovies(types, skip, limit, dataLevelConfig[dataLevel]);
    if (updateMovies.length > 0) {
        setCache(routeUrl, updateMovies);
    }

    return updateMovies;
}

export async function getTopsByLikes(types, dataLevel, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let topsByLikesMovies = await dbMethods.getTopsByLikesMovies(types, skip, limit, dataLevelConfig[dataLevel]);
    if (topsByLikesMovies.length > 0) {
        setCache(routeUrl, topsByLikesMovies);
    }

    return topsByLikesMovies;
}

export async function getTrailers(types, dataLevel, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let trailersData = await dbMethods.getNewTrailers(types, skip, limit, dataLevelConfig[dataLevel]);
    if (trailersData.length > 0) {
        setCache(routeUrl, trailersData);
    }

    return trailersData;
}

export async function getSeriesOfDay(dayNumber, types, page, routeUrl) {
    let {skip, limit} = getSkipLimit(page, 12);

    let seriesOfDay = await dbMethods.getSeriesOfDay(dayNumber, types, skip, limit, dataLevelConfig["medium"]);
    if (seriesOfDay.length > 0) {
        setCache(routeUrl, seriesOfDay);
    }

    return seriesOfDay;
}

export async function searchByTitle(title, types, dataLevel, page, routeUrl) {
    //todo : advanced search
    let {skip, limit} = getSkipLimit(page, 12);

    let movieSearchData = await dbMethods.searchOnMovieCollectionByTitle(title, types, skip, limit, dataLevelConfig[dataLevel]);
    if (movieSearchData.length > 0) {
        setCache(routeUrl, movieSearchData);
    }

    return movieSearchData;
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
