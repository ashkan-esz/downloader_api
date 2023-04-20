import {getServerConfigs} from "../data/db/admin/adminConfigDbMethods.js";

let configsDB = await getServerConfigs();
setInterval(async () => {
    configsDB = await getServerConfigs();
}, 30 * 60 * 1000); //30 min


export const defaultConfigsDb = Object.freeze({
    title: 'server configs',
    corsAllowedOrigins: Object.freeze([
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://127.0.0.1:5000',
        'http://localhost:5000',
    ]),
});
