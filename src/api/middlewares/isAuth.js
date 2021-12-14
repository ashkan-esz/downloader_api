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
    let refreshToken = req.cookies.refreshToken;
    if (!refreshToken && req.query.noCookie === 'true') {
        refreshToken = req.headers['refreshtoken'];
    }
    if (!refreshToken) {
        return res.sendStatus(401);
    }
    try {
        let refreshTokenVerifyResult = jwt.verify(refreshToken, config.jwt.refreshTokenSecret);
        if (refreshTokenVerifyResult) {
            req.refreshToken = refreshToken;
            req.jwtUserData = refreshTokenVerifyResult;
            return next();
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        return res.sendStatus(403);
    }
}

//todo : merge attachAuthFlag

export async function isAuth(req, res, next) {
    let refreshToken = req.cookies.refreshToken;
    if (!refreshToken && req.query.noCookie === 'true') {
        refreshToken = req.headers['refreshtoken'];
    }
    if (!refreshToken) {
        return res.sendStatus(401);
    }
    if (refreshTokenBlackList.has(refreshToken)) {
        return res.sendStatus(403);
    }
    const authHeader = req.headers['authorization'];
    let accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
        return res.sendStatus(401);
    }
    try {
        let accessTokenVerifyResult = jwt.verify(accessToken, config.jwt.accessTokenSecret);
        if (accessTokenVerifyResult) {
            req.accessToken = accessToken;
            req.refreshToken = refreshToken;
            req.jwtUserData = accessTokenVerifyResult;
            return next();
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        return res.sendStatus(403);
    }
}

export async function attachAuthFlag(req, res, next) {
    let refreshToken = req.cookies.refreshToken;
    if (!refreshToken && req.query.noCookie === 'true') {
        refreshToken = req.headers['refreshtoken'];
    }
    if (!refreshToken) {
        return next();
    }
    if (refreshTokenBlackList.has(refreshToken)) {
        return next();
    }
    const authHeader = req.headers['authorization'];
    let accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
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
        }
    } catch (error) {
    }
    return next();
}
