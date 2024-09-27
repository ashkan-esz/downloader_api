import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import fingerPrint from "express-fingerprint";
import {findUser} from "../../data/db/usersDbMethods.js";
import {getConfigDB_DisableTestUserRequests} from "../../data/db/admin/adminConfigDbMethods.js";
import {redisKeyExist} from "../../data/redis.js";
import * as botsDbMethods from "../../data/db/botsDbMethods.js";
import {errorMessage} from "../../services/serviceUtils.js";
import {getUserPermissionsByRoleIds} from "../../data/db/admin/roleAndPermissionsDbMethods.js";
import {saveError} from "../../error/saveError.js";
import * as Cache from "../../data/cache.js";


let testUserDataCache = null;
let testUserDataCacheDate = 0;
const testUserDataCacheStale = 30 * 60 * 1000;

let disableTestUserRequests = await getConfigDB_DisableTestUserRequests();
setInterval(async () => {
    disableTestUserRequests = await getConfigDB_DisableTestUserRequests();
}, 30 * 60 * 1000); //30 min

export function updateDisableTestUserRequestsMiddleWareData(flag) {
    disableTestUserRequests = flag;
}

//----------------------------------------------
//----------------------------------------------

export const _botRequestsWhitelist = Object.freeze([
    "/movies/addUserStats/follow_movie/:id",
    "/movies/userStatsList/:statType/:dataLevel/:page",
    "/movies/:staffOrCharacter/searchByID/:id",
    "/movies/:staffOrCharacter/credits/:id/:page",
    "/movies/searchStaff/:dataLevel/:page",
    "/movies/searchCharacter/:dataLevel/:page",
]);

//----------------------------------------------
//----------------------------------------------

async function handleGuestMode(req, res, next) {
    //handle test user
    if (!disableTestUserRequests && req.method === 'GET' && !req._reconstructedRoute.startsWith("/admin/")) {
        if (Date.now() - testUserDataCacheDate > testUserDataCacheStale || testUserDataCache === 'error') {
            testUserDataCache = await findUser('$$test_user$$', '', true);
            testUserDataCacheDate = Date.now();
        }
        if (testUserDataCache && testUserDataCache !== 'error' && testUserDataCache.activeSessions[0]) {
            let refreshToken = testUserDataCache.activeSessions[0].refreshToken;
            let refreshTokenVerifyResult = jwt.verify(refreshToken, config.jwt.refreshTokenSecret);
            if (refreshTokenVerifyResult) {
                req.accessToken = '';
                req.refreshToken = refreshToken;
                req.jwtUserData = refreshTokenVerifyResult;
                req.isAuth = true;
                req.isGuest = true;
                return next();
            }
        }
    }
    return next();
}

//----------------------------------------------
//----------------------------------------------

export async function isAuth_refreshToken(req, res, next) {
    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken || (await redisKeyExist(Cache.CACHE_KEY_PREFIX.jwtDataCachePrefix + refreshToken))) {
        return res.status(401).json({
            code: 401,
            errorMessage: 'Unauthorized',
            isGuest: false,
            isCacheData: false,
        });
    }
    try {
        let refreshTokenVerifyResult = jwt.verify(refreshToken, config.jwt.refreshTokenSecret);
        if (refreshTokenVerifyResult) {
            if (refreshTokenVerifyResult.isBotRequest) {
                return next();
            }
            req.refreshToken = refreshToken;
            req.jwtUserData = refreshTokenVerifyResult;
            req.isAuth = true;
            return next();
        } else {
            return res.status(403).json({
                code: 403,
                errorMessage: 'Invalid token',
                isGuest: false,
                isCacheData: false,
            });
        }
    } catch (error) {
        return res.status(403).json({
            code: 403,
            errorMessage: 'Invalid token',
            isGuest: false,
            isCacheData: false,
        });
    }
}

export async function attachAuthFlag(req, res, next) {
    if (req.headers['isbotrequest'] === 'true' && _botRequestsWhitelist.includes(req._reconstructedRoute)) {
        req.isBotRequest = true;
        return attachAuthFlagForBots(req, res, next);
    }

    req.isGuest = false;
    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken) {
        req.authCode = 401;
        return handleGuestMode(req, res, next);
    }
    if (await redisKeyExist(Cache.CACHE_KEY_PREFIX.jwtDataCachePrefix + refreshToken)) {
        req.authCode = 401;
        return handleGuestMode(req, res, next);
    }
    const authHeader = req.headers['authorization'];
    let accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
        req.authCode = 401;
        return handleGuestMode(req, res, next);
    }
    try {
        let accessTokenVerifyResult = jwt.verify(accessToken, config.jwt.accessTokenSecret);
        let refreshTokenVerifyResult = jwt.verify(refreshToken, config.jwt.refreshTokenSecret);
        if (accessTokenVerifyResult || refreshTokenVerifyResult) {
            if (accessTokenVerifyResult.isBotRequest || refreshTokenVerifyResult.isBotRequest) {
                return next();
            }
            req.accessToken = accessToken;
            req.refreshToken = refreshToken;
            req.jwtUserData = accessTokenVerifyResult;
            req.isAuth = true;
        } else {
            req.authCode = 403;
            return handleGuestMode(req, res, next);
        }
    } catch (error) {
        req.authCode = 403;
        return handleGuestMode(req, res, next);
    }
    return next();
}

