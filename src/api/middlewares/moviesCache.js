import {getRedis} from "../../data/redis.js";
import {getGenresStatus} from "../../services/movies.services.js";

export async function getGenresStatusFromCache() {
    let genresStatusRouteUrl = '/status/genres';
    let cacheResult = await getRedis(genresStatusRouteUrl);
    if (cacheResult) {
        return cacheResult.data;
    } else {
        await getGenresStatus(genresStatusRouteUrl);
        return await getRedis(genresStatusRouteUrl)?.data;
    }
}

export default async function moviesCache(req, res, next) {
    let cacheResult = await getRedis(req.url);
    if (cacheResult) {
        res.json(cacheResult);
    } else {
        return next();
    }
}

export async function movieCache_guest(req, res, next) {
    if (!req.isGuest) {
        return next();
    }
    let cacheResult = await getRedis(req.url);
    if (cacheResult) {
        res.json(cacheResult);
    } else {
        return next();
    }
}
