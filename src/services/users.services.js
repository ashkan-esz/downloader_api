import config from "../config/index.js";
import * as usersDbMethods from "../data/db/usersDbMethods.js";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from 'uuid';
import {saveError} from "../error/saveError.js";
import {generateServiceResult, errorMessage} from "./serviceUtils.js";
import {defaultProfileImage} from "../data/cloudStorage.js";
import * as computeUserData from "../data/db/computeUserData.js";
import countries from "i18n-iso-countries";
import {setRedis} from "../data/redis.js";

export async function signup(username, email, password, deviceInfo, ip, fingerprint, host) {
    try {
        let hashedPassword = await bcrypt.hash(password, 12);
        let verifyToken = await bcrypt.hash(uuidv4(), 12);
        verifyToken = verifyToken.replace(/\//g, '');
        let verifyToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour
        let userData = await usersDbMethods.addUser(username, email, hashedPassword, 'user', verifyToken, verifyToken_expire, defaultProfileImage);
        if (userData === 'userId exist') {
            return generateServiceResult({}, 403, errorMessage.userIdAlreadyExist);
        }
        if (userData === 'username exist') {
            return generateServiceResult({}, 403, errorMessage.usernameAlreadyExist);
        }
        if (userData === 'email exist') {
            return generateServiceResult({}, 403, errorMessage.emailAlreadyExist);
        }
        if (!userData) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        }
        const user = getJwtPayload(userData);
        const tokens = generateAuthTokens(user);
        deviceInfo = fixDeviceInfo(deviceInfo, fingerprint);
        const deviceId = fingerprint.hash || uuidv4();
        await usersDbMethods.addSession(userData.userId, deviceInfo, deviceId, tokens.refreshToken);
        return generateServiceResult({
            accessToken: tokens.accessToken,
            accessToken_expire: tokens.accessToken_expire,
            username: userData.rawUsername,
            userId: userData.userId,
        }, 201, '', tokens);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function login(username_email, password, deviceInfo, ip, fingerprint, isAdminLogin) {
    try {
        let userData = await usersDbMethods.findUser(username_email, username_email);
        if (userData === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!userData) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        } else if (isAdminLogin && userData.role !== 'admin' && userData.role !== 'dev') {
            return generateServiceResult({}, 403, errorMessage.adminAndDevOnly);
        }
        if (await bcrypt.compare(password, userData.password)) {
            const user = getJwtPayload(userData);
            const tokens = isAdminLogin ? generateAuthTokens(user, '1h', '6h') : generateAuthTokens(user);
            deviceInfo = fixDeviceInfo(deviceInfo, fingerprint);
            let deviceId = fingerprint.hash || (uuidv4() + '-' + user.generatedAt);
            let result = await usersDbMethods.updateSession(userData.userId, deviceInfo, deviceId, tokens.refreshToken);
            if (!result) {
                return generateServiceResult({}, 500, errorMessage.serverError);
            }
            if (result.isNewDevice) {
                const activeSessions = await usersDbMethods.getUserActiveSessions(userData.userId);
                if (activeSessions.length > 5) {
                    let lastUsedSession = activeSessions.sort((a, b) =>
                        (new Date(a.lastUseDate).getTime()) > (new Date(b.lastUseDate).getTime()) ? 1 : -1)[0];
                    await usersDbMethods.removeSession(userData.userId, lastUsedSession.refreshToken);
                }
            }
            return generateServiceResult({
                accessToken: tokens.accessToken,
                accessToken_expire: tokens.accessToken_expire,
                username: userData.rawUsername,
                userId: userData.userId,
            }, 200, '', tokens);
        } else {
            return generateServiceResult({}, 403, errorMessage.userPassNotMatch);
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function getToken(jwtUserData, deviceInfo, ip, fingerprint, prevRefreshToken, includeProfileImages, isAdminLogin) {
    try {
        const user = {
            userId: jwtUserData.userId,
            username: jwtUserData.username,
            role: jwtUserData.role,
            generatedAt: Date.now(),
        };
        const tokens = isAdminLogin ? generateAuthTokens(user, '1h', '6h') : generateAuthTokens(user);
        deviceInfo = fixDeviceInfo(deviceInfo, fingerprint);
        let result = await usersDbMethods.updateSessionRefreshToken(jwtUserData.userId, deviceInfo, tokens.refreshToken, prevRefreshToken, includeProfileImages);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 401, errorMessage.invalidRefreshToken);
        }
        return generateServiceResult({
            accessToken: tokens.accessToken,
            accessToken_expire: tokens.accessToken_expire,
            userId: jwtUserData.userId,
            username: result.user?.rawUsername,
            profileImages: result.user?.profileImages,
        }, 200, '', tokens);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function logout(jwtUserData, prevRefreshToken, prevAccessToken) {
    try {
        let result = await usersDbMethods.removeSession(jwtUserData.userId, prevRefreshToken);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 403, errorMessage.invalidRefreshToken);
        }

        try {
            let decodedJwt = jwt.decode(prevAccessToken);
            if (decodedJwt) {
                let jwtExpireLeft = (decodedJwt.exp * 1000 - Date.now()) / 1000;
                await setRedis('jwtKey:' + prevRefreshToken, 'logout', jwtExpireLeft);
            }
        } catch (error2) {
            saveError(error2);
        }
        return generateServiceResult({accessToken: ''}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

export async function computeUserStats(jwtUserData) {
    try {
        let genres = await computeUserData.getGenresFromUserStats(jwtUserData.userId);
        if (genres === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        }

        let now = new Date();
        let updateGenresResult = await computeUserData.updateComputedFavoriteGenres(jwtUserData.userId, genres);
        if (updateGenresResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!updateGenresResult) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        return generateServiceResult({
            data: {
                favoriteGenres: genres,
                lastUpdate: now,
            }
        }, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

function fixDeviceInfo(deviceInfo, fingerprint) {
    if (fingerprint.components.useragent) {
        if (fingerprint.components.useragent.os.family !== "Other") {
            deviceInfo.os = fingerprint.components.useragent.os.family;
        }
        if (fingerprint.components.useragent.device.family !== "Other") {
            deviceInfo.deviceModel = fingerprint.components.useragent.device.family;
        }
    }

    deviceInfo.ipLocation = getRequestLocation(fingerprint);
    return deviceInfo;
}

function getRequestLocation(fingerprint) {
    try {
        let country = fingerprint.components.geoip.country;
        let city = fingerprint.components.geoip.city;
        if (!country) {
            return "";
        }
        country = countries.getName(country, 'en', {select: "official"}) || country;
        if (!city) {
            return country;
        }
        return city + ', ' + country;
    } catch (error) {
        saveError(error);
        return "";
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

export function getJwtPayload(userData) {
    return {
        userId: userData.userId,
        username: userData.rawUsername,
        role: userData.role,
        generatedAt: Date.now(),
    };
}

export function generateAuthTokens(user, accessExpire = '', refreshExpire = '') {
    const accessToken = jwt.sign(user, config.jwt.accessTokenSecret, {expiresIn: accessExpire || config.jwt.accessTokenExpire});
    const refreshToken = jwt.sign(user, config.jwt.refreshTokenSecret, {expiresIn: refreshExpire || config.jwt.refreshTokenExpire});
    return {
        accessToken,
        accessToken_expire: jwt.decode(accessToken).exp * 1000,
        refreshToken,
    };
}
