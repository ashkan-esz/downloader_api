import config from "../config/index.js";
import * as usersDbMethods from "../data/db/usersDbMethods.js";
import * as bcrypt from "bcrypt";
import agenda from "../agenda/index.js";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from 'uuid';
import {saveError} from "../error/saveError.js";
import {generateServiceResult, errorMessage} from "./serviceUtils.js";
import {defaultProfileImage, removeProfileImageFromS3, uploadProfileImageToS3} from "../data/cloudStorage.js";
import {getGenresFromUserStats, updateComputedFavoriteGenres} from "../data/db/computeUserData.js";
import countries from "i18n-iso-countries";
import {setRedis} from "../data/redis.js";

//if (data.changedPasswordAfter(decoded.iat)) {
// 			return res.status(401).json({
// 				message: 'User recently changed password! Please log in again',
// 			});
// 		}


//todo : forget password

export async function signup(username, email, password, deviceInfo, ip, fingerprint, host) {
    try {
        let hashedPassword = await bcrypt.hash(password, 12);
        let emailVerifyToken = await bcrypt.hash(uuidv4(), 12);
        emailVerifyToken = emailVerifyToken.replace(/\//g, '');
        let emailVerifyToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour
        let userData = await usersDbMethods.addUser(username, email, hashedPassword, 'user', emailVerifyToken, emailVerifyToken_expire, defaultProfileImage);
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
            let deviceId = fingerprint.hash || uuidv4();
            let result = await usersDbMethods.updateSession(userData.userId, deviceInfo, deviceId, tokens.refreshToken);
            if (!result) {
                return generateServiceResult({}, 500, errorMessage.serverError);
            }
            if (result.isNewDevice) {
                agenda.schedule('in 4 seconds', 'login email', {
                    deviceInfo,
                    email: result.email,
                });
                const activeSessions = await usersDbMethods.getUserActiveSessions(userData.userId);
                if (activeSessions.length > 5) {
                    let lastUsedSession = activeSessions.sort((a, b) => new Date(a.lastUseDate).getTime() > new Date(b.lastUseDate).getTime())[0];
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
            username: result.user?.rawUsername,
            userId: jwtUserData.userId,
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

export async function forceLogout(jwtUserData, deviceId, prevRefreshToken) {
    try {
        let result = await usersDbMethods.removeAuthSession(jwtUserData.userId, deviceId, prevRefreshToken);
        if (!result) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'cannot find device') {
            return generateServiceResult({}, 404, errorMessage.invalidDeviceId);
        }
        await setRedis('jwtKey:' + result.refreshToken, 'logout', config.jwt.accessTokenExpireSeconds);
        return generateServiceResult({}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function forceLogoutAll(jwtUserData, prevRefreshToken) {
    try {
        let logOutedSessions = await usersDbMethods.removeAllAuthSession(jwtUserData.userId, prevRefreshToken);
        if (!logOutedSessions) {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (logOutedSessions === 'cannot find device') {
            return generateServiceResult({}, 403, errorMessage.invalidRefreshToken);
        }
        for (let i = 0; i < logOutedSessions.length; i++) {
            await setRedis('jwtKey:' + logOutedSessions[i].refreshToken, 'logout', config.jwt.accessTokenExpireSeconds);
        }
        return generateServiceResult({}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function sendDeleteAccountEmail(jwtUserData, host) {
    try {
        // send email with remove account link to user
        const findUserResult = await usersDbMethods.findUserById(jwtUserData.userId, {rawUsername: true, email: true});
        if (findUserResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!findUserResult) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        let deleteAccountVerifyToken = await bcrypt.hash(uuidv4(), 12);
        deleteAccountVerifyToken = deleteAccountVerifyToken.replace(/\//g, '');
        const deleteAccountVerifyToken_expire = Date.now() + (10 * 60 * 1000);  //10 min

        const updateResult = await usersDbMethods.updateUserByID(jwtUserData.userId, {
            deleteAccountVerifyToken: deleteAccountVerifyToken,
            deleteAccountVerifyToken_expire: deleteAccountVerifyToken_expire,
        });
        if (updateResult === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.emailNotFound);
        } else if (updateResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        }

        await agenda.now('delete account', {
            userId: jwtUserData.userId,
            rawUsername: findUserResult.rawUsername,
            email: findUserResult.email,
            deleteAccountVerifyToken: deleteAccountVerifyToken,
            host,
        });
        return generateServiceResult({}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function deleteAccount(userId, token) {
    try {
        let verifyResult = await usersDbMethods.checkDeleteAccountToken(userId, token);
        if (verifyResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!verifyResult || verifyResult === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.invalidToken);
        }

        let result = await usersDbMethods.removeUserById(Number(userId));
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        //remove profileImages from s3
        let imageRemovePromiseArray = [];
        for (let i = 0; i < result.profileImages.length; i++) {
            let imageFileName = result.profileImages[i].url.split('/').pop();
            let prom = removeProfileImageFromS3(imageFileName);
            imageRemovePromiseArray.push(prom);
        }
        await Promise.allSettled(imageRemovePromiseArray);
        imageRemovePromiseArray = null;

        //blacklist tokens
        let blacklistPromiseArray = [];
        for (let i = 0; i < result.activeSessions.length; i++) {
            let prom = setRedis('jwtKey:' + result.activeSessions[i].refreshToken, 'removeUser', config.jwt.accessTokenExpireSeconds);
            blacklistPromiseArray.push(prom);
        }
        await Promise.allSettled(blacklistPromiseArray);
        blacklistPromiseArray = null;

        return generateServiceResult({message: 'account removed'}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function getUserProfile(jwtUserData, refreshToken) {
    try {
        let userData = await usersDbMethods.getUserProfile(jwtUserData.userId, refreshToken);
        if (userData === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!userData) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        userData.thisDevice = userData.activeSessions[0] || null;
        delete userData.activeSessions;
        userData.username = userData.rawUsername; //outside of server rawUsername is the actual username
        delete userData.rawUsername;
        return generateServiceResult(userData, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function editProfile(jwtUserData, username, publicName, bio, mbtiType, email) {
    try {
        let findUserResult = await usersDbMethods.findUser(username, email);
        if (findUserResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (findUserResult && findUserResult.userId !== jwtUserData.userId) {
            if (findUserResult.username === username.toLowerCase()) {
                return generateServiceResult({}, 403, errorMessage.usernameAlreadyExist);
            }
            if (findUserResult.email === email) {
                return generateServiceResult({}, 403, errorMessage.emailAlreadyExist);
            }
        }

        let updateFields = {
            bio: bio,
            mbtiType: mbtiType,
        };
        if (username !== findUserResult.username) {
            updateFields.username = username.toLowerCase();
            updateFields.rawUsername = username;
        }
        if (email !== findUserResult.email) {
            updateFields.email = email;
            updateFields.emailVerified = false;
            updateFields.emailVerifyToken = '';
            updateFields.emailVerifyToken_expire = 0;
        }
        if (publicName !== findUserResult.publicName) {
            updateFields.publicName = publicName;
        }

        let result = await usersDbMethods.updateUserByID(jwtUserData.userId, updateFields);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (result === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        return generateServiceResult({}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function updatePassword(jwtUserData, oldPassword, newPassword) {
    try {
        const findUserResult = await usersDbMethods.findUserById(jwtUserData.userId, {password: true, email: true});
        if (findUserResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!findUserResult) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        if (await bcrypt.compare(oldPassword, findUserResult.password)) {
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const updateResult = await usersDbMethods.updateUserByID(jwtUserData.userId, {
                password: hashedPassword,
            });
            if (updateResult === 'error') {
                return generateServiceResult({}, 500, errorMessage.serverError);
            } else if (updateResult === 'notfound') {
                return generateServiceResult({}, 404, errorMessage.userNotFound);
            }

            if (findUserResult.email) {
                agenda.schedule('in 4 seconds', 'update password', {
                    email: findUserResult.email,
                });
            }

            return generateServiceResult({}, 200, '');
        } else {
            return generateServiceResult({}, 403, errorMessage.oldPassNotMatch);
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

// export async function resetPassword(email) {
//     try {
//
//     } catch (error) {
//         saveError(error);
//         return generateServiceResult({}, 500, errorMessage.serverError);
//     }
// }

export async function getUserActiveSessions(jwtUserData, refreshToken) {
    try {
        let result = await usersDbMethods.getUserActiveSessions(jwtUserData.userId);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!result) {
            return generateServiceResult({}, 404, errorMessage.sessionNotFound);
        }

        let thisDevice = result.find(item => item.refreshToken === refreshToken);
        let activeSessions = result.filter(item => item.refreshToken !== refreshToken).map(item => {
            delete item.userId;
            delete item.refreshToken;
            return item;
        });
        delete thisDevice.userId;
        delete thisDevice.refreshToken;
        return generateServiceResult({thisDevice, activeSessions}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function sendVerifyEmail(jwtUserData, host) {
    try {
        const findUserResult = await usersDbMethods.findUserById(jwtUserData.userId, {rawUsername: true, email: true});
        if (findUserResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!findUserResult) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        let newEmailToken = await bcrypt.hash(uuidv4(), 12);
        newEmailToken = newEmailToken.replace(/\//g, '');
        const newEmailToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour

        const updateResult = await usersDbMethods.updateUserByID(jwtUserData.userId, {
            emailVerifyToken: newEmailToken,
            emailVerifyToken_expire: newEmailToken_expire,
        });
        if (updateResult === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.emailNotFound);
        } else if (updateResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        }
        await agenda.now('verify email', {
            userId: jwtUserData.userId,
            rawUsername: findUserResult.rawUsername,
            email: findUserResult.email,
            emailVerifyToken: newEmailToken,
            host,
        });
        return generateServiceResult({}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function verifyEmail(userId, token) {
    try {
        let verifyResult = await usersDbMethods.verifyUserEmail(userId, token);
        if (verifyResult === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!verifyResult || verifyResult === 'notfound') {
            return generateServiceResult({}, 404, errorMessage.invalidToken);
        }
        //todo : show page like :: https://unlayer.com/templates/account-activation
        //todo : show page like :: https://unlayer.com/templates/streaming-app-subscription
        return generateServiceResult({message: 'email verified'}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

//---------------------------------------------------------------
//---------------------------------------------------------------

export async function uploadProfileImage(jwtUserData, uploadFileData) {
    try {
        if (!uploadFileData) {
            return generateServiceResult({data: null}, 400, errorMessage.badRequestBody);
        }

        const type = uploadFileData.mimetype === 'image/png' ? 'png' : 'jpg';
        let s3ProfileImage = await uploadProfileImageToS3(jwtUserData.userId, type, uploadFileData.buffer);
        if (!s3ProfileImage) {
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        }

        let profileImages = await usersDbMethods.uploadProfileImageDB(jwtUserData.userId, s3ProfileImage);
        if (profileImages === 'error' || profileImages.length === 0) {
            const fileName = s3ProfileImage.url.split('/').pop();
            await removeProfileImageFromS3(fileName);
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        }

        return generateServiceResult({
            data: {
                profileImages: profileImages
            }
        }, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({data: null}, 500, errorMessage.serverError);
    }
}

export async function removeProfileImage(jwtUserData, fileName) {
    try {
        fileName = fileName.split('/').pop();
        let profileImages = await usersDbMethods.removeProfileImageDB(jwtUserData.userId, fileName);
        if (profileImages === 'error') {
            return generateServiceResult({data: null}, 500, errorMessage.serverError);
        } else if (!profileImages) {
            return generateServiceResult({data: null}, 404, errorMessage.profileImageNotFound);
        }

        await removeProfileImageFromS3(fileName);

        return generateServiceResult({
            data: {
                profileImages: profileImages
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

        let updateResult = await usersDbMethods.updateUserByID(jwtUserData.userId, {favoriteGenres: genres});
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
        let result = await usersDbMethods.getAllUserSettingsDB(jwtUserData.userId);
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
        let result = await usersDbMethods.getUserSettingsDB(jwtUserData.userId, settingName);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!result) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }
        delete result.userId;
        return generateServiceResult({data: result}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function changeUserSettings(jwtUserData, settings, settingName) {
    try {
        let result = await usersDbMethods.changeUserSettingsDB(jwtUserData.userId, settings, settingName);
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

//---------------------------------------------------------------
//---------------------------------------------------------------

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
