
export function generateServiceResult(dataFields, code, errorMessage, extraData = {}) {
    return {
        ...extraData,
        responseData: {
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
    //----------------------
    userNotFound: 'Cannot find user',
    profileImageNotFound: 'Cannot find profile image',
    emailNotFound: 'Cannot find user email',
    //----------------------
    invalidRefreshToken: 'Invalid RefreshToken',
    invalidToken: 'Invalid/Stale Token',
    invalidDeviceId: 'Invalid deviceId',
    //----------------------
    userPassNotMatch: 'Username and password do not match',
    //----------------------
    badRequestBody: 'Incorrect request body',
    //----------------------
    usernameAlreadyExist: 'This username already exists',
    emailAlreadyExist: 'This email already exists',
    alreadyExist: 'Already exist',
    //----------------------
    botIsDisabled: 'This bot is disabled',
});
