import {defaultProfileImage} from "../data/cloudStorage.js";
import {} from "../crawlers/utils";


export function userModel(username, email, password, emailVerifyToken, emailVerifyToken_expire, deviceInfo, deviceId) {
    return {
        username: username.toLowerCase(),
        rawUsername: username,
        publicName: username,
        email: email.toLowerCase(),
        emailVerified: false,
        emailVerifyToken: emailVerifyToken,
        emailVerifyToken_expire: emailVerifyToken_expire,
        password: password,
        bio: '',
        profileImages: [],
        defaultProfile: defaultProfileImage,
        activeSessions: [
            getNewDeviceSession(deviceInfo, deviceId, ''),
        ],
        friends: [],
        favorites: {
            titles: [],
            staff: [],
            characters: [],
        },
        status: {
            watched: [],
            watching: [],
            dropped: [],
            wantToWatch: [],
        },
        registrationDate: new Date(),
        role: 'member',
    }
}

export function getNewDeviceSession(deviceInfo, deviceId, refreshToken) {
    return ({
        appName: deviceInfo.appName || '',
        appVersion: deviceInfo.appVersion || '',
        deviceOs: deviceInfo.os || '',
        deviceModel: deviceInfo.deviceModel || '',
        ipLocation: deviceInfo.ipLocation || '',
        deviceId: deviceId,
        loginDate: new Date(),
        lastUseDate: new Date(),
        refreshToken: refreshToken || '',
    });
}