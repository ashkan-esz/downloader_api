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
    mongoSanitize(),
    middlewares.auth.addFingerPrint(), usersControllers.getToken);

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

//admin/crawler/crawlUrl
router.put('/crawler/crawlUrl',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['sourceName', 'url_body', 'title', 'type']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.crawlUrl);

//---------------------------------------------------
//---------------------------------------------------

//admin/analysis/:serverAnalysisFieldName/:startTime/:endTime/:skip/:limit
router.get('/analysis/:serverAnalysisFieldName/:startTime/:endTime/:skip/:limit',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'startTime', 'endTime', 'skip', 'limit']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getServerAnalysisInTimes);

//admin/analysis/currentMonth/:serverAnalysisFieldName/:page
router.get('/analysis/currentMonth/:serverAnalysisFieldName/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'page']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getServerAnalysisCurrentMonth);

//admin/analysis/resolve/:serverAnalysisFieldName/:id
router.put('/analysis/resolve/:serverAnalysisFieldName/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'id']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.resolveServerAnalysis);

//admin/analysis/resolve/:serverAnalysisFieldName
router.put('/analysis/resolve/:serverAnalysisFieldName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'ids']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.resolveServerAnalysisByIds);

//admin/analysis/resolve/:serverAnalysisFieldName/lastDays/:days
router.put('/analysis/resolve/:serverAnalysisFieldName/lastDays/:days',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'days']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.resolveServerAnalysisLastDays);

//---------------------------------------------------
//---------------------------------------------------

//admin/crawler/sources
router.get('/crawler/sources',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCrawlerSources);

//admin/crawler/editSource/:sourceName
router.put('/crawler/editSource/:sourceName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName_param', 'movie_url', 'serial_url', 'crawlCycle', 'disabled', 'cookies', 'reCrawl', 'description']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.editSource);

//admin/crawler/removeSource/:sourceName
router.delete('/crawler/removeSource/:sourceName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['sourceName_param']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.removeSource);

//admin/crawler/addSource
router.put('/crawler/addSource',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName', 'movie_url', 'serial_url', 'crawlCycle', 'disabled', 'cookies']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.addSource);

//---------------------------------------------------
//---------------------------------------------------

//admin/configs/update
router.put('/configs/update',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['corsAllowedOrigins', 'disableTestUserRequests', 'disableCrawlerForDuration', 'disableCrawler', 'developmentFaze']),
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

//admin/server/status
router.get('/server/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getServerStatus);

//admin/remoteBrowsers/status
router.get('/remoteBrowsers/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getRemoteBrowsersStatus);

//admin/remoteBrowsers/:mutateType/:id?all=Boolean
router.put('/remoteBrowsers/:mutateType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['mutateType', 'id', 'all']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.mutateRemoteBrowserStatus);

//admin/remoteBrowsers/checkSource/:sourceName/:url
router.get('/remoteBrowsers/checkSource/:sourceName/:url',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['sourceName_param', 'url']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.checkSourceOnRemoteBrowsers);

//---------------------------------------------------
//---------------------------------------------------

//admin/setMessage
router.put('/setMessage',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['message', 'date']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.setMessage);

//---------------------------------------------------
//---------------------------------------------------

//admin/addNewAppVersion
router.post('/addNewAppVersion',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['appData']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']),
    middlewares.userPermission.uploadAppVersion,
    middlewares.uploadAppFile,
    mongoSanitize(),
    adminControllers.addNewAppVersion);

//admin/removeAppVersion/:vid
router.put('/removeAppVersion/:vid',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['vid']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.removeAppVersion);

//admin/appVersions
router.get('/appVersions',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getAppVersion);

//---------------------------------------------------
//---------------------------------------------------

//admin/3rdpartyApis/checkWorking
router.get('/3rdpartyApis/checkWorking',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.check3rdPartApisWorking);

//---------------------------------------------------
//---------------------------------------------------

//admin/bots
router.get('/bots',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['botId_query']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getBots);

//admin/bots/editBot/:botId
router.put('/bots/editBot/:botId',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['botId_param', 'botName', 'botType', 'lastUseDate', 'lastApiCall_news', 'lastApiCall_updates', 'disabled', 'description']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.editBot);

//admin/bots/addBot
router.put('/bots/addBot',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['botName', 'botType', 'disabled', 'description']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.addBot);

//admin/bots/deleteBot/:botId
router.delete('/bots/deleteBot/:botId',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['botId_param']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.deleteBot);

//---------------------------------------------------
//---------------------------------------------------

//admin/cronjobs
router.get('/cronjobs',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.getCronJobs);

//admin/cronjobs/:jobName
router.put('/cronjobs/start/:jobName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['jobName']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.startCronJob);

//---------------------------------------------------
//---------------------------------------------------

//admin/movies/relatedTitle/add/:id1/:id2/:relation
router.put('/movies/relatedTitle/add/:id1/:id2/:relation',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['id1', 'id2', 'relation']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.addRelatedTitle);

//admin/movies/relatedTitle/remove/:id1/:id2
router.delete('/movies/relatedTitle/remove/:id1/:id2',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['id1', 'id2']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin', 'dev']), adminControllers.removeRelatedTitle);

//---------------------------------------------------
//---------------------------------------------------

//admin/remove/:removeType/:id
router.delete('/remove/:removeType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['removeType', 'id']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserRolePermission(['admin']), adminControllers.removeDocsRows);

//---------------------------------------------------
//---------------------------------------------------

export default router;
