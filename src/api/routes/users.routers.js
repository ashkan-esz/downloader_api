import {Router} from 'express';
import {usersControllers} from '../../controllers';
import middlewares from '../middlewares';

const router = Router();

//users/signup
router.post('/signup', middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized, middlewares.validation.signupValidation, usersControllers.signup);

//users/login
router.post('/login', middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized, middlewares.validation.loginValidation, usersControllers.login);

//users/getToken
router.post('/getToken', middlewares.auth.isAuth_refreshToken, usersControllers.getToken);

//users/logout
router.post('/logout', middlewares.auth.attachAuthFlag, usersControllers.logout);

//users/forceLogout
router.post('/forceLogout/:deviceId', middlewares.auth.attachAuthFlag, usersControllers.forceLogout);

//users/forceLogoutAll
router.post('/forceLogoutAll', middlewares.auth.attachAuthFlag, usersControllers.forceLogoutAll);

//users/myProfile
router.get('/myProfile', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.getUserProfile);

//users/myProfile
router.get('/activeSessions', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.getUserActiveSessions);

//users/sendVerifyEmail
router.get('/sendVerifyEmail', middlewares.rateLimit, middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.sendVerifyEmail);

//users/verifyEmail/:token
router.get('/verifyEmail/:token', middlewares.rateLimit, usersControllers.verifyEmail);


export default router;
