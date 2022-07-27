import {defaultProfileImage} from "../data/cloudStorage.js";


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
        profileImageCounter: 0,
        defaultProfile: defaultProfileImage,
        activeSessions: [
            getNewDeviceSession(deviceInfo, deviceId, ''),
        ],
        favoriteGenres: [],
        friends: [],
        computed: {
            favoriteGenres: [],
            lastUpdate: 0,
        },
        registrationDate: new Date(),
        role: 'user',
    }
}

export function getNewDeviceSession(deviceInfo, deviceId, refreshToken) {
    let now = new Date();
    return ({
        appName: deviceInfo.appName || '',
        appVersion: deviceInfo.appVersion || '',
        deviceOs: deviceInfo.os || '',
        deviceModel: deviceInfo.deviceModel || '',
        ipLocation: deviceInfo.ipLocation || '',
        deviceId: deviceId,
        loginDate: now,
        lastUseDate: now,
        refreshToken: refreshToken || '',
    });
}
