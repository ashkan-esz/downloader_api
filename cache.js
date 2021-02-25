const getCollection = require("./mongoDB");
const {dataConfig} = require("./routes/configs");
const axios = require('axios').default;
const {replaceSpecialCharacters} = require("./crawlers/utils");
const {saveError} = require("./saveError");

let news_movies = []; //3 * 12 = 36
let news_serials = []; //3 * 12 = 36

let updates_movies = []; //3 * 12 = 36
let updates_serials = []; //3 * 12 = 36

let tops_likes_movies = []; //3 * 12 = 36
let tops_likes_serials = []; //3 * 12 = 36

let tops_popularNames = []; //6 * 20 = 120;
let tops_popularShows = []; //2 * 12 = 24

let trailers_movies = []; //3 * 6 = 18
let trailers_serials = []; //3 * 6 = 18

let seriesOfDay = []; // 3 * 12 = 36
let seriesOfWeek0 = null; // 1 * ~100
let seriesOfWeek1 = null; // 1 * ~100

//-------------------------------
//-------------------------------

export function resetCache_all() {
    news_movies = [];
    news_serials = [];
    updates_movies = [];
    updates_serials = [];
    tops_likes_movies = [];
    tops_likes_serials = [];
    trailers_movies = [];
    trailers_serials = [];
}

export async function setCache_all() {
    return new Promise(async (resolve, reject) => {
        try {
            await Promise.all([
                setCache_news(),
                setCache_updates(),
                setCache_Tops_Likes(),
                setCache_Trailers(),
            ]);
            await Promise.all([
                setCache_SeriesOfDay(),
                setCache_seriesOfWeek(),
            ]);
            await setCache_tops_popularNames();
            await setCache_tops_popularShows();
            resolve();
        } catch (error) {
            saveError(error);
            reject();
        }
    });
}

//-------------------------------
//-------------News--------------
export async function setCache_news() {
    try {
        let movieCollection = await getCollection('movies');
        let serialCollection = await getCollection('serials');
        let movieSearch = movieCollection
            .find({}, {projection: dataConfig["low"]})
            .sort({premiered: -1, insert_date: -1})
            .limit(36)
            .toArray();
        let serialSearch = serialCollection
            .find({}, {projection: dataConfig["low"]})
            .sort({premiered: -1})
            .limit(36)
            .toArray();
        let searchResults = await Promise.all([movieSearch, serialSearch]);
        news_movies = searchResults[0];
        news_serials = searchResults[1];
    } catch (error) {
        saveError(error);
    }
}

export function getCache_news_all() {
    if (news_movies.length === 0 || news_serials.length === 0) {
        return null;
    }
    return {
        news_movies,
        news_serials
    };
}

export function getCache_news_singleType(type) {
    let array = type === 'movie' ? news_movies : news_serials;
    if (array.length === 0) {
        return null;
    }
    return array;
}

//-------------------------------
//------------Updates------------
export async function setCache_updates() {
    try {
        let movieCollection = await getCollection('movies');
        let serialCollection = await getCollection('serials');
        let movieSearch = movieCollection
            .find({}, {projection: dataConfig["low"]})
            .sort({update_date: -1 , premiered: -1})
            .limit(36)
            .toArray();
        let serialSearch = serialCollection
            .find({}, {projection: dataConfig["low"]})
            .sort({update_date: -1})
            .limit(36)
            .toArray();
        let searchResults = await Promise.all([movieSearch, serialSearch]);
        updates_movies = searchResults[0];
        updates_serials = searchResults[1];
    } catch (error) {
        saveError(error);
    }
}

export function getCache_updates_all() {
    if (updates_movies.length === 0 || updates_serials.length === 0) {
        return null;
    }
    return {
        updates_movies,
        updates_serials
    };
}

export function getCache_updates_singleType(type) {
    let array = type === 'movie' ? updates_movies : updates_serials;
    if (array.length === 0) {
        return null;
    }
    return array;
}

//----------------------------------
//------------Tops_Likes------------
export async function setCache_Tops_Likes() {
    try {
        let movieCollection = await getCollection('movies');
        let serialCollection = await getCollection('serials');
        let movieSearch = movieCollection
            .find({}, {projection: dataConfig["low"]})
            .sort({like: -1})
            .limit(36)
            .toArray();
        let serialSearch = serialCollection
            .find({}, {projection: dataConfig["low"]})
            .sort({like: -1})
            .limit(36)
            .toArray();
        let searchResults = await Promise.all([movieSearch, serialSearch]);
        tops_likes_movies = searchResults[0];
        tops_likes_serials = searchResults[1];
    } catch (error) {
        saveError(error);
    }
}

export function getCache_Tops_Likes_All() {
    if (tops_likes_movies.length === 0 || tops_likes_serials.length === 0) {
        return null;
    }
    return {
        tops_likes_movies,
        tops_likes_serials
    };
}

