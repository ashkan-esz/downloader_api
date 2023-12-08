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
});

export const safeFieldsToEdit_array = Object.freeze(['corsAllowedOrigins', 'disableTestUserRequests', 'disableCrawlerForDuration', 'disableCrawler', 'developmentFaze']);
export const safeFieldsToRead_array = Object.freeze(Object.keys(defaultConfigsDb).filter(item => item !== 'title'));
export const safeFieldsToRead = Object.freeze(safeFieldsToRead_array.reduce((obj, item) => {
    obj[item] = 1
    return obj;
}, {}));