export async function attachAuthFlagForBots(req, res, next) {
    req.isAuth = false;

    const authHeader = req.headers['authorization'];
    let accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
        req.authCode = 401;
        return next();
    }

    try {
        let accessTokenVerifyResult = jwt.verify(accessToken, config.jwt.accessTokenSecret);
        if (accessTokenVerifyResult) {
            req.accessToken = accessToken;
            req.jwtUserData = accessTokenVerifyResult;
            req.isBotRequest = accessTokenVerifyResult.isBotRequest || req.headers['isbotrequest'] === 'true';
            req.isAuth = true;
        } else {
            req.authCode = 403;
        }
    } catch (error) {
        req.authCode = 403;
    }
    return next();
}

export async function botHasLoginPermission(req, res, next) {
    if (req.isBotRequest) {
        let botId = req.jwtUserData.botId;
        // get bot data - cache first
        let botData = await Cache.getBotDataCacheByKey(botId);
        if (!botData) {
            // check db - update cache
            botData = await botsDbMethods.getBotDataFromPostgres(botId);
            if (botData === 'error') {
                return res.status(500).json({
                    code: 500,
                    errorMessage: errorMessage.serverError,
                    isGuest: false,
                    isCacheData: false,
                });
            } else if (!botData) {
                return res.status(404).json({
                    code: 404,
                    errorMessage: errorMessage.botNotFound,
                    isGuest: false,
                    isCacheData: false,
                });
            }
            await Cache.setBotDataCacheByKey(botId, botData, 2 * 60);
        }
        req.botData = botData;
        if (!botData.permissionToLogin) {
            return res.status(403).json({
                code: 403,
                errorMessage: errorMessage.botNoLoginPermission,
                isGuest: false,
                isCacheData: false,
            });
        }
    }
    return next();
}

export function blockAuthorized(req, res, next) {
    if (req.isAuth) {
        return res.status(403).json({
            code: 403,
            errorMessage: 'Logout first',
            isGuest: false,
            isCacheData: false,
        });
    }
    return next();
}

export function blockUnAuthorized(req, res, next) {
    if (!req.isAuth && req.authCode) {
        return res.status(req.authCode).json({
            data: null,
            code: req.authCode,
            errorMessage: req.authCode === 401 ? 'Unauthorized' : 'Invalid token',
            isGuest: false,
            isCacheData: false,
        });
    }
    return next();
}

export function addFingerPrint() {
    return fingerPrint({
        parameters: [
            // Defaults
            fingerPrint.useragent,
            fingerPrint.acceptHeaders,
            fingerPrint.geoip,
        ]
    })
}

export function checkUserHavePermissions(neededPermissions) {
    return async (req, res, next) => {
        try {
            const cacheKey = req.jwtUserData.roleIds.join(',');
            let permissions = await Cache.getRolesPermissionsCacheByKey(cacheKey);
            if (!permissions) {
                permissions = await getUserPermissionsByRoleIds(req.jwtUserData.roleIds);
                if (permissions === null) {
                    return res.status(500).json({
                        code: 500,
                        errorMessage: errorMessage.serverError,
                        isGuest: false,
                        isCacheData: false,
                    });
                }
                await Cache.setRolesPermissionsCacheByKey(cacheKey, permissions, 2);
            }

            req.permissions = permissions;
            const permissionSet = new Set(permissions);
            const missingPermissions = neededPermissions.filter(p => !permissionSet.has(p));

            if (missingPermissions.length > 0) {
                return res.status(403).json({
                    code: 403,
                    errorMessage: `Forbidden, need ([${missingPermissions.join(',')}]) permissions`,
                    isGuest: false,
                    isCacheData: false,
                });
            }
            return next();
        } catch (error) {
            saveError(error);
            return res.status(500).json({
                code: 500,
                errorMessage: errorMessage.serverError,
                isGuest: false,
                isCacheData: false,
            });
        }
    }
}
