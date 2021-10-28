import {cachedData} from "../data/cache";
import * as dbMethods from '../data/dbMethods';
import {dataLevelConfig} from "../models/movie";


export async function getNews(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'medium') {
        let cacheResult = cachedData.newMovies.filter(item => types.includes(item.type));
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    return await dbMethods.getNewMovies(types, skip, limit, dataLevelConfig[dataLevel]);
}

export async function getUpdates(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'medium') {
        let cacheResult = cachedData.updateMovies.filter(item => types.includes(item.type));
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    return await dbMethods.getUpdateMovies(types, skip, limit, dataLevelConfig[dataLevel]);
}

export async function getTopsByLikes(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'medium') {
        let cacheResult = cachedData.topsByLikes.filter(item => types.includes(item.type));
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    return await dbMethods.getTopsByLikesMovies(types, skip, limit, dataLevelConfig[dataLevel]);
}

export async function getTrailers(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'medium') {
        let cacheResult = cachedData.newTrailers.filter(item => types.includes(item.type));
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    return await dbMethods.getNewTrailers(types, skip, limit, dataLevelConfig[dataLevel]);
}

export async function getSeriesOfDay(dayNumber, types, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    let cacheResult = cachedData.seriesOfDay[dayNumber].filter(item => types.includes(item.type));
    let result = cacheResult.slice(skip, skip + limit);
    if (result.length === 12) {
        return result;
    }
    //database
    return await dbMethods.getSeriesOfDay(dayNumber, types, skip, limit, dataLevelConfig["medium"]);
}

export async function searchByTitle(title, types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);
    return await dbMethods.searchOnMovieCollectionByTitle(title, types, skip, limit, dataLevelConfig[dataLevel]);
}

export async function searchById(id, dataLevel) {
    return await dbMethods.searchOnMovieCollectionById(id, dataLevelConfig[dataLevel]);
}

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}
