import {defaultProfileImage} from "../data/cloudStorage.js";
import {} from "../crawlers/utils";


export function userModel(username, email, password, emailVerifyToken, emailVerifyToken_expire) {
    return {
        name: '',
        lastName: '',
        gender: '',
        username: username.toLowerCase(),
        rawUsername: username,
        email: email.toLowerCase(),
        emailVerified: false,
        emailVerifyToken: emailVerifyToken,
        emailVerifyToken_expire: emailVerifyToken_expire,
        password: password,
        about: '',
        bio: '',
        profileImages: [],
        defaultProfile: defaultProfileImage,
        activeSessions: [],
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
        loginDate: new Date(),
        refreshToken: '',
        role: 'member',
    }
}
