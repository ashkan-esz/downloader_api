import {defaultProfileImage} from "../data/cloudStorage.js";
import {} from "../crawlers/utils";


export function userModel(username, email, password, emailVerifyToken, emailVerifyToken_expire, deviceInfo) {
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
            getNewSession(deviceInfo, ''),
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
            liked: [],
        },
        registrationDate: new Date(),
        role: 'member',
    }
}

export function getNewSession(deviceInfo, refreshToken) {
    return ({
        appName: deviceInfo.appName || '',
        appVersion: deviceInfo.appVersion || '',
        deviceOs: deviceInfo.os || '',
        deviceModel: deviceInfo.deviceModel || '',
        IpLocation: deviceInfo.IpLocation || '',
        loginDate: new Date(),
        lastUseDate: new Date(),
        refreshToken: refreshToken || '',
    });
}
