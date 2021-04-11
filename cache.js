const getCollection = require("./mongoDB");
const {dataConfig} = require("./routes/configs");
const axios = require('axios').default;
const {replaceSpecialCharacters} = require("./crawlers/utils");
const {saveError} = require("./saveError");

let news = []; //5 * 12 = 60
let updates = []; //5 * 12 = 60
let topLikes = []; //5 * 12 = 60

let popularIMDBShowsNames = []; //5 * 20 = 100;
let popularIMDBShows = []; //4 * 12 = 48

let trailers = []; //6 * 6 = 36

let seriesOfDay = [[], [], []]; //3 * 4 * 12 = 3 * 48
let seriesOfWeek0 = null; // 1 * ~100
let seriesOfWeek1 = null; // 1 * ~100

//-------------------------------
//-------------------------------
export async function setCache_all() {
    return new Promise(async (resolve, reject) => {
        try {
            await Promise.all([
                setCache_news(),
                setCache_updates(),
                setCache_TopLikes(),
                setCache_Trailers(),
            ]);
            await Promise.all([
                setCache_SeriesOfDay(),
                setCache_seriesOfWeek(),
            ]);
            await setCache_popularIMDBShowsNames();
            await setCache_popularIMDBShows();
            resolve();
        } catch (error) {
            saveError(error);
            reject();
        }
    });
}

//-------------------------------
//-------------News--------------
async function setCache_news() {
    try {
        let collection = await getCollection('movies');
        news = await collection
            .find({}, {projection: dataConfig["low"]})
            .sort({year: -1, insert_date: -1})
            .limit(60)
            .toArray();
    } catch (error) {
        news = [];
        saveError(error);
    }
}

export function getCache_news(types) {
    if (types.length === 2) {
        return news;
    } else {
        return news.filter(item => item.type === types[0]);
    }
}

//-------------------------------
//------------Updates------------
async function setCache_updates() {
    try {
        let collection = await getCollection('movies');
        updates = await collection
            .find({}, {projection: dataConfig["low"]})
            .sort({update_date: -1, premiered: -1})
            .limit(60)
            .toArray();
    } catch (error) {
        updates = [];
        saveError(error);
    }
}

export function getCache_updates(types) {
    if (types.length === 2) {
        return updates;
    } else {
        return updates.filter(item => item.type === types[0]);
    }
}

//----------------------------------
//------------Tops_Likes------------
async function setCache_TopLikes() {
    try {
        let collection = await getCollection('movies');
        topLikes = await collection
            .find({}, {projection: dataConfig["low"]})
            .sort({like: -1})
            .limit(60)
            .toArray();
    } catch (error) {
        topLikes = [];
        saveError(error);
    }
}

export function getCache_TopLikes(types) {
    if (types.length === 2) {
        return topLikes;
    } else {
        return topLikes.filter(item => item.type === types[0]);
    }
}

//----------------------------------
//------------Tops_Popular----------
export async function setCache_popularIMDBShowsNames() {
    try {
        let temp = [];
        const pagesCounts = 5; // 5 * 20 = 100
        for (let i = 1; i <= pagesCounts; i++) {
            let response = await axios.get(`https://www.episodate.com/api/most-popular?page=${i}`);
            let data = response.data;
            if (data) {
                let showsNames = data.tv_shows.map(value => replaceSpecialCharacters(value.name.toLowerCase()));
                temp.push(...showsNames);
            }
        }
        popularIMDBShowsNames = temp;
    } catch (error) {
        popularIMDBShowsNames = [];
        saveError(error);
    }
}

export function getCache_popularIMDBShowsNames() {
    return popularIMDBShowsNames;
}

async function setCache_popularIMDBShows() {
    try {
        let collection = await getCollection('movies');
        let searchNames = popularIMDBShowsNames.slice(0, 48);
        if (searchNames.length > 0) {
            let serialSearch = await collection
                .find({title: {$in: searchNames}}, {projection: dataConfig["low"]})
                .toArray();
            popularIMDBShows = serialSearch.sort((a, b) => searchNames.indexOf(a.title) - searchNames.indexOf(b.title));
        }
    } catch (error) {
        popularIMDBShows = [];
        saveError(error);
    }
}

export function getCache_popularIMDBShows() {
    return popularIMDBShows;
}

//----------------------------------
//-------------Trailers-------------
async function setCache_Trailers() {
    try {
        let collection = await getCollection('movies');
        trailers = await collection
            .find({trailers: {$ne: null}}, {projection: dataConfig['medium']})
            .sort({insert_date: -1})
            .limit(36)
            .toArray();
    } catch (error) {
        trailers = [];
        saveError(error);
    }
}

export function getCache_Trailers(types) {
    if (types.length === 2) {
        return trailers;
    } else {
        return trailers.filter(item => item.type === types[0]);
    }
}

//----------------------------------
//-----------Series of Day----------
async function setCache_SeriesOfDay() {
    try {
        let dayCounter = -1;
        let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        while (dayCounter < 2) {
            let date = new Date();
            date.setDate(date.getDate() + dayCounter);
            let dayNumber = date.getDay();
            date.setDate(date.getDate() + 8);
            let collection = await getCollection('movies');
            let result = await collection
                .find({
                    type: 'serial',
                    status: 'running',
                    releaseDay: daysOfWeek[dayNumber],
                    nextEpisode: {$ne: null},
                    'nextEpisode.releaseStamp': {$lte: date.toISOString()}
                }, {projection: dataConfig['medium']})
                .sort({'rating.0.Value': -1})
                .limit(48)
                .toArray();
            if (result) {
                seriesOfDay[dayCounter + 1] = result;
            }
            dayCounter++;
        }
    } catch (error) {
        seriesOfDay = [[], [], []];
        saveError(error);
    }
}

export function getCache_SeriesOfDay(spacing) {
    if (seriesOfDay[spacing + 1].length === 0) {
        return null;
    }
    return seriesOfDay[spacing + 1];
}

//-----------------------------------
//-----------Series of Week----------
async function setCache_seriesOfWeek() {
    try {
        let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let weekCounter = 0; weekCounter < 2; weekCounter++) {
            let date = new Date();
            let dayNumber = date.getDay();
            date.setDate(date.getDate() - dayNumber + 7 * weekCounter + 8); // first day of week
            let daysInfo = [];
            for (let i = 0; i < 7; i++) {
                date.setDate(date.getDate() + 1);
                daysInfo.push({
                    type: 'serial',
                    status: 'running',
                    releaseDay: daysOfWeek[i],
                    nextEpisode: {$ne: null},
                    'nextEpisode.releaseStamp': {$lte: date.toISOString()}
                });
            }
            let collection = await getCollection('movies');
            let searchResults = await collection
                .find({
                    $or: daysInfo
                }, {projection: dataConfig['medium']})
                .sort({releaseDay: -1})
                .toArray();

            searchResults = searchResults.sort((a, b) => {
                return (
                    Number(a.rating.length > 0 ? a.rating[0].Value : 0) -
                    Number(b.rating.length > 0 ? b.rating[0].Value : 0)
                );
            });

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
    } catch (error) {
        seriesOfWeek0 = null;
        seriesOfWeek1 = null;
        saveError(error);
    }
}

export function getCache_seriesOfWeek(weekNumber) {
    if (weekNumber === 0) {
        return seriesOfWeek0;
    } else {
        return seriesOfWeek1;
    }
}
