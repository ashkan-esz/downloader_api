import {getServerConfigs} from "../data/db/admin/adminConfigDbMethods.js";
import {updateCorsAllowedOriginsMiddleWareData} from "../api/middlewares/cors.js";
import {updateDisableTestUserRequestsMiddleWareData} from "../api/middlewares/isAuth.js";


var configsDB = Object.freeze(await getServerConfigs());
setInterval(async () => {
    configsDB = Object.freeze(await getServerConfigs());
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
    configsDB = Object.freeze(await getServerConfigs());
    updateCorsAllowedOriginsMiddleWareData(configsDB.corsAllowedOrigins);
    updateDisableTestUserRequestsMiddleWareData(configsDB.disableTestUserRequests);
    handleUpdateStuff();
}

//----------------------------------------------------
//----------------------------------------------------

setInterval(async () => {
    handleUpdateStuff();
}, 60 * 1000); //1 min

function handleUpdateStuff() {
    //enable crawler
    if (configsDB.crawlerDisabled) {
        let disableCrawlerStartPlusDuration = new Date(configsDB.disableCrawlerStart);
        disableCrawlerStartPlusDuration.setHours(disableCrawlerStartPlusDuration.getHours() + configsDB.disableCrawlerForDuration);
        let now = new Date();
        if (now.getTime() >= disableCrawlerStartPlusDuration.getTime()) {
            configsDB.disableCrawlerForDuration = 0;
            configsDB.disableCrawlerStart = 0;
            configsDB.crawlerDisabled = false;
        }
    }
}

//----------------------------------------------------
//----------------------------------------------------

export const defaultConfigsDb = Object.freeze({
    title: 'server configs',
    corsAllowedOrigins: Object.freeze([
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://127.0.0.1:5000',
        'http://localhost:5000',
    ]),
    disableTestUserRequests: false,
    disableCrawlerForDuration: 0,
    disableCrawlerStart: 0,
    crawlerDisabled: false,
    disableCrawler: false,
});

export const safeFieldsToEdit_array = ['corsAllowedOrigins', 'disableTestUserRequests', 'disableCrawlerForDuration', 'disableCrawler'];
export const safeFieldsToRead_array = ['corsAllowedOrigins', 'disableTestUserRequests', 'disableCrawlerForDuration', 'disableCrawlerStart', 'crawlerDisabled', 'disableCrawler'];
export const safeFieldsToRead = Object.freeze({
    corsAllowedOrigins: 1,
    disableTestUserRequests: 1,
    disableCrawlerForDuration: 1,
    disableCrawlerStart: 1,
    crawlerDisabled: 1,
    disableCrawler: 1,
});