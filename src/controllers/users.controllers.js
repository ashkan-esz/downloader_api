import {validationResult} from 'express-validator';
import {getClientIp} from 'request-ip';
import {usersServices} from '../services';


export async function signup(req, res) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , ')
        });
    }

    const ip = getClientIp(req) || '';
    let {username, password, email, deviceInfo} = req.body;
    deviceInfo = deviceInfo || {};
    const host = req.protocol + '://' + req.get('host');
    let signupResult = await usersServices.signup(username, email, password, deviceInfo, ip, host);
    if (signupResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            signupResult.responseData.refreshToken = signupResult.refreshToken;
        } else {
            res.cookie('refreshToken', signupResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            });
        }
    }

    return res.status(signupResult.responseData.code).json(signupResult.responseData);
}

export async function login(req, res) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , ')
        });
    }

    const ip = getClientIp(req) || '';
    let {username_email, password, deviceInfo} = req.body;
    deviceInfo = deviceInfo || {};
    let loginResult = await usersServices.login(username_email, password, deviceInfo, ip);
    if (loginResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            loginResult.responseData.refreshToken = loginResult.refreshToken;
        } else {
            res.cookie('refreshToken', loginResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            });
        }
    }

    return res.status(loginResult.responseData.code).json(loginResult.responseData);
}

export async function getToken(req, res) {
    let deviceInfo = req.body.deviceInfo || {};
    const ip = getClientIp(req) || '';
    let getTokenResult = await usersServices.getToken(req.jwtUserData, deviceInfo, ip, req.refreshToken);
    if (getTokenResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            getTokenResult.responseData.refreshToken = getTokenResult.refreshToken;
        } else {
            res.cookie('refreshToken', getTokenResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
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
            sameSite: 'lax',
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
