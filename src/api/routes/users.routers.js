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

//users/deleteAccount
router.delete('/deleteAccount', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.sendDeleteAccountEmail);

//users/deleteAccount:userId/:token
router.get('/deleteAccount/:userId/:token', middlewares.rateLimit.rateLimit_2, usersControllers.deleteAccount);

//users/profile
router.get('/profile', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.getUserProfile);

//users/editProfile
router.post('/editProfile',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['username_body', 'publicName_body', 'bio_body', 'email_body', 'mbtiType_body']),
    middlewares.validateApiParams.apiParams_sendError,
    mongoSanitize(),
    usersControllers.editProfile);

//users/updatePassword
router.put('/updatePassword',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['oldPassword_body', 'newPassword_body']),
    middlewares.validateApiParams.apiParams_sendError,
    mongoSanitize(),
    usersControllers.updatePassword);

// //users/resetPassword
// router.put('/resetPassword',
//     middlewares.validateApiParams.checkApiParams(['email_body']),
//     middlewares.validateApiParams.apiParams_sendError,
//     mongoSanitize(),
//     usersControllers.resetPassword);

//users/activeSessions
router.get('/activeSessions', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.getUserActiveSessions);

//users/sendVerifyEmail
router.get('/sendVerifyEmail', middlewares.rateLimit.rateLimit_2, middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.sendVerifyEmail);

//users/verifyEmail/:userId/:token
router.get('/verifyEmail/:userId/:token', middlewares.rateLimit.rateLimit_2, usersControllers.verifyEmail);

//users/uploadProfileImage
router.post('/uploadProfileImage', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.userPermission.uploadProfileImage, middlewares.uploadUserProfile, usersControllers.uploadProfileImage);

//users/removeProfileImage/:filename
router.delete('/removeProfileImage/:filename', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.removeProfileImage);

//users/setFavoriteGenres/:genres
router.put('/setFavoriteGenres/:genres',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['genres']),
    middlewares.validateApiParams.apiParams_sendError,
    mongoSanitize(),
    usersControllers.setFavoriteGenres);

//users/computeUserStats
router.put('/computeUserStats',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.rateLimit.rateLimit_3,
    usersControllers.computeUserStats);

export default router;
