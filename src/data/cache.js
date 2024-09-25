import {getRedis, setRedis} from "./redis.js";


export const CACHE_KEY_PREFIX = Object.freeze({
    jwtDataCachePrefix: "jwtKey:",
    userDataCachePrefix: "user:",
    movieDataCachePrefix: "movie:",
    moviesListCachePrefix: "movies:",
    botDataCachePrefix: "bot:",
    utilsMessagesCachePrefix: "utils/message",
    utilsAppsCachePrefix: "utils/apps",
    utilsAppUpdateCachePrefix: "utils/appUpdate/",
    rolePermissionsCachePrefix: "roleIds:",
});

export async function getMoviesCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.moviesListCachePrefix + key);
}

export async function setMoviesCacheByKey(key, value, durationMin = 5) {
    return await setRedis(CACHE_KEY_PREFIX.moviesListCachePrefix + key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getBotDataCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.botDataCachePrefix + key);
}

export async function setBotDataCacheByKey(key, value, durationMin = 60) {
    return await setRedis(CACHE_KEY_PREFIX.botDataCachePrefix + key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getUtilsMessagesCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.utilsMessagesCachePrefix + key);
}

export async function setUtilsMessagesCacheByKey(key, value, durationMin = 5) {
    return await setRedis(CACHE_KEY_PREFIX.utilsMessagesCachePrefix + key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getUtilsAppsCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.utilsAppsCachePrefix + key);
}

export async function setUtilsAppsCacheByKey(key, value, durationMin = 5) {
    return await setRedis(CACHE_KEY_PREFIX.utilsAppsCachePrefix + key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getUtilsAppUpdateCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.utilsAppUpdateCachePrefix + key);
}

export async function setUtilsAppUpdateCacheByKey(key, value, durationMin = 5) {
    return await setRedis(CACHE_KEY_PREFIX.utilsAppUpdateCachePrefix + key, value, durationMin * 60);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getJwtDataCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.jwtDataCachePrefix + key);
}

export async function setJwtDataCacheByKey(key, value, durationSec = 3600) {
    return await setRedis(CACHE_KEY_PREFIX.jwtDataCachePrefix + key, value, durationSec);
}

//-----------------------------------------------------
//-----------------------------------------------------

export async function getRolesPermissionsCacheByKey(key) {
    return await getRedis(CACHE_KEY_PREFIX.rolePermissionsCachePrefix + key);
}

export async function setRolesPermissionsCacheByKey(key, value, durationMin = 5) {
    return await setRedis(CACHE_KEY_PREFIX.rolePermissionsCachePrefix + key, value, durationMin * 60);
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