export function getCache_Tops_Likes_SingleType(type) {
    let array = type === 'movie' ? tops_likes_movies : tops_likes_serials;
    if (array.length === 0) {
        return null;
    }
    return array;
}

//----------------------------------
//------------Tops_Popular------------
export async function setCache_tops_popularNames() {
    try {
        tops_popularNames = [];
        const pagesCounts = 6; // 6 * 20 = 120
        for (let i = 1; i <= pagesCounts; i++) {
            let response = await axios.get(`https://www.episodate.com/api/most-popular?page=${i}`);
            let data = response.data;
            if (data) {
                let showsNames = data.tv_shows.map(value => replaceSpecialCharacters(value.name.toLowerCase()));
                tops_popularNames.push(...showsNames);
            }
        }
    } catch (error) {
        saveError(error);
    }
}

export function getCache_tops_popularNames() {
    return tops_popularNames;
}

async function setCache_tops_popularShows() {
    try {
        tops_popularShows = [];
        let serialCollection = await getCollection('serials');
        let searchNames = tops_popularNames.slice(0, 24);
        if (searchNames.length > 0) {
            let serialSearch = await serialCollection
                .find({title: {$in: searchNames}}, {projection: dataConfig["low"]})
                .toArray();
            tops_popularShows = serialSearch.sort((a, b) => searchNames.indexOf(a.title) - searchNames.indexOf(b.title));
        }
    } catch (error) {
        saveError(error);
    }
}

export function getCache_tops_popularShows() {
    return tops_popularShows;
}

//----------------------------------
//-------------Trailers-------------
export async function setCache_Trailers() {
    try {
        let movieCollection = await getCollection('movies');
        let serialCollection = await getCollection('serials');
        let movieSearch = movieCollection
            .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
            .sort({premiered: -1, insert_date: -1})
            .limit(18)
            .toArray();
        let serialSearch = serialCollection
            .find({trailers: {$ne: null}}, {projection: {...dataConfig['low'], trailers: 1}})
            .sort({premiered: -1})
            .limit(18)
            .toArray();
        let searchResults = await Promise.all([movieSearch, serialSearch]);
        trailers_movies = searchResults[0];
        trailers_serials = searchResults[1];
    } catch (error) {
        saveError(error);
    }
}

export function getCache_Trailers_All() {
    if (trailers_movies.length === 0 || trailers_serials.length === 0) {
        return null;
    }
    return {
        trailers_movies,
        trailers_serials
    };
}

export function getCache_Trailers_SingleType(type) {
    let array = type === 'movie' ? trailers_movies : trailers_serials;
    if (array.length === 0) {
        return null;
    }
    return array;
}

//----------------------------------
//-----------Series of Day----------
export async function setCache_SeriesOfDay() {
    try {
        seriesOfDay = [];
        let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let date = new Date();
        let dayNumber = date.getDay();
        date.setDate(date.getDate() + 8);
        let collection = await getCollection('serials');
        let result = await collection
            .find({
                releaseDay: daysOfWeek[dayNumber],
                nextEpisode: {$ne: null},
                'nextEpisode.releaseStamp': {$lte: date.toISOString()}
            }, {projection: dataConfig['medium']})
            .sort({premiered: -1})
            .limit(36)
            .toArray();
        if (result) {
            seriesOfDay = result;
        }
    } catch (error) {
        saveError(error);
    }
}

export function getCache_SeriesOfDay() {
    if (seriesOfDay.length === 0) {
        return null;
    }
    return seriesOfDay;
}

//----------------------------------
//-----------Series of Week----------
export async function setCache_seriesOfWeek() {
    seriesOfWeek0 = null;
    seriesOfWeek1 = null;
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let weekCounter = 0; weekCounter < 2; weekCounter++) {
        let date = new Date();
        let dayNumber = date.getDay();
        date.setDate(date.getDate() - dayNumber + 7 * weekCounter + 8); // first day of week
        let daysInfo = [];
        for (let i = 0; i < 7; i++) {
            date.setDate(date.getDate() + 1);
            daysInfo.push({
                releaseDay: daysOfWeek[i],
                nextEpisode: {$ne: null},
                'nextEpisode.releaseStamp': {$lte: date.toISOString()}
            });
        }
        let collection = await getCollection('serials');
        let searchResults = await collection
            .find({
                $or: daysInfo
            }, {projection: dataConfig['medium']})
            .sort({releaseDay: -1})
            .toArray();
        if (searchResults.length > 0) {
            let groupSearchResult = searchResults.reduce((r, a) => {
                r[a.releaseDay] = [...r[a.releaseDay] || [], a];
                return r;
            }, {});
            if (weekCounter === 0) {
                seriesOfWeek0 = groupSearchResult;
            } else {
                seriesOfWeek1 = groupSearchResult;
            }
        }
    }
}

export function getCache_seriesOfWeek(weekNumber) {
    if (weekNumber === 0) {
        return seriesOfWeek0;
    } else {
        return seriesOfWeek1;
    }
}
