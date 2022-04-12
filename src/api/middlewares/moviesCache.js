import NodeCache from 'node-cache';

const myCache = new NodeCache({stdTTL: 300}); //5 min

export function flushCachedData() {
    myCache.flushAll();
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
