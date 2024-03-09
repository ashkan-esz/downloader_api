import {Router} from 'express';
import mongoSanitize from "express-mongo-sanitize";
import {usersControllers} from '../../controllers/index.js';
import middlewares from '../middlewares/index.js';

const router = Router();

//users/signup
router.post('/signup',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized,
    middlewares.validation.signupValidation,
    middlewares.auth.addFingerPrint(), usersControllers.signup);

//users/login
router.post('/login',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized,
    middlewares.validation.loginValidation,
    middlewares.auth.addFingerPrint(), usersControllers.login);

//users/getToken
router.put('/getToken',
    middlewares.auth.isAuth_refreshToken, middlewares.validation.getTokenValidation,
    middlewares.auth.addFingerPrint(), usersControllers.getToken);

//users/logout
router.put('/logout', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.logout);

//users/forceLogout/:deviceId
router.put('/forceLogout/:deviceId', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.forceLogout);

//users/forceLogoutAll
router.put('/forceLogoutAll', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.forceLogoutAll);

//users/computeUserStats
router.put('/computeUserStats',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.rateLimit.rateLimit_3,
    usersControllers.computeUserStats);

export default router;
