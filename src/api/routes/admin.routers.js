import {Router} from "express";
import mongoSanitize from "express-mongo-sanitize";
import middlewares from "../middlewares/index.js";
import {usersControllers, adminControllers} from '../../controllers/index.js';
import {PermissionsList} from "../../data/db/admin/roleAndPermissionsDbMethods.js";

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
        ['sourceName_query', 'crawlerMode', 'handleDomainChange', 'handleDomainChangeOnly',
            'crawlerConcurrency', 'dontUseRemoteBrowser', 'axiosBlockThreshHold', 'remoteBrowserBlockThreshHold',
            'castUpdateState', 'apiUpdateState', 'trailerUploadState', 'torrentState']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_start_crawler]),
    adminControllers.startCrawler);

//admin/crawler/torrent/search
router.put('/crawler/torrent/search',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName_query', 'title_query', 'type_query',
            'crawlerConcurrency', 'dontUseRemoteBrowser',
            'castUpdateState', 'apiUpdateState', 'trailerUploadState']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_start_torrent_search]),
    adminControllers.startTorrentSearch);

//admin/crawler/pause/:duration
router.put('/crawler/pause/:duration',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['duration']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_control_crawler]),
    adminControllers.manualPauseCrawler);

//admin/crawler/resume/:force
router.put('/crawler/resume/:force',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['force']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_control_crawler]),
    adminControllers.resumeCrawler);

//admin/crawler/stop
router.put('/crawler/stop',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_control_crawler]),
    adminControllers.manualStopCrawler);

//admin/crawler/status
router.get('/crawler/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_crawler_status]),
    adminControllers.getCrawlerStatus);

//admin/crawler/crawlUrl
router.put('/crawler/crawlUrl',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['sourceName', 'url_body', 'title', 'type']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_start_crawler]),
    adminControllers.crawlUrl);

//admin/crawler/duplicateTitles
router.get('/crawler/duplicateTitles',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['preCheck', 'autoRemove']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_duplicate_titles]),
    adminControllers.duplicateTitles);

//---------------------------------------------------
//---------------------------------------------------

//admin/analysis/:serverAnalysisFieldName/:startTime/:endTime/:skip/:limit
router.get('/analysis/:serverAnalysisFieldName/:startTime/:endTime/:skip/:limit',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'startTime', 'endTime', 'skip', 'limit']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_crawler_logs]),
    adminControllers.getServerAnalysisInTimes);

//admin/analysis/currentMonth/:serverAnalysisFieldName/:page
router.get('/analysis/currentMonth/:serverAnalysisFieldName/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'page']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_crawler_logs]),
    adminControllers.getServerAnalysisCurrentMonth);

//admin/analysis/resolve/:serverAnalysisFieldName/:id
router.put('/analysis/resolve/:serverAnalysisFieldName/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'id']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_crawler_logs]),
    adminControllers.resolveServerAnalysis);

//admin/analysis/resolve/:serverAnalysisFieldName
router.put('/analysis/resolve/:serverAnalysisFieldName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'ids']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_crawler_logs]),
    adminControllers.resolveServerAnalysisByIds);

//admin/analysis/resolve/:serverAnalysisFieldName/lastDays/:days
router.put('/analysis/resolve/:serverAnalysisFieldName/lastDays/:days',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['serverAnalysisFieldName', 'days']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_crawler_logs]),
    adminControllers.resolveServerAnalysisLastDays);

//---------------------------------------------------
//---------------------------------------------------

//admin/crawler/sources
router.get('/crawler/sources',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_crawler_sources]),
    adminControllers.getCrawlerSources);

//admin/crawler/editSource/:sourceName
router.put('/crawler/editSource/:sourceName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName_param', 'movie_url', 'serial_url', 'crawlCycle', 'disabled', 'cookies', 'reCrawl', 'description']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_crawler_sources]),
    adminControllers.editSource);

//admin/crawler/removeSource/:sourceName
router.delete('/crawler/removeSource/:sourceName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['sourceName_param']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_crawler_sources]),
    adminControllers.removeSource);

//admin/crawler/addSource
router.put('/crawler/addSource',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['sourceName', 'movie_url', 'serial_url', 'crawlCycle', 'disabled', 'cookies']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_crawler_sources]),
    adminControllers.addSource);

//---------------------------------------------------
//---------------------------------------------------

//admin/configs/update
router.put('/configs/update',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['corsAllowedOrigins', 'disableTestUserRequests', 'disableCrawlerForDuration',
            'disableCrawler', 'developmentFaze',
            'mediaFileSizeLimit', 'profileFileSizeLimit', 'profileImageCountLimit',
            'mediaFileExtensionLimit', 'profileImageExtensionLimit', 'torrentDownloadMaxFileSize',
            'defaultTorrentDownloaderConfig', 'torrentDownloadSpaceThresholdSize', 'torrentDownloadMaxSpaceSize',
            'torrentDownloadTimeoutMin', 'torrentFilesServingConcurrencyLimit', 'torrentFilesExpireHour',
            'torrentUserEnqueueLimit', 'torrentFileExpireExtendHour', 'torrentFileExpireDelayFactor', 'torrentDownloadConcurrencyLimit',
            'disableBotsNotifications', 'torrentDownloadDisabled', 'torrentFilesServingDisabled', 'torrentSendResultToBot',
        ]),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_db_configs]),
    mongoSanitize(),
    adminControllers.updateConfigsDb);

//admin/configs
router.get('/configs',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_db_configs]),
    adminControllers.getConfigsDb);

//---------------------------------------------------
//---------------------------------------------------

