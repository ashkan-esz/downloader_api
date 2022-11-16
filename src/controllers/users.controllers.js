import {validationResult} from 'express-validator';
import {getClientIp} from 'request-ip';
import {usersServices} from '../services/index.js';


export async function signup(req, res) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , ')
        });
    }

    const ip = getClientIp(req) || '';
    let {username, password, email, deviceInfo} = req.body;
    const host = req.protocol + '://' + req.get('host');
    let signupResult = await usersServices.signup(username, email, password, deviceInfo, ip, req.fingerprint, host);
    if (signupResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            signupResult.responseData.refreshToken = signupResult.refreshToken;
        } else {
            res.cookie('refreshToken', signupResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
            });
        }
    }

    return res.status(signupResult.responseData.code).json(signupResult.responseData);
}

export async function login(req, res) {
    const isAdminLogin = req.originalUrl.includes('/admin/login');
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , ')
        });
    }

    const ip = getClientIp(req) || '';
    let {username_email, password, deviceInfo} = req.body;
    let loginResult = await usersServices.login(username_email, password, deviceInfo, ip, req.fingerprint, isAdminLogin);
    if (loginResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            loginResult.responseData.refreshToken = loginResult.refreshToken;
        } else {
            res.cookie('refreshToken', loginResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
            });
        }
    }

    return res.status(loginResult.responseData.code).json(loginResult.responseData);
}

export async function getToken(req, res) {
    const isAdminLogin = req.originalUrl.includes('/admin/getToken');
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , ')
        });
    }

    let deviceInfo = req.body.deviceInfo;
    const ip = getClientIp(req) || '';
    let getTokenResult = await usersServices.getToken(req.jwtUserData, deviceInfo, ip, req.refreshToken, isAdminLogin);
    if (getTokenResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            getTokenResult.responseData.refreshToken = getTokenResult.refreshToken;
        } else {
            res.cookie('refreshToken', getTokenResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
            });
        }
    }

    return res.status(getTokenResult.responseData.code).json(getTokenResult.responseData);
}

export async function logout(req, res) {
    let getTokenResult = await usersServices.logout(req.jwtUserData, req.refreshToken, req.accessToken);
    if (getTokenResult.responseData.code >= 200 && getTokenResult.responseData.code < 300) {
        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            expires: new Date(0),
            maxAge: 0,
        });
    }

    return res.status(getTokenResult.responseData.code).json(getTokenResult.responseData);
}

export async function forceLogout(req, res) {
    let getTokenResult = await usersServices.forceLogout(req.jwtUserData, req.params.deviceId, req.refreshToken);

    return res.status(getTokenResult.responseData.code).json(getTokenResult.responseData);
}

export async function forceLogoutAll(req, res) {
    let getTokenResult = await usersServices.forceLogoutAll(req.jwtUserData, req.refreshToken);

    return res.status(getTokenResult.responseData.code).json(getTokenResult.responseData);
}

export async function getUserProfile(req, res) {
    let result = await usersServices.getUserProfile(req.userData, req.refreshToken);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getUserActiveSessions(req, res) {
    let result = await usersServices.getUserActiveSessions(req.userData, req.refreshToken);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function sendVerifyEmail(req, res) {
    const host = req.protocol + '://' + req.get('host');
    let verifyResult = await usersServices.sendVerifyEmail(req.userData, host);

    return res.status(verifyResult.responseData.code).json(verifyResult.responseData);
}

export async function verifyEmail(req, res) {
    let verifyResult = await usersServices.verifyEmail(req.params.token);

    return res.status(verifyResult.responseData.code).json(verifyResult.responseData);
}

export async function uploadProfileImage(req, res) {
    let uploadProfileResult = await usersServices.uploadProfileImage(req.jwtUserData, req.file);

    return res.status(uploadProfileResult.responseData.code).json(uploadProfileResult.responseData);
}

export async function removeProfileImage(req, res) {
    let fileName = req.params.filename;
    let removeProfileResult = await usersServices.removeProfileImage(req.jwtUserData, fileName);

    return res.status(removeProfileResult.responseData.code).json(removeProfileResult.responseData);
}

export async function setFavoriteGenres(req, res) {
    let genres = removeDuplicateElements(req.params.genres);
    let updateResult = await usersServices.setFavoriteGenres(req.jwtUserData, genres);

    return res.status(updateResult.responseData.code).json(updateResult.responseData);
}

//----------------------------
//----------------------------

export async function getAllUserSettings(req, res) {
    let result = await usersServices.getAllUserSettings(req.jwtUserData);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getUserSettings(req, res) {
    let result = await usersServices.getUserSettings(req.jwtUserData, req.params.settingName);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function changeUserSettings(req, res) {
    let result = await usersServices.changeUserSettings(req.jwtUserData, req.body.settings, req.params.settingName);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function computeUserStats(req, res) {
    let result = await usersServices.computeUserStats(req.jwtUserData);

    return res.status(result.responseData.code).json(result.responseData);
}

//----------------------------
//----------------------------

function removeDuplicateElements(input) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (input[i] === result[j]) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}
