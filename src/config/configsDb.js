import {getServerConfigs, updateServerConfigs_internalUsage} from "../data/db/admin/adminConfigDbMethods.js";
import {updateCorsAllowedOriginsMiddleWareData} from "../api/middlewares/cors.js";
import {updateDisableTestUserRequestsMiddleWareData} from "../api/middlewares/isAuth.js";
import {updateDevelopmentFazeMiddleWareData} from "../api/middlewares/developmentFaze.js";


var configsDB = await getServerConfigs();
setInterval(async () => {
    configsDB = await getServerConfigs();
}, 30 * 60 * 1000); //30 min

export function getServerConfigsDb() {
    return configsDB;
}

//----------------------------------------------------
//----------------------------------------------------

export function checkCrawlerIsDisabledByConfigsDb() {
    return (configsDB?.crawlerDisabled || configsDB?.disableCrawler) ?? false;
}

export async function updateServerConfigsDb() {
    configsDB = await getServerConfigs();
    updateCorsAllowedOriginsMiddleWareData(configsDB.corsAllowedOrigins);
    updateDisableTestUserRequestsMiddleWareData(configsDB.disableTestUserRequests);
    updateDevelopmentFazeMiddleWareData(configsDB.developmentFaze);
    await handleUpdateStuff(false);
}

//----------------------------------------------------
//----------------------------------------------------

setInterval(async () => {
    await handleUpdateStuff();
}, 60 * 1000); //1 min

async function handleUpdateStuff(saveChangesToDB = true) {
    //enable crawler
    if (configsDB?.crawlerDisabled) {
        let disableCrawlerStartPlusDuration = new Date(configsDB.disableCrawlerStart);
        disableCrawlerStartPlusDuration.setHours(disableCrawlerStartPlusDuration.getHours() + configsDB.disableCrawlerForDuration);
        let now = new Date();
        if (now.getTime() >= disableCrawlerStartPlusDuration.getTime()) {
            configsDB.disableCrawlerForDuration = 0;
            configsDB.disableCrawlerStart = 0;
            configsDB.crawlerDisabled = false;
            if (saveChangesToDB) {
                await updateServerConfigs_internalUsage(configsDB);
            }
        }
    }
}

//----------------------------------------------------
//----------------------------------------------------

export const defaultTorrentDownloaderConfig = Object.freeze({
    disabled: "", // all | serial | movie
    status: "default", // default | force | ignore
    minImdbScore: 7.1,
    minMalScore: 7.1,
    newEpisodeQualities: "1080p",
    movieQualities: "1080p",
    torrentFilesExpireHour: 7 * 24,
    bypassIfHasDownloadLink: true,
    newEpisodeLinkLimit: 2,
    movieLinkLimit: 2,
});

export const defaultConfigsDb = Object.freeze({
    title: 'server configs',
    corsAllowedOrigins: Object.freeze([]),
    disableTestUserRequests: false,
    disableCrawlerForDuration: 0,
    disableCrawlerStart: 0,
    crawlerDisabled: false,
    disableCrawler: false,
    developmentFaze: false,
    developmentFazeStart: 0,
    mediaFileSizeLimit: 100,
    profileFileSizeLimit: 2,
    profileImageCountLimit: 5,
    mediaFileExtensionLimit: 'jpg, jpeg, png, webp, mp4, avi, flv, m4v, mkv, mov, mpeg, wmv',
    profileImageExtensionLimit: 'jpg, jpeg, png, webp',
    torrentDownloadMaxFileSize: 800,
    torrentDownloadMaxSpaceSize: 10000,
    torrentDownloadSpaceThresholdSize: 1000,
    torrentFilesExpireHour: 36,
    torrentFilesServingConcurrencyLimit: 20,
    torrentDownloadTimeoutMin: 30,
    torrentDownloadConcurrencyLimit: 3,
    torrentFileExpireDelayFactor: 1.5,
    torrentFileExpireExtendHour: 4,
    torrentUserEnqueueLimit: 2,
    disableBotsNotifications: false,
    torrentDownloadDisabled: false,
    torrentFilesServingDisabled: false,
    torrentSendResultToBot: false,
    defaultTorrentDownloaderConfig: defaultTorrentDownloaderConfig,
});

export const safeFieldsToEdit_array = Object.freeze([
    'corsAllowedOrigins', 'disableTestUserRequests', 'disableCrawlerForDuration',
    'disableCrawler', 'developmentFaze',
    'mediaFileSizeLimit', 'profileFileSizeLimit', 'profileImageCountLimit',
    'mediaFileExtensionLimit', 'profileImageExtensionLimit', 'torrentDownloadMaxFileSize',
    'defaultTorrentDownloaderConfig', 'torrentDownloadSpaceThresholdSize', 'torrentDownloadMaxSpaceSize',
    'torrentDownloadTimeoutMin', 'torrentFilesServingConcurrencyLimit', 'torrentFilesExpireHour',
    'torrentUserEnqueueLimit', 'torrentFileExpireExtendHour', 'torrentFileExpireDelayFactor', 'torrentDownloadConcurrencyLimit',
    'disableBotsNotifications', 'torrentDownloadDisabled', 'torrentFilesServingDisabled', 'torrentSendResultToBot',
]);
export const safeFieldsToRead_array = Object.freeze(Object.keys(defaultConfigsDb).filter(item => item !== 'title'));
export const safeFieldsToRead = Object.freeze(safeFieldsToRead_array.reduce((obj, item) => {
    obj[item] = 1
    return obj;
}, {}));