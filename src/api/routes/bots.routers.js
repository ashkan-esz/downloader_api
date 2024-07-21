import {Router} from "express";
import mongoSanitize from "express-mongo-sanitize";
import middlewares from "../middlewares/index.js";
import {botsControllers} from '../../controllers/index.js';

const router = Router();


//bots/login
router.post('/login',
    middlewares.validateApiParams.checkApiParams(
        ['username_email', 'password', 'botId', 'chatId', 'botUsername']),
    middlewares.validateApiParams.apiParams_sendError,
    mongoSanitize(),
    botsControllers.loginBot);

//bots/:botId/notification/:notificationFlag
router.put('/:botId/notification/:notificationFlag',
    middlewares.auth.attachAuthFlagForBots, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(
        ['botId_param', 'notificationFlag']),
    middlewares.validateApiParams.apiParams_sendError,
    mongoSanitize(),
    botsControllers.updateAccountNotification);

//---------------------------------------------------
//---------------------------------------------------

export default router;