import {getRedis, setRedis} from "./redis.js";


export async function getMoviesCacheByKey(key) {
    return await getRedis('movies:' + key);
}

export async function setMoviesCacheByKey(key, value, durationMin = 5) {
    return await setRedis('movies:' + key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getCache(key) {
    return await getRedis(key);
}

export async function setCache(key, value, durationMin = 5) {
    await setRedis(key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------