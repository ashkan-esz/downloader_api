import {
    getCache_news,
    getCache_TopLikes,
    getCache_Trailers,
    getCache_updates,
    getCache_SeriesOfDay,
    getCache_seriesOfWeek
} from "../data/cache";
import getCollection from "../data/mongoDB";
import {dataLevelConfig} from "../models/movie";
import {getAggregationProjectionWithSkipLimits} from "../utils/routesUtils";
import {ObjectId} from 'mongodb';


export async function getNews(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_news(types);
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    let collection = await getCollection('movies');
    return await collection
        .find({
            type: {$in: types},
        }, {projection: dataLevelConfig[dataLevel]})
        .sort({year: -1, insert_date: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
}

export async function getUpdates(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_updates(types);
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    let collection = await getCollection('movies');
    return await collection
        .find({
            type: {$in: types},
        }, {projection: dataLevelConfig[dataLevel]})
        .sort({update_date: -1, premiered: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
}

export async function getTopsByLikes(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (dataLevel === 'low' && page <= 5) {
        let cacheResult = getCache_TopLikes(types);
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    let collection = await getCollection('movies');
    return await collection
        .find({
            type: {$in: types},
        }, {projection: dataLevelConfig[dataLevel]})
        .sort({like: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
}

export async function getTrailers(types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (page <= 6) {
        let cacheResult = getCache_Trailers(types);
        let result = cacheResult.slice(skip, skip + limit);
        if (result.length === 12) {
            return result;
        }
    }
    //database
    let collection = await getCollection('movies');
    return await collection
        .find({
            type: {$in: types},
            trailers: {$ne: null},
        }, {projection: dataLevelConfig[dataLevel]})
        .sort({insert_date: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
}

export async function getTimelineDay(spacing, types, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    //cache
    if (spacing >= -1 && spacing <= 1 && page <= 4) {
        let cacheResult = getCache_SeriesOfDay(spacing);
        if (cacheResult) {
            return cacheResult.slice(skip, skip + limit);
        }
    }
    //database
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let date = new Date();
    date.setDate(date.getDate() + spacing);
    let dayNumber = date.getDay();
    date.setDate(date.getDate() + 8);
    let collection = await getCollection('movies');
    return await collection
        .find({
            type: {$in: types},
            status: 'running',
            releaseDay: daysOfWeek[dayNumber],
            nextEpisode: {$ne: null},
            'nextEpisode.releaseStamp': {$lte: date.toISOString()}
        }, {projection: dataLevelConfig['medium']})
        .sort({'rating.0.Value': -1})
        .skip(skip)
        .limit(limit)
        .toArray();
}

export async function getTimelineWeek(weekCounter, types) {

    //cache
    if (weekCounter >= 0 && weekCounter <= 1) {
        let cacheResult = getCache_seriesOfWeek(weekCounter);
        if (cacheResult) {
            return cacheResult;
        }
    }
    //database
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let date = new Date();
    let dayNumber = date.getDay();
    date.setDate(date.getDate() - dayNumber + 7 * weekCounter + 8); // first day of week
    let daysInfo = [];
    for (let i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        daysInfo.push({
            type: {$in: types},
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
        }, {projection: dataLevelConfig['medium']})
        .sort({releaseDay: -1})
        .toArray();

    searchResults = searchResults.sort((a, b) => {
        return (
            Number(b.rating.length > 0 ? b.rating[0].Value : 0) -
            Number(a.rating.length > 0 ? a.rating[0].Value : 0)
        );
    });
    return searchResults;
}

export async function searchByTitle(title, types, dataLevel, page) {
    let {skip, limit} = getSkipLimit(page, 12);

    let collection = await getCollection('movies');
    return await collection.aggregate([
        {
            $search: {
                index: 'default',
                text: {
                    query: title,
                    path: 'title'
                }
            }
        },
        {
            $match: {
                type: {$in: types},
            }
        },
        ...getAggregationProjectionWithSkipLimits(dataLevel, skip, limit),

    ]).toArray();
}

export async function searchById(id, dataLevel) {
    let collection = await getCollection('movies');
    return await collection.findOne(
        {_id: new ObjectId(id)},
        {projection: dataLevelConfig[dataLevel]});
}

function getSkipLimit(page, limit) {
    return {
        skip: limit * (page - 1),
        limit,
    };
}
