const getCollection = require("./mongoDB");
const {dataConfig} = require("./routes/configs");
const axios = require('axios').default;
const {replaceSpecialCharacters} = require("./crawlers/utils");

let news_movies = []; //36
let news_serials = []; //36

let updates_movies = []; //36
let updates_serials = []; //36

let tops_likes_movies = []; //36
let tops_likes_serials = []; //36

let tops_popularNames = []; //6 * 20 = 120;
let tops_popularShows = []; //24

let trailers_movies = []; //18
let trailers_serials = []; //18
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
    await Promise.all([
        setCache_news(),
        setCache_updates(),
        setCache_Tops_Likes(),
        setCache_Trailers(),
        setCache_tops_popularNames(),
        setCache_tops_popularShows()
    ]);
}

//-------------------------------
//-------------News--------------
export async function setCache_news() {
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
    let movieCollection = await getCollection('movies');
    let serialCollection = await getCollection('serials');
    let movieSearch = movieCollection
        .find({}, {projection: dataConfig["low"]})
        .sort({update_date: -1})
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
async function setCache_tops_popularNames() {
    const pagesCounts = 6; // 6 * 20 = 120
    for (let i = 1; i <= pagesCounts; i++) {
        let response = await axios.get(`https://www.episodate.com/api/most-popular?page=${i}`);
        let data = response.data;
        if (data) {
            let showsNames = data.tv_shows.map(value => replaceSpecialCharacters(value.name.toLowerCase()));
            tops_popularNames.push(...showsNames);
        }
    }
}

export function getCache_tops_popularNames() {
    return tops_popularNames;
}

async function setCache_tops_popularShows() {
    let serialCollection = await getCollection('serials');
    let searchNames = tops_popularNames.slice(0, 24);
    let serialSearch = await serialCollection
        .find({title: {$in: searchNames}}, {projection: dataConfig["low"]})
        .toArray();
    tops_popularShows = serialSearch.sort((a, b) => searchNames.indexOf(a.title) - searchNames.indexOf(b.title));
}

export function getCache_tops_popularShows() {
    return tops_popularShows;
}

//----------------------------------
//-------------Trailers-------------
export async function setCache_Trailers() {
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
