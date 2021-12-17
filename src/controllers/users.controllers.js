import {usersServices} from '../services';
import {validationResult} from 'express-validator';


export async function signup(req, res) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , ')
        });
    }

    let {username, password, email} = req.body;
    const host = req.protocol + '://' + req.get('host');
    let signupResult = await usersServices.signup(username, email, password, host);
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

    let {username_email, password} = req.body;
    let loginResult = await usersServices.login(username_email, password);
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
    let getTokenResult = await usersServices.getToken(req.userData, req.refreshToken);
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
    let getTokenResult = await usersServices.logout(req.userData, req.refreshToken, req.accessToken);
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

export async function getUserProfile(req, res) {
    let user = req.userData;
    delete user.password;
    delete user.refreshToken;
    return res.json(user);
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
