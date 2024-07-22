import * as usersDbMethods from "../data/db/usersDbMethods.js";
import * as botsDbMethods from "../data/db/botsDbMethods.js";
import {errorMessage, generateServiceResult} from "./serviceUtils.js";
import * as bcrypt from "bcrypt";
import {saveError} from "../error/saveError.js";
import {generateAuthTokens, getJwtPayload} from "./users.services.js";


export async function loginBot(username_email, password, botId, chatId, botUsername) {
    try {
        let botData = await botsDbMethods.getBotData(botId);
        if (botData === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!botData) {
            return generateServiceResult({}, 404, errorMessage.botNotFound);
        } else if (!botData.permissionToLogin) {
            return generateServiceResult({}, 403, errorMessage.botNoLoginPermission);
        }

        let userData = await usersDbMethods.findUser(username_email, username_email);
        if (userData === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!userData) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        if (await bcrypt.compare(password, userData.password)) {
            let addResult = await botsDbMethods.addUserBotData(userData.userId, botId, chatId, botUsername);
            if (addResult === 'error') {
                return generateServiceResult({}, 500, errorMessage.serverError);
            }

            const user = getJwtPayload(userData);
            user.chatId = chatId;
            user.botUsername = botUsername;
            user.isBotRequest = true;
            user.botId = botId;
            const tokens = generateAuthTokens(user, '720d', '720d');

            return generateServiceResult({
                accessToken: tokens.accessToken,
                accessToken_expire: tokens.accessToken_expire,
                username: userData.rawUsername,
                userId: userData.userId,
                notification: addResult.notification,
            }, 200, '');
        } else {
            return generateServiceResult({}, 403, errorMessage.userPassNotMatch);
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}

export async function updateAccountNotification(botId, botData, notificationFlag, jwtUserData) {
    try {
        let result = await botsDbMethods.updateAccountNotificationForBot(jwtUserData.userId, botId, notificationFlag);
        if (result === 'error') {
            return generateServiceResult({}, 500, errorMessage.serverError);
        } else if (!result) {
            return generateServiceResult({}, 404, errorMessage.userNotFound);
        }

        return generateServiceResult({notification: result.notification,}, 200, '');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, errorMessage.serverError);
    }
}