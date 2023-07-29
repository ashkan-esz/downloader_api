import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import fingerPrint from "express-fingerprint";
import {findUser} from "../../data/db/usersDbMethods.js";
import {getConfigDB_DisableTestUserRequests} from "../../data/db/admin/adminConfigDbMethods.js";
import {redisKeyExist} from "../../data/redis.js";


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

async function handleGuestMode(req, res, next) {
    //handle test user
    if (!disableTestUserRequests && req.method === 'GET') {
        if (Date.now() - testUserDataCacheDate > testUserDataCacheStale || testUserDataCache === 'error') {
            testUserDataCache = await findUser('$$test_user$$', '', {activeSessions: 1});
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

export function isAuth_refreshToken(req, res, next) {
    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken) {
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
    req.isGuest = false;
    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken) {
        req.authCode = 401;
        return handleGuestMode(req, res, next);
    }
    if (await redisKeyExist('jwtKey:' + refreshToken)) {
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

export function checkUserRolePermission(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.jwtUserData.role)) {
            return res.status(403).json({
                code: 403,
                errorMessage: `Forbidden, ([${roles.join(',')}]) roles only`,
                isGuest: false,
                isCacheData: false,
            });
        }
        return next();
    }
}
