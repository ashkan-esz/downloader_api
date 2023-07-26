import config from "../../config/index.js";
import cors from "cors";
import {getConfigDB_CorsAllowedOrigins} from "../../data/db/admin/adminConfigDbMethods.js";

let corsAllowedOriginsDB = await getConfigDB_CorsAllowedOrigins();

setInterval(async () => {
    corsAllowedOriginsDB = await getConfigDB_CorsAllowedOrigins();
}, 30 * 60 * 1000); //30 min

export function updateCorsAllowedOriginsMiddleWareData(allowedOrigins) {
    corsAllowedOriginsDB = allowedOrigins;
}

const corsOptions = {
    origin: (origin, callback) => {
        let allowedOrigins = [...config.corsAllowedOrigins, ...corsAllowedOriginsDB];
        if (allowedOrigins.indexOf(origin) !== -1 || !origin || origin.match(/^https?:\/\/localhost:\d\d\d\d$/)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }, // origin: 'http://localhost:3000',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true,
};

export default cors(corsOptions);