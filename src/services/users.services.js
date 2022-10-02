import config from "../config/index.js";
import {
    findUser,
    addUser,
    setTokenForNewUser,
    updateUserAuthToken,
    verifyUserEmail,
    updateEmailToken,
    setTokenForNewDevice,
    removeAuthToken,
    removeAuthSession,
    removeAllAuthSession,
    updateUserByID,
    uploadProfileImageDB,
    removeProfileImageDB,
    getUserSettingsDB, getAllUserSettingsDB, changeUserSettingsDB,
} from "../data/db/usersDbMethods.js";
import {userModel} from "../models/user.js";
import * as bcrypt from "bcrypt";
import agenda from "../agenda/index.js";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from 'uuid';
import {addToBlackList} from "../api/middlewares/isAuth.js";
import {saveError} from "../error/saveError.js";
import getIpLocation from "../extraServices/ip/index.js";
import {generateServiceResult, errorMessage} from "./serviceUtils.js";
import {removeProfileImageFromS3} from "../data/cloudStorage.js";
import {getGenresFromUserStats, updateComputedFavoriteGenres} from "../data/db/computeUserData.js";

//todo : remove account
//todo : forget password
//todo : edit profile data

export async function signup(username, email, password, deviceInfo, ip, host) {
    try {
        let findUserResult = await findUser(username, email, {username: 1, email: 1});
        if (findUserResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (findUserResult) {
            if (findUserResult.username === username.toLowerCase()) {
                return generateServiceResult({}, 403, errorMessage.usernameAlreadyExist);
            }
            if (findUserResult.email === email) {
                return generateServiceResult({}, 403, errorMessage.emailAlreadyExist);
            }
        }

        deviceInfo.ipLocation = ip ? getIpLocation(ip) : '';
        let hashedPassword = await bcrypt.hash(password, 12);
        let emailVerifyToken = await bcrypt.hash(uuidv4(), 12);
        emailVerifyToken = emailVerifyToken.replace(/\//g, '');
        let emailVerifyToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour
        let deviceId = uuidv4();
        let userData = userModel(username, email, hashedPassword, emailVerifyToken, emailVerifyToken_expire, deviceInfo, deviceId);
        let userId = await addUser(userData);
        if (!userId) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        }
        const user = getJwtPayload(userData, userId);
        const tokens = generateAuthTokens(user);
        await setTokenForNewUser(userId, tokens.refreshToken);
        await agenda.schedule('in 5 seconds', 'registration email', {
            rawUsername: userData.rawUsername,
            email,
            emailVerifyToken,
            host,
        });
        return generateServiceResult({
            accessToken: tokens.accessToken,
            accessToken_expire: tokens.accessToken_expire,
            username: userData.rawUsername,
            userId: userId,
        }, 201, '', tokens);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function login(username_email, password, deviceInfo, ip) {
    //todo : terminate sessions inactive for 6 month
    //todo : check device already exist
    //todo : limit number of device
    try {
        let userData = await findUser(username_email, username_email, {password: 1, rawUsername: 1, role: 1});
        if (userData === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!userData) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        if (await bcrypt.compare(password, userData.password)) {
            const user = getJwtPayload(userData);
            const tokens = generateAuthTokens(user);
            deviceInfo.ipLocation = ip ? getIpLocation(ip) : '';
            let deviceId = uuidv4();
            let result = await setTokenForNewDevice(userData._id, deviceInfo, deviceId, tokens.refreshToken);
            if (!result) {
                return generateServiceResult({}, 500, errorMessage.serverError);
            } else if (result === 'cannot find user') {
                return generateServiceResult({}, 404, errorMessage.userNotFound);
            }
            agenda.schedule('in 4 seconds', 'login email', {
                deviceInfo,
                email: result.email,
            });
            return generateServiceResult({
                accessToken: tokens.accessToken,
                accessToken_expire: tokens.accessToken_expire,
                username: userData.rawUsername,
                userId: userData._id,
            }, 200, '', tokens);
        } else {
            return generateServiceResult({}, 403, errorMessage.userPassNotMatch);
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function getToken(jwtUserData, deviceInfo, ip, prevRefreshToken) {
    try {
        const user = {
            userId: jwtUserData.userId,
            username: jwtUserData.username,
            role: jwtUserData.role,
            generatedAt: Date.now(),
        };
        const tokens = generateAuthTokens(user);
        deviceInfo.ipLocation = ip ? getIpLocation(ip) : '';
        let result = await updateUserAuthToken(jwtUserData.userId, deviceInfo, tokens.refreshToken, prevRefreshToken);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 401, errorMessage.invalidRefreshToken);
        }
        return generateServiceResult({
            accessToken: tokens.accessToken,
            accessToken_expire: tokens.accessToken_expire,
            username: result.rawUsername,
            userId: result._id.toString(),
            profileImages: result.profileImages,
        }, 200, '', tokens);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function logout(jwtUserData, prevRefreshToken, prevAccessToken) {
    try {
        let result = await removeAuthToken(jwtUserData.userId, prevRefreshToken);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 403, errorMessage.invalidRefreshToken);
        }
        let device = result.activeSessions.find(item => item.refreshToken === prevRefreshToken);
        try {
            let decodedJwt = jwt.decode(prevAccessToken);
            if (decodedJwt) {
                let jwtExpireLeft = (decodedJwt.exp * 1000 - Date.now()) / 1000;
                addToBlackList(device.refreshToken, 'logout', jwtExpireLeft);
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

export async function forceLogout(jwtUserData, deviceId, prevRefreshToken) {
    try {
        let result = await removeAuthSession(jwtUserData.userId, deviceId, prevRefreshToken);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 403, errorMessage.invalidDeviceId);
        }
        let device = result.activeSessions.find(item => item.deviceId === deviceId);
        addToBlackList(device.refreshToken, 'logout', null);
        let restOfSessions = result.activeSessions.filter(item => item.refreshToken !== prevRefreshToken && item.deviceId !== deviceId);
        return generateServiceResult({activeSessions: restOfSessions}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function forceLogoutAll(jwtUserData, prevRefreshToken) {
    try {
        let result = await removeAllAuthSession(jwtUserData.userId, prevRefreshToken);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 403, errorMessage.invalidRefreshToken);
        }
        let activeSessions = result.activeSessions;
        for (let i = 0; i < activeSessions.length; i++) {
            if (activeSessions[i].refreshToken !== prevRefreshToken) {
                addToBlackList(activeSessions[i].refreshToken, 'logout', null);
            }
        }
        return generateServiceResult({activeSessions: []}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function getUserProfile(userData, refreshToken) {
    try {
        userData.thisDevice = userData.activeSessions.find(item => item.refreshToken === refreshToken);
        delete userData.thisDevice.refreshToken;
        delete userData.activeSessions;
        delete userData.password;
        delete userData.emailVerifyToken;
        delete userData.emailVerifyToken_expire;
        delete userData.profileImageCounter;
        userData.username = userData.rawUsername; //outside of server rawUsername is the actual username
        delete userData.rawUsername;
        return generateServiceResult(userData, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function getUserActiveSessions(userData, refreshToken) {
    try {
        let thisDevice = userData.activeSessions.find(item => item.refreshToken === refreshToken);
        let activeSessions = userData.activeSessions.filter(item => item.refreshToken !== refreshToken).map(item => {
            delete item.refreshToken;
            return item;
        });
        delete thisDevice.refreshToken;
        return generateServiceResult({thisDevice, activeSessions}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function sendVerifyEmail(userData, host) {
    try {
        let newEmailToken = await bcrypt.hash(uuidv4(), 12);
        newEmailToken = newEmailToken.replace(/\//g, '');
        let newEmailToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour
        let updateResult = await updateEmailToken(userData._id, newEmailToken, newEmailToken_expire);
        if (updateResult === 'ok') {
            await agenda.now('verify email', {
                rawUsername: userData.rawUsername,
                email: userData.email,
                emailVerifyToken: newEmailToken,
                host,
            });

            return generateServiceResult({}, 200, '');
        } else if (updateResult === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.emailNotFound);
        }
        return generateServiceResult({}, 500, errorMessage.serverError);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function verifyEmail(token) {
    try {
        let verify = await verifyUserEmail(token);
        if (verify === 'ok') {
            return generateServiceResult({message: 'email verified'}, 200, '');
        } else if (verify === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.invalidToken);
        }
        return generateServiceResult({}, 500, errorMessage.serverError);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

export async function uploadProfileImage(jwtUserData, fileData) {
    try {
        if (!fileData) {
            return generateServiceResult({data: null}, 400, errorMessage.badRequestBody);
        }

        const fileName = fileData.location.split('/').pop();
        let userData = await uploadProfileImageDB(jwtUserData.userId, fileData.location);
        if (userData === 'error') {
            await removeProfileImageFromS3(fileName);
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        } else if (!userData) {
            //inCase if two image upload in same time
            await removeProfileImageFromS3(fileName);
            return generateServiceResult({data: null}, 404, errorMessage.exceedProfileImage);
        }

        return generateServiceResult({
            data: {
                profileImages: userData.profileImages
            }
        }, 200, '');
    } catch (error) {
        saveError(error);
        if (fileData && fileData.location) {
            const fileName = fileData.location.split('/').pop();
            await removeProfileImageFromS3(fileName);
        }
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
}

export async function removeProfileImage(jwtUserData, fileName) {
    try {
        fileName = fileName.split('/').pop();
        let userData = await removeProfileImageDB(jwtUserData.userId, fileName);
        if (userData === 'error') {
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        } else if (!userData) {
            return generateServiceResult({data: null}, 404, errorMessage.profileImageNotFound);
        }

        await removeProfileImageFromS3(fileName);

        return generateServiceResult({
            data: {
                profileImages: userData.profileImages
            }
        }, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

export async function setFavoriteGenres(jwtUserData, genres) {
    try {
        if (genres.length > 6) {
            return generateServiceResult({}, 409, errorMessage.exceedGenres);
        }

        let updateResult = await updateUserByID(jwtUserData.userId, {favoriteGenres: genres});
        if (updateResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (updateResult === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        return generateServiceResult({}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

export async function getAllUserSettings(jwtUserData) {
    try {
        let result = await getAllUserSettingsDB(jwtUserData.userId);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!result) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        return generateServiceResult({data: result}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function getUserSettings(jwtUserData, settingName) {
    try {
        let result = await getUserSettingsDB(jwtUserData.userId, settingName);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!result) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        return generateServiceResult({data: result}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function changeUserSettings(jwtUserData, settings, settingName) {
    try {
        let result = await changeUserSettingsDB(jwtUserData.userId, settings, settingName);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!result) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        return generateServiceResult({data: result}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function computeUserStats(jwtUserData) {
    try {
        let genres = await getGenresFromUserStats(jwtUserData.userId);
        if (genres === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        }

        let now = new Date();
        let updateGenresResult = await updateComputedFavoriteGenres(jwtUserData.userId, genres);
        if (updateGenresResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (updateGenresResult === 'notfound') {
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

export function getJwtPayload(userData, userId = '') {
    return {
        userId: (userData._id || userId).toString(),
        username: userData.rawUsername,
        role: userData.role,
        generatedAt: Date.now(),
    };
}

export function generateAuthTokens(user, customExpire = '') {
    const accessToken = jwt.sign(user, config.jwt.accessTokenSecret, {expiresIn: customExpire || config.jwt.accessTokenExpire});
    const refreshToken = jwt.sign(user, config.jwt.refreshTokenSecret, {expiresIn: customExpire || config.jwt.refreshTokenExpire});
    return {
        accessToken,
        accessToken_expire: jwt.decode(accessToken).exp * 1000,
        refreshToken,
    };
}
