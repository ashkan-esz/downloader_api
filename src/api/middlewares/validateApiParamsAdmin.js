import {body, param, query, validationResult} from 'express-validator';
import {isUri} from "valid-url";
import {serverAnalysisFields} from "../../data/db/serverAnalysisDbMethods.js";
import {compareAppVersions, newAppDataFields} from "../../data/db/admin/adminConfigDbMethods.js";
import {relations} from "../../data/db/moviesDbMethods.js";

const types = ['movie', 'serial', 'anime_movie', 'anime_serial'];
const mutateType = ['enable', 'disable'];
const removeTypes = ['movie', 'staff', 'character', 'user'];

const validations = Object.freeze({

    skip: param('skip')
        .trim().isInt({min: 0}).withMessage('Invalid parameter skip :: Number 1 to Infinite')
        .toInt(),

    limit: param('limit')
        .trim().isInt({min: 0}).withMessage('Invalid parameter limit :: Number 1 to Infinite')
        .toInt(),

    skip_query: query('skip')
        .customSanitizer(value => {
            return (value && Number.isInteger(value)) ? Number(value) : 0;
        })
        .isInt({min: 0}).withMessage('Invalid parameter skip :: Number >= 0')
        .toInt(),

    limit_query: query('limit')
        .customSanitizer(value => {
            return (value && Number.isInteger(value)) ? Number(value) : 0;
        })
        .isInt({min: 0}).withMessage('Invalid parameter limit :: Number > 0')
        .toInt(),

    duration: param('duration')
        .trim().isInt({min: 1, max: 120}).withMessage('Invalid parameter duration :: Number 1 to 120')
        .toInt(),

    force: param('force')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter force :: (true|false)')
        .toBoolean(),

    startTime: param('startTime')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter startTime :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter startTime :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    endTime: param('endTime')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter endTime :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter endTime :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    checkWarnings: param('checkWarnings')
        .trim()
        .isBoolean().withMessage('Invalid parameter dontUpdateServerDate :: (true|false)')
        .toBoolean(),

    mutateType: param('mutateType')
        .trim().toLowerCase()
        .isIn(mutateType).withMessage(`Invalid parameter mutateType :: (${mutateType.join('|')})`),

    removeType: param('removeType')
        .trim()
        .isIn(removeTypes).withMessage(`Invalid parameter removeType :: (${removeTypes.join('|')})`),

    serverAnalysisFieldName: param('serverAnalysisFieldName')
        .trim()
        .isIn(serverAnalysisFields).withMessage(`Invalid parameter serverAnalysisFieldName :: (${serverAnalysisFields.join('|')})`),

    vid: param('vid')
        .isString().withMessage('Invalid parameter vid :: String')
        .trim(),

    id_mongo: param('id')
        .isMongoId().withMessage('Invalid parameter id :: Mongodb.Id'),

    id1: param('id1')
        .isString().withMessage('Invalid parameter id1 :: String')
        .trim(),

    id2: param('id2')
        .isString().withMessage('Invalid parameter id2 :: String')
        .trim(),

    relation: param('relation')
        .isString().withMessage('Invalid parameter relation :: String')
        .isIn(relations).withMessage(`Invalid parameter relation :: (${relations.join('|')})`)
        .trim(),

    //--------------------------------------
    //--------------------------------------

    sourceName_query: query('sourceName')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    botId_query: query('botId')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    crawlerMode: query('mode')
        .customSanitizer(value => {
            return (value && !isNaN(value))
                ? Math.floor(Number(value))
                : 0;
        }),

    handleDomainChange: query('handleDomainChange')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter handleDomainChange :: (true|false)')
        .toBoolean(),

    handleDomainChangeOnly: query('handleDomainChangeOnly')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter handleDomainChangeOnly :: (true|false)')
        .toBoolean(),

    crawlerConcurrency: query('crawlerConcurrency')
        .trim()
        .customSanitizer(value => {
            return value || 0
        })
        .isInt().withMessage('Invalid parameter crawlerConcurrency :: Number')
        .toInt(),

    dontUseRemoteBrowser: query('dontUseRemoteBrowser')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter dontUseRemoteBrowser :: (true|false)')
        .toBoolean(),

    axiosBlockThreshHold: query('axiosBlockThreshHold')
        .trim()
        .customSanitizer(value => {
            return value || 0
        })
        .isInt().withMessage('Invalid parameter axiosBlockThreshHold :: Number')
        .toInt(),

    remoteBrowserBlockThreshHold: query('remoteBrowserBlockThreshHold')
        .trim()
        .customSanitizer(value => {
            return value || 0
        })
        .isInt().withMessage('Invalid parameter remoteBrowserBlockThreshHold :: Number')
        .toInt(),

    castUpdateState: query('castUpdateState')
        .trim()
        .customSanitizer(value => {
            return value || 'none'
        })
        .isIn(['none', 'ignore', 'force']).withMessage('Invalid parameter castUpdateState :: (none|ignore|force)')
        .toLowerCase(),

    apiUpdateState: query('apiUpdateState')
        .trim()
        .customSanitizer(value => {
            return value || 'none'
        })
        .isIn(['none', 'ignore', 'force']).withMessage('Invalid parameter apiUpdateState :: (none|ignore|force)')
        .toLowerCase(),

    trailerUploadState: query('trailerUploadState')
        .trim()
        .customSanitizer(value => {
            return value || 'none'
        })
        .isIn(['none', 'ignore', 'force']).withMessage('Invalid parameter trailerUploadState :: (none|ignore|force)')
        .toLowerCase(),

    torrentState: query('torrentState')
        .trim()
        .customSanitizer(value => {
            return value || 'none'
        })
        .isIn(['none', 'ignore', 'only']).withMessage('Invalid parameter torrentState :: (none|ignore|only)')
        .toLowerCase(),

    all: query('all')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter all :: (true|false)')
        .toBoolean(),

    preCheck: query('preCheck')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter preCheck :: (true|false)')
        .toBoolean(),

    autoRemove: query('autoRemove')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter autoRemove :: (true|false)')
        .toBoolean(),

    appData: query('appData')
        .exists().withMessage('AppData cannot be empty')
        .custom((value, {req, loc, path}) => {
            if (!value || Array.isArray(value) || typeof value !== 'object') {
                throw new Error('Invalid parameter appData :: Object');
            }

            let keys = Object.keys(value);
            for (let i = 0; i < newAppDataFields.length; i++) {
                if (value[newAppDataFields[i]] === undefined) {
                    throw new Error(`Missed parameter appData.${newAppDataFields[i]}`);
                }
                if (value[newAppDataFields[i]] === "" && newAppDataFields[i] !== 'versionName' && newAppDataFields[i] !== 'description') {
                    throw new Error(`Parameter appData.${newAppDataFields[i]} cannot be empty`);
                }
            }

            for (let i = 0; i < keys.length; i++) {
                if (!newAppDataFields.includes(keys[i])) {
                    throw new Error(`Wrong parameter appData.${keys[i]}`);
                }
                if (keys[i] === 'version' && !value[keys[i]].match(/^\d\d?\.\d\d?\.\d\d?$/)) {
                    throw new Error(`Invalid parameter appData.version :: (\\d\\d?\\.\\d\\d?\\.\\d\\d?)`);
                } else if (keys[i] === 'minVersion' && !value[keys[i]].match(/^\d\d?\.\d\d?\.\d\d?$/)) {
                    throw new Error(`Invalid parameter appData.minVersion :: (\\d\\d?\\.\\d\\d?\\.\\d\\d?)`);
                } else {
                    if (typeof value[keys[i]] !== 'string') {
                        throw new Error(`Invalid parameter appData.${keys[i]} :: String`);
                    }
                }
            }
            if (compareAppVersions(value.minVersion, value.version) === 1) {
                throw new Error('Parameter appData.minVersion cannot be higher than appData.version');
            }

            return value;
        }),

    //--------------------------------------
    //--------------------------------------

    id: param('id')
        .exists().withMessage("Missed parameter id")
        .isString().withMessage("id must be String")
        .trim().escape(),

    sourceName_param: param('sourceName')
        .exists().withMessage("Missed parameter sourceName")
        .isString().withMessage("sourceName must be String")
        .trim().escape(),

    botId_param: param('botId')
        .exists().withMessage("Missed parameter botId")
        .isString().withMessage("botId must be String")
        .trim().escape(),

    jobName: param('jobName')
        .exists().withMessage("Missed parameter jobName")
        .isString().withMessage("jobName must be String")
        .trim().escape(),

    url: param('url')
        .exists().withMessage("Missed parameter url")
        .isString().withMessage("url must be String")
        .isURL().withMessage("url must be valid Url")
        .trim(),

    page: param('page')
        .trim().blacklist('0').isInt().withMessage('Invalid parameter page :: Number 1 to Infinite')
        .toInt(),

    days: param('days')
        .trim().blacklist('0').isInt().withMessage('Invalid parameter days :: Number 1 to Infinite')
        .toInt(),

    sourceName: body('sourceName')
        .exists().withMessage("Missed parameter sourceName")
        .isString().withMessage("sourceName must be String")
        .trim().toLowerCase().escape(),

    botName: body('botName')
        .exists().withMessage("Missed parameter botName")
        .isString().withMessage("botName must be String")
        .trim().toLowerCase().escape(),

    botToken: body('botToken')
        .exists().withMessage("Missed parameter botToken")
        .isString().withMessage("botToken must be String")
        .trim(),

    botType: body('botType')
        .exists().withMessage("Missed parameter botType")
        .isString().withMessage("botType must be String")
        .trim().escape(),

    movie_url: body('movie_url')
        .exists().withMessage("Missed parameter movie_url")
        .isString().withMessage("movie_url must be String")
        .isURL().withMessage("movie_url must be valid Url")
        .custom((value, {req, loc, path}) => {
            if (!value.toString().match(/[?\/]page[\/=]$/gi)) {
                throw new Error("movie_url must match regex :: [?/]page[/=]$");
            } else {
                return value;
            }
        })
        .trim(),

    serial_url: body('serial_url')
        .exists().withMessage("Missed parameter serial_url")
        .isString().withMessage("serial_url must be String")
        .custom((value, {req, loc, path}) => {
            if (value === "") {
                return "empty";// optional
            }
            if (!isUri(value.toString()) || !value.toString().match(/[?/]page[/=]$/gi)) {
                throw new Error("serial_url must be a valid url match regex :: [?/]page[/=]$");
            } else {
                return value;
            }
        })
        .trim()
        .replace('empty', ''),

    url_body: body('url')
        .exists().withMessage("Missed parameter url")
        .isString().withMessage("url must be String")
        .custom((value, {req, loc, path}) => {
            if (!isUri(value.toString()) || value.toString().match(/[?/]page[/=]$/gi)) {
                throw new Error("url must be a valid url without page section");
            } else {
                return value;
            }
        })
        .trim(),

    description: body('description')
        .exists().withMessage("Missed parameter description")
        .isString().withMessage("description must be String")
        .trim().escape(),

    title: body('title')
        .exists().withMessage("Missed parameter title")
        .isString().withMessage("title must be String")
        .trim().toLowerCase().escape(),

    title_query: query('title')
        .exists().withMessage("Missed parameter title")
        .isString().withMessage("title must be String")
        .trim().toLowerCase().escape(),

    type: body('type')
        .exists().withMessage("Missed parameter type")
        .isString().withMessage("type must be String")
        .trim().toLowerCase().escape()
        .isIn(types).withMessage(`Invalid parameter type :: (${types.join('|')})`),

    type_query: query('type')
        .exists().withMessage("Missed parameter type")
        .isString().withMessage("type must be String")
        .trim().toLowerCase().escape()
        .isIn(types).withMessage(`Invalid parameter type :: (${types.join('|')})`),

    crawlCycle: body('crawlCycle')
        .exists().withMessage("Missed parameter crawlCycle")
        .isInt({min: 0}).withMessage("crawlCycle must be Number starting from 0")
        .toInt(),

    disabled: body('disabled')
        .exists().withMessage("Missed parameter disabled")
        .isBoolean({strict: true}).withMessage("disabled must be Boolean")
        .toBoolean(),

    isOfficial: body('isOfficial')
        .exists().withMessage("Missed parameter isOfficial")
        .isBoolean({strict: true}).withMessage("isOfficial must be Boolean")
        .toBoolean(),

    permissionToLogin: body('permissionToLogin')
        .exists().withMessage("Missed parameter permissionToLogin")
        .isBoolean({strict: true}).withMessage("permissionToLogin must be Boolean")
        .toBoolean(),

    permissionToCrawl: body('permissionToCrawl')
        .exists().withMessage("Missed parameter permissionToCrawl")
        .isBoolean({strict: true}).withMessage("permissionToCrawl must be Boolean")
        .toBoolean(),

    permissionToTorrentLeech: body('permissionToTorrentLeech')
        .exists().withMessage("Missed parameter permissionToTorrentLeech")
        .isBoolean({strict: true}).withMessage("permissionToTorrentLeech must be Boolean")
        .toBoolean(),

    permissionToTorrentSearch: body('permissionToTorrentSearch')
        .exists().withMessage("Missed parameter permissionToTorrentSearch")
        .isBoolean({strict: true}).withMessage("permissionToTorrentSearch must be Boolean")
        .toBoolean(),

    reCrawl: body('reCrawl')
        .exists().withMessage("Missed parameter reCrawl")
        .isBoolean({strict: true}).withMessage("reCrawl must be Boolean")
        .toBoolean(),

    cookies: body('cookies')
        .exists().withMessage("Missed parameter cookies")
        .isArray({max: 10}).withMessage("cookies Must be an array")
        .custom((value, {req, loc, path}) => {
            for (let i = 0; i < value.length; i++) {
                if (!value[i] || Array.isArray(value[i]) || typeof value[i] !== 'object') {
                    throw new Error("cookies Must be an array of object");
                }
                let allowedKeys = ['name', 'value', 'expire'];
                for (let j = 0; j < allowedKeys.length; j++) {
                    if (value[i][allowedKeys[j]] === undefined) {
                        throw new Error(`Missed field cookies[${i}].${allowedKeys[j]}`);
                    }
                }
                let cookieKeys = Object.keys(value[i]);
                for (let j = 0; j < cookieKeys.length; j++) {
                    if (!allowedKeys.includes(cookieKeys[j])) {
                        throw new Error(`Wrong field cookies[${i}].${cookieKeys[j]}`);
                    }
                }
                if (typeof value[i].name !== "string") {
                    throw new Error(`cookies[${i}].name must be String`);
                }
                if (typeof value[i].value !== "string") {
                    throw new Error(`cookies[${i}].value must be String`);
                }
                if (isNaN(value[i].expire)) {
                    throw new Error(`cookies[${i}].expire must be Number (Int)`);
                }
            }
            return value;
        }),

    corsAllowedOrigins: body('corsAllowedOrigins')
        .isArray({min: 1, max: 10}).withMessage("corsAllowedOrigins Must be an array with size of [1-10]")
        .custom((value, {req, loc, path}) => {
            for (let i = 0; i < value.length; i++) {
                if ((!value[i] && value[i] !== '') || typeof value[i] !== 'string') {
                    throw new Error("corsAllowedOrigins Must be an array of String");
                }
            }
            return value;
        }),

    disableTestUserRequests: body('disableTestUserRequests')
        .isBoolean().withMessage("Invalid parameter disableTestUserRequests :: Boolean")
        .toBoolean(),

    disableCrawlerForDuration: body('disableCrawlerForDuration')
        .isInt().withMessage("Invalid parameter disableCrawlerForDuration :: Int")
        .toInt(),

    disableCrawler: body('disableCrawler')
        .isBoolean().withMessage("Invalid parameter disableCrawler :: Boolean")
        .toBoolean(),

    developmentFaze: body('developmentFaze')
        .isBoolean().withMessage("Invalid parameter developmentFaze :: Boolean")
        .toBoolean(),

    mediaFileSizeLimit: body('mediaFileSizeLimit')
        .isInt({min: 1, max: 100}).withMessage("Invalid parameter mediaFileSizeLimit :: Integer{min: 1, max:100}")
        .toInt(),

    profileFileSizeLimit: body('profileFileSizeLimit')
        .isInt({min: 1, max: 100}).withMessage("Invalid parameter profileFileSizeLimit :: Integer{min: 1, max:100}")
        .toInt(),

    profileImageCountLimit: body('profileImageCountLimit')
        .isInt({min: 1, max: 100}).withMessage("Invalid parameter profileImageCountLimit :: Integer{min: 1, max:100}")
        .toInt(),

    mediaFileExtensionLimit: body('mediaFileExtensionLimit')
        .isString().withMessage("Invalid parameter mediaFileExtensionLimit :: String"),

    profileImageExtensionLimit: body('profileImageExtensionLimit')
        .isString().withMessage("Invalid parameter profileImageExtensionLimit :: String"),

    torrentDownloadMaxFileSize: body('torrentDownloadMaxFileSize')
        .isInt({
            min: 1,
            max: 10000
        }).withMessage("Invalid parameter torrentDownloadMaxFileSize :: Integer{min: 1, max: 10000}"),

    torrentDownloadMaxSpaceSize: body('torrentDownloadMaxSpaceSize')
        .isInt({
            min: 1000,
        }).withMessage("Invalid parameter torrentDownloadMaxSpaceSize :: Integer{min: 1000, max: infinite}"),

    torrentDownloadSpaceThresholdSize: body('torrentDownloadSpaceThresholdSize')
        .isInt({
            min: 500,
            max: 10000
        }).withMessage("Invalid parameter torrentDownloadSpaceThresholdSize :: Integer{min: 500, max: 10000}"),

    torrentFilesExpireHour: body('torrentFilesExpireHour')
        .isInt({
            min: 1,
            max: 10000
        }).withMessage("Invalid parameter torrentFilesExpireHour :: Integer{min: 1, max: 10000}"),

    torrentFilesServingConcurrencyLimit: body('torrentFilesServingConcurrencyLimit')
        .isInt({
            min: 1,
            max: 10000
        }).withMessage("Invalid parameter torrentFilesServingConcurrencyLimit :: Integer{min: 1, max: 10000}"),

    torrentDownloadTimeoutMin: body('torrentDownloadTimeoutMin')
        .isInt({
            min: 5,
            max: 90
        }).withMessage("Invalid parameter torrentDownloadTimeoutMin :: Integer{min: 5, max: 90}"),

    torrentDownloadConcurrencyLimit: body('torrentDownloadConcurrencyLimit')
        .isInt({
            min: 1,
            max: 20
        }).withMessage("Invalid parameter torrentDownloadConcurrencyLimit :: Integer{min: 1, max: 20}"),

    torrentFileExpireDelayFactor: body('torrentFileExpireDelayFactor')
        .isFloat({
            min: 0.1,
            max: 5.0,
        }).withMessage("Invalid parameter torrentFileExpireDelayFactor :: Float{min: 0.1, max: 5.0}"),

    torrentFileExpireExtendHour: body('torrentFileExpireExtendHour')
        .isInt({
            min: 1,
            max: 24
        }).withMessage("Invalid parameter torrentFileExpireExtendHour :: Integer{min: 1, max: 24}"),

    torrentUserEnqueueLimit: body('torrentUserEnqueueLimit')
        .isInt({
            min: 1,
            max: 20
        }).withMessage("Invalid parameter torrentUserEnqueueLimit :: Integer{min: 1, max: 20}"),

    disableBotsNotifications: body('disableBotsNotifications')
        .isBoolean().withMessage("Invalid parameter disableBotsNotifications :: Boolean")
        .toBoolean(),

    torrentDownloadDisabled: body('torrentDownloadDisabled')
        .isBoolean().withMessage("Invalid parameter torrentDownloadDisabled :: Boolean")
        .toBoolean(),

    torrentFilesServingDisabled: body('torrentFilesServingDisabled')
        .isBoolean().withMessage("Invalid parameter torrentFilesServingDisabled :: Boolean")
        .toBoolean(),

    torrentSendResultToBot: body('torrentSendResultToBot')
        .isBoolean().withMessage("Invalid parameter torrentSendResultToBot :: Boolean")
        .toBoolean(),

    defaultTorrentDownloaderConfig: body('defaultTorrentDownloaderConfig')
        .exists().withMessage("Missed parameter defaultTorrentDownloaderConfig :: Object")
        .isObject().withMessage("Invalid parameter defaultTorrentDownloaderConfig :: Object")
        .custom((value) => {
            if (!["", "all", "serial", "movie"].includes(value.disabled)) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.disabled :: (${["", "all", "serial", "movie"].join('|')})`);
            }
            if (!["default", "force", "ignore"].includes(value.status)) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.status :: (${["default", "force", "ignore"].join('|')})`);
            }
            if (isNaN(value.minImdbScore) || value.minImdbScore < 0) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.minImdbScore :: Float > 0`);
            }
            if (isNaN(value.minMalScore) || value.minMalScore < 0) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.minMalScore :: Float > 0`);
            }
            if (!value.newEpisodeQualities || value.newEpisodeQualities.split(',').some(item => !item.match(/\s?\d\d\d\d?p/))) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.newEpisodeQualities :: Array(\d\d\d\dP).join(\,)`);
            }
            if (!value.movieQualities || value.movieQualities.split(',').some(item => !item.match(/\s?\d\d\d\d?p/))) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.movieQualities :: Array(\d\d\d\dP).join(\,)`);
            }
            if (!Number.isInteger(value.torrentFilesExpireHour) || value.torrentFilesExpireHour < 1) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.torrentFilesExpireHour :: Integer > 0`);
            }
            if (![true, false].includes(value.bypassIfHasDownloadLink)) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.bypassIfHasDownloadLink :: true|false`);
            }
            if (!Number.isInteger(value.movieLinkLimit) || value.movieLinkLimit < 0) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.movieLinkLimit :: Integer > 0`);
            }
            if (!Number.isInteger(value.newEpisodeLinkLimit) || value.newEpisodeLinkLimit < 0) {
                throw new Error(`Invalid parameter defaultTorrentDownloaderConfig.newEpisodeLinkLimit :: Integer > 0`);
            }

            return value;
        }),

    torrentDownloaderConfig: body('torrentDownloaderConfig')
        .exists().withMessage("Missed parameter torrentDownloaderConfig :: Object")
        .isObject().withMessage("Invalid parameter torrentDownloaderConfig :: Object")
        .custom((value) => {
            if (Object.keys(value).length === 0) {
                //remove config
                return {};
            }
            if (![true, false].includes(value.disabled)) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.disabled :: true|false`);
            }
            if (!value.newEpisodeQualities || value.newEpisodeQualities.split(',').some(item => !item.match(/\s?\d\d\d\d?p/))) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.newEpisodeQualities :: Array(\d\d\d\dP).join(\,)`);
            }
            if (!value.movieQualities || value.movieQualities.split(',').some(item => !item.match(/\s?\d\d\d\d?p/))) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.movieQualities :: Array(\d\d\d\dP).join(\,)`);
            }
            if (!Number.isInteger(value.torrentFilesExpireHour) || value.torrentFilesExpireHour < 1) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.torrentFilesExpireHour :: Integer > 0`);
            }
            if (![true, false].includes(value.bypassIfHasDownloadLink)) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.bypassIfHasDownloadLink :: true|false`);
            }
            if (!Number.isInteger(value.movieLinkLimit) || value.movieLinkLimit < 0) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.movieLinkLimit :: Integer > 0`);
            }
            if (!Number.isInteger(value.newEpisodeLinkLimit) || value.newEpisodeLinkLimit < 0) {
                throw new Error(`Invalid parameter torrentDownloaderConfig.newEpisodeLinkLimit :: Integer > 0`);
            }

            return value;
        }),

    ids: body('ids')
        .exists().withMessage("Missed parameter ids")
        .isArray({min: 1}).withMessage("ids Must be an not empty array")
        .custom((value, {req, loc, path}) => {
            for (let i = 0; i < value.length; i++) {
                if (!value[i] || typeof value[i] !== 'string') {
                    throw new Error("ids Must be an array of String");
                }
            }
            return value;
        }),

    message: body('message')
        .exists().withMessage("Missed parameter message")
        .isString().withMessage("message must be String")
        .trim().escape(),

    date: body('date')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter date :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter date :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    lastUseDate: body('lastUseDate')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter lastUseDate :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter lastUseDate :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    lastApiCall_news: body('lastApiCall_news')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter lastApiCall_news :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter lastApiCall_news :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    lastApiCall_updates: body('lastApiCall_updates')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter lastApiCall_updates :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter lastApiCall_updates :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    permissions_query: query('permissions')
        .trim()
        .customSanitizer(value => {
            return (value || '').split(',')
        }),

    roleName_query: query('roleName')
        .customSanitizer(value => {
            return value || ''
        })
        .isString().withMessage("roleName must be String")
        .trim().toLowerCase().escape(),

    name: param('name')
        .exists().withMessage("Missed parameter name")
        .isString().withMessage("name must be String")
        .trim().escape(),

    name_body: body('name')
        .exists().withMessage("Missed parameter name")
        .isString().withMessage("name must be String")
        .trim().toLowerCase().escape(),

    torrentLeachLimitGb_body: body('torrentLeachLimitGb')
        .exists().withMessage("Missed parameter torrentLeachLimitGb")
        .isInt({min: 0}).withMessage("torrentLeachLimitGb must be Number starting from 0r")
        .toInt(),

    torrentSearchLimit_body: body('torrentSearchLimit')
        .exists().withMessage("Missed parameter torrentSearchLimit")
        .isInt({min: 0}).withMessage("torrentSearchLimit must be Number starting from 0")
        .toInt(),

    botsNotification_body: body('botsNotification')
        .exists().withMessage("Missed parameter botsNotification")
        .isBoolean({strict: true}).withMessage("botsNotification must be Boolean")
        .toBoolean(),

    permissionIds_body: body('permissionIds')
        .exists().withMessage("Missed parameter permissionIds")
        .isArray().withMessage("permissionIds must be Array(Int)")
        .custom((value, {req, loc, path}) => {
            if (!Array.isArray(value) || !value.every(id => Number.isInteger(id) && id >= 0)) {
                throw new Error("permissionIds must be Array(Int)");
            }
            return value;
        }),

    roleIds_body: body('roleIds')
        .exists().withMessage("Missed parameter roleIds")
        .isArray().withMessage("roleIds must be Array(Int)")
        .custom((value, {req, loc, path}) => {
            if (!Array.isArray(value) || !value.every(id => Number.isInteger(id) && id >= 0)) {
                throw new Error("roleIds must be Array(Int)");
            }
            return value;
        }),

    userId_body: body('userId')
        .customSanitizer(value => {
            return (value && Number.isInteger(value)) ? Number(value) : 0;
        })
        .isInt({min: 0}).withMessage("userId must be Number >= 0")
        .toInt(),
});

export function checkApiParamsAndSendError(apiParams) {
    return async (req, res, next) => {
        await Promise.all(apiParams.map(p => validations[p]?.run(req)));

        const errorsAfterValidation = validationResult(req);
        if (!errorsAfterValidation.isEmpty()) {
            return res.status(400).json({
                data: null,
                code: 400,
                errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(', '),
                isGuest: false,
                isCacheData: false,
            });
        }
        return next();
    };
}

export function checkApiParams(apiParams) {
    return apiParams.map(param => validations[param]).filter(item => item !== undefined);

    // let validationArray = [];
    // for (let i = 0; i < apiParams.length; i++) {
    //     let val = validations[apiParams[i]];
    //     if (val) {
    //         validationArray.push(val);
    //     }
    // }
    // return validationArray;
}

export function apiParams_sendError(req, res, next) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(', '),
            isGuest: false,
            isCacheData: false,
        });
    }
    return next();
}
