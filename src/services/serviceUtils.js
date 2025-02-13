export function generateServiceResult(dataFields, code, errorMessage, extraData = {}) {
    return {
        ...extraData,
        responseData: {
            isCacheData: false,
            ...dataFields,
            code: code,
            errorMessage: errorMessage,
        }
    };
}

export const errorMessage = Object.freeze({
    serverError: 'Server error, try again later',
    //----------------------
    exceedProfileImage: 'Exceeded 20 profile image',
    exceedGenres: 'Exceeded number of genres limit (6)',
    //----------------------
    movieSourcesNotFound: 'Movie sources not found',
    crawlerSourceNotFound: 'Crawler source not found',
    crawlerSourceAlreadyExist: 'Crawler source already exist',
    moviesNotFound: 'Movies not found',
    movieNotFound: 'Movie not found',
    genresNotFound: 'Genres not found',
    documentsNotFound: 'Documents not found',
    documentNotFound: 'Document not found',
    staffNotFound: 'Staff not found',
    characterNotFound: 'Character not found',
    mscNotFound: 'Movie/Staff/Character not found',
    scNotFound: 'Staff/Character not found',
    botNotFound: 'Bot not found',
    messageNotFound: 'Message not found',
    appNotFound: 'App not found',
    configsDbNotFound: 'Configs from database not found',
    jobNotFound: 'job not found',
    cantRemoveCurrentOrigin: 'Cannot remove current origin from corsAllowedOrigins',
    //----------------------
    userNotFound: 'Cannot find user',
    sessionNotFound: 'Cannot find session',
    profileImageNotFound: 'Cannot find profile image',
    emailNotFound: 'Cannot find user email',
    //----------------------
    invalidRefreshToken: 'Invalid RefreshToken',
    invalidToken: 'Invalid/Stale Token',
    invalidDeviceId: 'Invalid deviceId',
    //----------------------
    userPassNotMatch: 'Username and password do not match',
    oldPassNotMatch: 'Old password does not match',
    //----------------------
    badRequestBody: 'Incorrect request body',
    //----------------------
    userIdAlreadyExist: 'This userId already exists',
    usernameAlreadyExist: 'This username already exists',
    emailAlreadyExist: 'This email already exists',
    alreadyExist: 'Already exist',
    alreadyFollowed: 'Already followed',
    //----------------------
    botIsDisabled: 'This bot is disabled',
    botNoLoginPermission: 'This bot doesnt have the permission to login',
    botNoTorrentSearchPermission: 'This bot doesnt have the permission to searchTorrent',
    //----------------------
    adminPermissionNeeded: 'Forbidden, needed [admin] permission',
});
