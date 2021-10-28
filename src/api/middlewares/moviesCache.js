import NodeCache from 'node-cache';

const myCache = new NodeCache({
    stdTTL: 240,
    maxKeys: 1000,
});

export function flushCachedData() {
    myCache.flushAll();
}

export function setCache(key, value) {
    myCache.set(key, value);
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
