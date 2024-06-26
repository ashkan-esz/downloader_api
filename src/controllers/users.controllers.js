import config from "../config/index.js";
import {validationResult} from 'express-validator';
import {getClientIp} from 'request-ip';
import {usersServices} from '../services/index.js';
import {sendResponse} from "./controllerUtils.js";


export async function signup(req, res) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , '),
            isGuest: false,
            isCacheData: false,
        });
    }

    const ip = getClientIp(req) || '';
    let {username, password, email, deviceInfo} = req.body;
    const host = req.protocol + '://' + req.get('host');
    let result = await usersServices.signup(username, email, password, deviceInfo, ip, req.fingerprint, host);
    if (result.refreshToken) {
        if (req.query.noCookie === 'true') {
            result.responseData.refreshToken = result.refreshToken;
        } else {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: true,
                domain: (!config.domain || config.domain === "localhost") ? undefined : "." + config.domain,
                sameSite: 'none',
            });
        }
    }

    return sendResponse(req, res, result);
}

export async function login(req, res) {
    const isAdminLogin = req.originalUrl.includes('/admin/login');
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , '),
            isGuest: false,
            isCacheData: false,
        });
    }

    const ip = getClientIp(req) || '';
    let {username_email, password, deviceInfo} = req.body;
    let result = await usersServices.login(username_email, password, deviceInfo, ip, req.fingerprint, isAdminLogin);
    if (result.refreshToken) {
        if (req.query.noCookie === 'true') {
            result.responseData.refreshToken = result.refreshToken;
        } else {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: true,
                domain: (!config.domain || config.domain === "localhost") ? undefined : "." + config.domain,
                sameSite: 'none',
            });
        }
    }

    return sendResponse(req, res, result);
}

export async function getToken(req, res) {
    const isAdminLogin = req.originalUrl.includes('/admin/getToken');
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(' , '),
            isGuest: false,
            isCacheData: false,
        });
    }

    let deviceInfo = req.body.deviceInfo;
    const includeProfileImages = req.query.profileImages === 'true';
    const ip = getClientIp(req) || '';
    let result = await usersServices.getToken(req.jwtUserData, deviceInfo, ip, req.fingerprint, req.refreshToken, includeProfileImages, isAdminLogin);
    if (result.refreshToken) {
        if (req.query.noCookie === 'true') {
            result.responseData.refreshToken = result.refreshToken;
        } else {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: true,
                domain: (!config.domain || config.domain === "localhost") ? undefined : "." + config.domain,
                sameSite: 'none',
            });
        }
    }

    return sendResponse(req, res, result);
}

export async function logout(req, res) {
    let result = await usersServices.logout(req.jwtUserData, req.refreshToken, req.accessToken);
    if (result.responseData.code >= 200 && result.responseData.code < 300) {
        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: true,
            domain: (!config.domain || config.domain === "localhost") ? undefined : "." + config.domain,
            sameSite: 'none',
            expires: new Date(0),
            maxAge: 0,
        });
    }

    return sendResponse(req, res, result);
}

//----------------------------
//----------------------------

export async function computeUserStats(req, res) {
    let result = await usersServices.computeUserStats(req.jwtUserData);
    return sendResponse(req, res, result);
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
