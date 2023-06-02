import NodeCache from 'node-cache';
import {getGenresStatus} from "../../services/movies.services.js";

const myCache = new NodeCache({stdTTL: 300}); //5 min

export function flushCachedData() {
    myCache.flushAll();
}

export async function getGenresStatusFromCache() {
    let genresStatusRouteUrl = 'status/genres';
    let cacheResult = myCache.get(genresStatusRouteUrl);
    if (cacheResult) {
        return cacheResult.data;
    } else {
        await getGenresStatus(genresStatusRouteUrl);
        return myCache.get(genresStatusRouteUrl)?.data;
    }
}

export function setCache(key, value, duration = null) {
    if (duration) {
        myCache.set(key, value, duration);
    } else {
        myCache.set(key, value);
    }
}

export default function moviesCache(req, res, next) {
    let key = req.url;
    let cacheResult = myCache.get(key);
    if (cacheResult) {
        res.json(cacheResult);
    } else {
        return next();
    }
}
