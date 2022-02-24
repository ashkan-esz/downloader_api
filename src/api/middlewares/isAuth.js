import config from "../../config";
import jwt from "jsonwebtoken";
import NodeCache from "node-cache";
import {saveError} from "../../error/saveError";

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

export async function isAuth_refreshToken(req, res, next) {
    req.isAuth = false;
    let refreshToken = req.cookies.refreshToken || req.headers['refreshtoken'];
    if (!refreshToken) {
        return res.sendStatus(401);
    }
    try {
        let refreshTokenVerifyResult = jwt.verify(refreshToken, config.jwt.refreshTokenSecret);
        if (refreshTokenVerifyResult) {
            req.refreshToken = refreshToken;
            req.jwtUserData = refreshTokenVerifyResult;
            req.isAuth = true;
            return next();
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        return res.sendStatus(403);
    }
}

export async function attachAuthFlag(req, res, next) {
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

export async function blockAuthorized(req, res, next) {
    if (req.isAuth) {
        return res.status(403).json({
            code: 403,
            errorMessage: 'Logout first',
        });
    }
    return next();
}

export async function blockUnAuthorized(req, res, next) {
    if (!req.isAuth && req.authCode) {
        return res.sendStatus(req.authCode);
    }
    return next();
}
