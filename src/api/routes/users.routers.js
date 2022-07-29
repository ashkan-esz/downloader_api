import {Router} from 'express';
import {usersControllers} from '../../controllers/index.js';
import middlewares from '../middlewares/index.js';

const router = Router();

//users/signup
router.post('/signup', middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized, middlewares.validation.signupValidation, usersControllers.signup);

//users/login
router.post('/login', middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized, middlewares.validation.loginValidation, usersControllers.login);

//users/getToken
router.put('/getToken', middlewares.auth.isAuth_refreshToken, usersControllers.getToken);

//users/logout
router.put('/logout', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.logout);

//users/forceLogout/:deviceId
router.put('/forceLogout/:deviceId', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.forceLogout);

//users/forceLogoutAll
router.put('/forceLogoutAll', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, usersControllers.forceLogoutAll);

//users/myProfile
router.get('/myProfile', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.getUserProfile);

//users/activeSessions
router.get('/activeSessions', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.getUserActiveSessions);

//users/sendVerifyEmail
router.get('/sendVerifyEmail', middlewares.rateLimit, middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.sendVerifyEmail);

//users/verifyEmail/:token
router.get('/verifyEmail/:token', middlewares.rateLimit, usersControllers.verifyEmail);

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
    usersControllers.setFavoriteGenres);

export default router;
