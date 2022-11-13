import {Router} from "express";
import middlewares from "../middlewares/index.js";
import {usersControllers, adminControllers} from '../../controllers/index.js';

const router = Router();


//admin/login
router.post('/login',
    middlewares.auth.attachAuthFlag, middlewares.validation.loginValidation,
    middlewares.auth.addFingerPrint(), usersControllers.login);

//admin/crawler/start
router.put('/crawler/start', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin']), adminControllers.startCrawler);

//admin/crawler/status
router.get('/crawler/status', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerStatus);

//admin/crawler/history/:startTime/:endTime/:skip/:limit
router.get('/crawler/history/:startTime/:endTime/:skip/:limit', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlingHistory);

//admin/crawler/sources
router.get('/crawler/sources',  middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerSources);

//admin/analysis/activeUsers/:startTime/:endTime/:skip/:limit
router.get('/analysis/activeUsers/:startTime/:endTime/:skip/:limit', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getActiveUsersAnalysis);


export default router;
