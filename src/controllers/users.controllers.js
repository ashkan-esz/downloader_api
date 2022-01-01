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
            signupResult.data.refreshToken = signupResult.refreshToken;
        } else {
            res.cookie('refreshToken', signupResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            });
        }
    }
    res.statusCode = signupResult.data.code;
    return res.json(signupResult.data);
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
            loginResult.data.refreshToken = loginResult.refreshToken;
        } else {
            res.cookie('refreshToken', loginResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            });
        }
    }
    res.statusCode = loginResult.data.code;
    return res.json(loginResult.data);
}

export async function getToken(req, res) {
    if (!req.isAuth && req.authCode) {
        return res.sendStatus(req.authCode);
    }
    let deviceInfo = req.body.deviceInfo || {};
    let getTokenResult = await usersServices.getToken(req.jwtUserData, deviceInfo, req.refreshToken);
    if (getTokenResult.refreshToken) {
        if (req.query.noCookie === 'true') {
            getTokenResult.data.refreshToken = getTokenResult.refreshToken;
        } else {
            res.cookie('refreshToken', getTokenResult.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            });
        }
    }
    res.statusCode = getTokenResult.data.code;
    return res.json(getTokenResult.data);
}

export async function logout(req, res) {
    if (!req.isAuth && req.authCode) {
        return res.sendStatus(req.authCode);
    }
    let getTokenResult = await usersServices.logout(req.jwtUserData, req.refreshToken, req.accessToken);
    if (getTokenResult.data.code >= 200 && getTokenResult.data.code < 300) {
        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            expires: new Date(0),
            maxAge: 0,
        });
    }
    res.statusCode = getTokenResult.data.code;
    return res.json(getTokenResult.data);
}

export async function forceLogout(req, res) {
    if (!req.isAuth && req.authCode) {
        return res.sendStatus(req.authCode);
    }
    let getTokenResult = await usersServices.forceLogout(req.jwtUserData, req.params.deviceId, req.refreshToken);
    res.statusCode = getTokenResult.data.code;
    return res.json(getTokenResult.data);
}

export async function forceLogoutAll(req, res) {
    if (!req.isAuth && req.authCode) {
        return res.sendStatus(req.authCode);
    }
    let getTokenResult = await usersServices.forceLogoutAll(req.jwtUserData, req.refreshToken);
    res.statusCode = getTokenResult.data.code;
    return res.json(getTokenResult.data);
}

export async function getUserProfile(req, res) {
    let result = await usersServices.getUserProfile(req.userData, req.refreshToken);
    res.statusCode = result.data.code;
    return res.json(result.data);
}

export async function getUserActiveSessions(req, res) {
    let result = await usersServices.getUserActiveSessions(req.userData, req.refreshToken);
    res.statusCode = result.data.code;
    return res.json(result.data);
}

export async function sendVerifyEmail(req, res) {
    const host = req.protocol + '://' + req.get('host');
    let verifyResult = await usersServices.sendVerifyEmail(req.userData, host);
    res.statusCode = verifyResult.data.code;
    return res.json(verifyResult.data);
}

export async function verifyEmail(req, res) {
    let verifyResult = await usersServices.verifyEmail(req.params.token);
    res.statusCode = verifyResult.data.code;
    return res.json(verifyResult.data);
}
