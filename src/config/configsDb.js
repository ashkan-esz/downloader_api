import {getServerConfigs} from "../data/db/admin/adminConfigDbMethods.js";
import {updateCorsAllowedOriginsMiddleWareData} from "../api/middlewares/cors.js";
import {updateDisableTestUserRequestsMiddleWareData} from "../api/middlewares/isAuth.js";

let configsDB = await getServerConfigs();
setInterval(async () => {
    configsDB = await getServerConfigs();
}, 30 * 60 * 1000); //30 min

export function getServerConfigsDb() {
    return configsDB;
}

export async function updateServerConfigsDb() {
    configsDB = await getServerConfigs();
    updateCorsAllowedOriginsMiddleWareData(configsDB.corsAllowedOrigins);
    updateDisableTestUserRequestsMiddleWareData(configsDB.disableTestUserRequests);
}

export const defaultConfigsDb = Object.freeze({
    title: 'server configs',
    corsAllowedOrigins: Object.freeze([
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://127.0.0.1:5000',
        'http://localhost:5000',
    ]),
    disableTestUserRequests: false,
});

export const safeFields_array = ['corsAllowedOrigins', 'disableTestUserRequests'];
export const safeFieldsToRead_array = ['corsAllowedOrigins', 'disableTestUserRequests'];
export const safeFieldsToRead = Object.freeze({
    corsAllowedOrigins: 1,
    disableTestUserRequests: 1,
});