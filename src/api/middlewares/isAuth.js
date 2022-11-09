import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import NodeCache from "node-cache";
import fingerPrint from "express-fingerprint";
import {findUser} from "../../data/db/usersDbMethods.js";
import {saveError} from "../../error/saveError.js";

const refreshTokenBlackList = new NodeCache({stdTTL: 60 * 60});

export function addToBlackList(jwtKey, cause, duration = null) {
    try {
        if (duration) {
            if (duration > 60) {
                refreshTokenBlackList.set(jwtKey, cause, duration);
            }
        } else {
            let cacheDuration = config.jwt.accessTokenExpire.replace('h', '');
            cacheDuration = Number(cacheDuration) * 60 * 60;
            refreshTokenBlackList.set(jwtKey, cause, cacheDuration);
        }
    } catch (error) {
        saveError(error);
    }
}

export function isAuth_refreshToken(req, res, next) {
    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken) {
        return res.status(401).json({
            code: 401,
            errorMessage: 'Unauthorized'
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
                errorMessage: 'Invalid token'
            });
        }
    } catch (error) {
        return res.status(403).json({
            code: 403,
            errorMessage: 'Invalid token'
        });
    }
}

export async function attachAuthFlag(req, res, next) {
    if (req.method === 'GET' && req.query.testUser === 'true') {
        let findUserResult = await findUser('$$test_user$$', '', {activeSessions: 1});
        if (findUserResult && findUserResult !== 'error' && findUserResult.activeSessions[0]) {
            let refreshToken = findUserResult.activeSessions[0].refreshToken;
            let refreshTokenVerifyResult = jwt.verify(refreshToken, config.jwt.refreshTokenSecret);
            if (refreshTokenVerifyResult) {
                req.accessToken = '';
                req.refreshToken = refreshToken;
                req.jwtUserData = refreshTokenVerifyResult;
                req.isAuth = true;
                req.isTestUser = true;
                return next();
            }
        }
    }

    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken) {
        req.authCode = 401;
        return next();
    }
    if (refreshTokenBlackList.has(refreshToken)) {
        req.authCode = 401;
        return next();
    }
    const authHeader = req.headers['authorization'];
    let accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
        req.authCode = 401;
        return next();
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
        }
    } catch (error) {
        req.authCode = 403;
    }
    return next();
}

export function blockAuthorized(req, res, next) {
    if (req.isAuth) {
        return res.status(403).json({
            code: 403,
            errorMessage: 'Logout first',
        });
    }
    return next();
}

export function blockUnAuthorized(req, res, next) {
    if (!req.isAuth && req.authCode) {
        return res.status(req.authCode).json({
            data: null,
            code: req.authCode,
            errorMessage: req.authCode === 401 ? 'Unauthorized' : 'Invalid token'
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
            });
        }
        return next();
    }
}
