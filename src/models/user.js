import {} from "../crawlers/utils";


export function userModel(username, email, password) {
    return {
        name: '',
        lastName: '',
        gender: '',
        username: username.toLowerCase(),
        rawUsername: username,
        email: email.toLowerCase(),
        emailVerified: false,
        password: password,
        about: '',
        bio: '',
        profileImages: [],
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
