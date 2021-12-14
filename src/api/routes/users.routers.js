import {Router} from 'express';
import {usersControllers} from '../../controllers';
import middlewares from '../middlewares';

const router = Router();

//users/signup
router.post('/signup', middlewares.auth.attachAuthFlag, middlewares.validation.signupValidation, usersControllers.signup);

//users/login
router.post('/login', middlewares.auth.attachAuthFlag, middlewares.validation.loginValidation, usersControllers.login);

//users/getToken
router.post('/getToken', middlewares.auth.isAuth_refreshToken, middlewares.attachCurrentUser, usersControllers.getToken);

//users/logout
router.post('/logout', middlewares.auth.isAuth, middlewares.attachCurrentUser, usersControllers.logout);

//users/profile
router.get('/profile', middlewares.auth.isAuth, middlewares.attachCurrentUser, usersControllers.getUserProfile);


export default router;
