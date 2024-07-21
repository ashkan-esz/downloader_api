import config from "../config/index.js";
import {botsServices} from "../services/index.js";
import {sendResponse} from "./controllerUtils.js";

export async function loginBot(req, res) {
    let {username_email, password, botId, chatId, botUsername} = req.body;
    let result = await botsServices.loginBot(username_email, password, botId, chatId, botUsername);
    if (result.refreshToken) {
        result.responseData.refreshToken = result.refreshToken;
    }

    return sendResponse(req, res, result);
}

export async function updateAccountNotification(req, res) {
    let {botId, notificationFlag} = req.params;
    let result = await botsServices.updateAccountNotification(botId, notificationFlag, req.jwtUserData);

    return sendResponse(req, res, result);
}