//admin/server/status
router.get('/server/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_server_status]),
    adminControllers.getServerStatus);

//admin/remoteBrowsers/status
router.get('/remoteBrowsers/status',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_server_status]),
    adminControllers.getRemoteBrowsersStatus);

//admin/remoteBrowsers/:mutateType/:id?all=Boolean
router.put('/remoteBrowsers/:mutateType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['mutateType', 'id', 'all']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_check_remote_browser]),
    adminControllers.mutateRemoteBrowserStatus);

//admin/remoteBrowsers/checkSource/:sourceName/:url
router.get('/remoteBrowsers/checkSource/:sourceName/:url',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['sourceName_param', 'url']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_check_remote_browser]),
    adminControllers.checkSourceOnRemoteBrowsers);

//---------------------------------------------------
//---------------------------------------------------

//admin/setMessage
router.put('/setMessage',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['message', 'date']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_db_configs]),
    adminControllers.setMessage);

//---------------------------------------------------
//---------------------------------------------------

//admin/addNewAppVersion
router.post('/addNewAppVersion',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['appData']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_manage_app_versions]),
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
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_manage_app_versions]),
    adminControllers.removeAppVersion);

//admin/appVersions
router.get('/appVersions',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_manage_app_versions]),
    adminControllers.getAppVersion);

//---------------------------------------------------
//---------------------------------------------------

//admin/3rdpartyApis/checkWorking
router.get('/3rdpartyApis/checkWorking',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_check_3rd_party_apis]),
    adminControllers.check3rdPartApisWorking);

//---------------------------------------------------
//---------------------------------------------------

//admin/bots
router.get('/bots',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['botId_query']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_bots]),
    adminControllers.getBots);

//admin/bots/editBot/:botId
router.put('/bots/editBot/:botId',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams([
        'botId_param', 'botName', 'botToken', 'botType', 'lastUseDate', 'lastApiCall_news', 'lastApiCall_updates', 'disabled', 'description',
        'isOfficial', 'permissionToLogin', 'permissionToCrawl', 'permissionToTorrentLeech', 'permissionToTorrentSearch',
    ]),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_bots]),
    adminControllers.editBot);

//admin/bots/addBot
router.put('/bots/addBot',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(
        ['botName', 'botToken', 'botType', 'disabled', 'description', 'isOfficial',
            'permissionToLogin', 'permissionToCrawl', 'permissionToTorrentLeech', 'permissionToTorrentSearch']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    mongoSanitize(),
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_bots]),
    adminControllers.addBot);

//admin/bots/deleteBot/:botId
router.delete('/bots/deleteBot/:botId',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['botId_param']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_bots]),
    adminControllers.deleteBot);

//admin/bots/sendMessage/:botId
router.post('/bots/sendMessage/:botId',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['botId_param', 'message', 'userId_body']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_send_message_to_bot]),
    adminControllers.sendMessageToAllBotUsers);

//---------------------------------------------------
//---------------------------------------------------

//admin/cronjobs
router.get('/cronjobs',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_cronjobs]),
    adminControllers.getCronJobs);

//admin/cronjobs/:jobName
router.put('/cronjobs/start/:jobName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['jobName']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_run_cronjobs]),
    adminControllers.startCronJob);

//---------------------------------------------------
//---------------------------------------------------

//admin/movies/relatedTitle/add/:id1/:id2/:relation
router.put('/movies/relatedTitle/add/:id1/:id2/:relation',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['id1', 'id2', 'relation']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_manage_related_titles]),
    adminControllers.addRelatedTitle);

//admin/movies/relatedTitle/remove/:id1/:id2
router.delete('/movies/relatedTitle/remove/:id1/:id2',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['id1', 'id2']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_manage_related_titles]),
    adminControllers.removeRelatedTitle);

//---------------------------------------------------
//---------------------------------------------------

//admin/remove/:removeType/:id
router.delete('/remove/:removeType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['removeType', 'id']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_remove_doc]),
    adminControllers.removeDocsRows);

//---------------------------------------------------
//---------------------------------------------------

//admin/role/all_permissions
router.get('/role/all_permissions',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_permissions]),
    adminControllers.getAllPermissionsList);

//admin/role/all_roles
router.get('/role/all_roles',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['permissions_query']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_permissions]),
    adminControllers.getAllRoles);

//admin/role/users
router.get('/role/users',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['roleName_query', 'skip_query', 'limit_query']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_users]),
    adminControllers.getRoleUsers);

//admin/role/new_role
router.post('/role/new_role',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['name_body', 'description', 'torrentLeachLimitGb_body', 'torrentSearchLimit_body', 'botsNotification_body', 'permissionIds_body']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_create_role]),
    adminControllers.createNewRole);

//admin/role/:name
router.get('/role/:name',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['name']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_get_permissions]),
    adminControllers.getRoleDataByName);

//admin/role/edit_role/:name
router.post('/role/edit_role/:name',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['name', 'name_body', 'description', 'torrentLeachLimitGb_body', 'torrentSearchLimit_body', 'botsNotification_body', 'permissionIds_body']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_role]),
    adminControllers.editRoleData);

//admin/remove_role/:name
router.delete('/remove_role/:name',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['name']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_delete_role]),
    adminControllers.removeRoleByName);

//admin/edit_user_roles
router.put('/edit_user_roles',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParamsAdmin.checkApiParams(['userId_body', 'roleIds_body']),
    middlewares.validateApiParamsAdmin.apiParams_sendError,
    middlewares.auth.checkUserHavePermissions([PermissionsList.admin_edit_user_roles]),
    adminControllers.editUserRoles);

//---------------------------------------------------
//---------------------------------------------------

export default router;
