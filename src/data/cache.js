import * as dbMethods from '../data/dbMethods';
import {dataLevelConfig} from "../models/movie";
import {saveError} from "../error/saveError";

//todo : check mem-cache

const maxCacheNumber = 48; // 4 * 12
export const cachedData = {
    newMovies: [],
    updateMovies: [],
    topsByLikes: [],
    newTrailers: [],
    seriesOfDay: [[], [], [], [], [], [], []],
    seriesOfWeek: [],
}

//-------------------------------
//-------------------------------
export async function setCacheAll() {
    try {
        await Promise.allSettled([
            setNewMovies(),
            setUpdateMovies(),
            setTopsByLikes(),
            setNewTrailers(),
            setCache_SeriesOfDay(),
        ]);
    } catch (error) {
        saveError(error);
    }
}

async function setNewMovies() {
    cachedData.newMovies = await dbMethods.getNewMovies(
        ['movie', 'serial', 'anime_movie', 'anime_serial'],
        0, maxCacheNumber,
        dataLevelConfig["medium"]);
}

async function setUpdateMovies() {
    cachedData.updateMovies = await dbMethods.getUpdateMovies(
        ['movie', 'serial', 'anime_movie', 'anime_serial'],
        0, maxCacheNumber,
        dataLevelConfig["medium"]);
}

async function setTopsByLikes() {
    cachedData.topsByLikes = await dbMethods.getTopsByLikesMovies(
        ['movie', 'serial', 'anime_movie', 'anime_serial'],
        0, maxCacheNumber,
        dataLevelConfig["medium"]);
}

async function setNewTrailers() {
    cachedData.newTrailers = await dbMethods.getNewTrailers(
        ['movie', 'serial', 'anime_movie', 'anime_serial'],
        0, maxCacheNumber,
        dataLevelConfig["medium"]);
}

async function setCache_SeriesOfDay() {
    for (let i = 0; i < 7; i++) {
        cachedData.seriesOfDay[i] = await dbMethods.getSeriesOfDay(
            i, ['movie', 'serial', 'anime_movie', 'anime_serial'],
            0, maxCacheNumber,
            dataLevelConfig["medium"]);
    }
}
