import {Router} from 'express';
import {usersControllers} from '../../controllers';
import middlewares from '../middlewares';

const router = Router();

//users/signup
router.post('/signup', middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized, middlewares.validation.signupValidation, usersControllers.signup);

//users/login
router.post('/login', middlewares.auth.attachAuthFlag, middlewares.auth.blockAuthorized, middlewares.validation.loginValidation, usersControllers.login);

//users/getToken
router.post('/getToken', middlewares.auth.isAuth_refreshToken, middlewares.attachCurrentUser, usersControllers.getToken);

//users/logout
router.post('/logout', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.logout);

//users/profile
router.get('/profile', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.getUserProfile);

//users/sendVerifyEmail
router.get('/sendVerifyEmail', middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser, usersControllers.sendVerifyEmail);

//users/verifyEmail/:token
router.get('/verifyEmail/:token', usersControllers.verifyEmail);


export default router;
