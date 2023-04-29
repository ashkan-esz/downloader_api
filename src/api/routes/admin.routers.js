import {Router} from "express";
import mongoSanitize from "express-mongo-sanitize";
import middlewares from "../middlewares/index.js";
import {usersControllers, adminControllers} from '../../controllers/index.js';

const router = Router();


//admin/login
router.post('/login',
    middlewares.auth.attachAuthFlag, middlewares.validation.loginValidation,
    mongoSanitize(),
    middlewares.auth.addFingerPrint(), usersControllers.login);

//admin/getToken
router.put('/getToken',
    middlewares.auth.isAuth_refreshToken, middlewares.validation.getTokenValidation,
    mongoSanitize(), usersControllers.getToken);

//---------------------------------------------------
//---------------------------------------------------

//admin/crawler/start
router.put('/crawler/start',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName_query', 'crawlerMode', 'handleDomainChange', 'handleDomainChangeOnly', 'handleCastUpdate']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin']), adminControllers.startCrawler);

//admin/crawler/pause/:duration
router.put('/crawler/pause/:duration',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['duration']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin']), adminControllers.manualPauseCrawler);

//admin/crawler/resume/:force
router.put('/crawler/resume/:force',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['force']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin']), adminControllers.resumeCrawler);

//admin/crawler/stop
router.put('/crawler/stop',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin']), adminControllers.manualStopCrawler);

//admin/crawler/status
router.get('/crawler/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerStatus);

//admin/crawler/history/:startTime/:endTime/:skip/:limit
router.get('/crawler/history/:startTime/:endTime/:skip/:limit',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['startTime', 'endTime', 'skip', 'limit']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlingHistory);

//admin/crawler/warnings/history/:startTime/:endTime/:skip/:limit
router.get('/crawler/warnings/history/:startTime/:endTime/:skip/:limit',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['startTime', 'endTime', 'skip', 'limit']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerWarningsHistory);

//admin/crawler/sources
router.get('/crawler/sources',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerSources);

//admin/crawler/warnings/resolve/:id
router.put('/crawler/warnings/resolve/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['id']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.resolveCrawlerWarning);

//admin/crawler/warnings
router.get('/crawler/warnings',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerWarnings);

//admin/crawler/editSource/:sourceName
router.put('/crawler/editSource/:sourceName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName_param', 'movie_url', 'page_count', 'serial_url', 'serial_page_count', 'crawlCycle', 'disabled', 'cookies']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.editSource);

//admin/crawler/addSource
router.put('/crawler/addSource',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName', 'movie_url', 'page_count', 'serial_url', 'serial_page_count', 'crawlCycle', 'disabled', 'cookies']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.addSource);

//---------------------------------------------------
//---------------------------------------------------

//admin/serverLogs/history/:startTime/:endTime/:skip/:limit
router.get('/serverLogs/history/:startTime/:endTime/:skip/:limit',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['startTime', 'endTime', 'skip', 'limit']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getServerLogsInTimes);

//admin/serverLogs/remove/:id
router.put('/serverLogs/remove/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['id']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.removeServerLog);

//admin/serverLogs
router.get('/serverLogs',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getServerLogs);

//---------------------------------------------------
//---------------------------------------------------

//admin/configs/update
router.put('/configs/update',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['configs']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin']),
    mongoSanitize(),
    adminControllers.updateConfigsDb);

//admin/configs
router.get('/configs',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getConfigsDb);

//---------------------------------------------------
//---------------------------------------------------

//admin/analysis/activeUsers/:startTime/:endTime/:skip/:limit
router.get('/analysis/activeUsers/:startTime/:endTime/:skip/:limit',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['startTime', 'endTime', 'skip', 'limit']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getActiveUsersAnalysis);

//admin/server/status
router.get('/server/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getServerStatus);

export default router;
