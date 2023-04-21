import getCollection from "../../mongoDB.js";
import {saveError} from "../../../error/saveError.js";
import {updateCorsAllowedOriginsMiddleWareData} from "../../../api/middlewares/cors.js";
import {safeFieldsToRead, updateServerConfigsDb} from "../../../config/configsDb.js";


export async function getServerConfigs() {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'server configs'});
        return Object.freeze(result);
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getServerConfigs_safe() {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'server configs'}, {
            projection: {_id: 0, ...safeFieldsToRead},
        });
        return Object.freeze(result);
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateServerConfigs(configs) {
    try {
        let collection = await getCollection('configs');
        let result = await collection.updateOne({title: 'server configs'}, {
            $set: configs,
        });
        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        await updateServerConfigsDb();
        if (configs.corsAllowedOrigins) {
            updateCorsAllowedOriginsMiddleWareData(configs.corsAllowedOrigins);
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------------------------------
//----------------------------------------------------

export async function getCorsAllowedOrigins() {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'server configs'}, {
            projection: {
                corsAllowedOrigins: 1,
            }
        });
        return result?.corsAllowedOrigins || [];
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function updateCorsAllowedOrigins(allowedOrigins) {
    try {
        let collection = await getCollection('configs');
        let result = await collection.updateOne({title: 'server configs'}, {
            $set: {
                corsAllowedOrigins: allowedOrigins,
            }
        });
        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        updateCorsAllowedOriginsMiddleWareData(allowedOrigins);
        return 'ok';
    } catch (error) {
        saveError(error);
        return [];
    }
}