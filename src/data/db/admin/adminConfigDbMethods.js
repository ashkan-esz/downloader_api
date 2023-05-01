import config from "../../../config/index.js";
import getCollection from "../../mongoDB.js";
import {saveError} from "../../../error/saveError.js";
import {safeFieldsToRead, safeFieldsToRead_array, updateServerConfigsDb} from "../../../config/configsDb.js";


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
        if (result) {
            let temp = {};
            for (let i = 0; i < safeFieldsToRead_array.length; i++) {
                temp[safeFieldsToRead_array[i]] = config[safeFieldsToRead_array[i]];
            }
            result.configsEnv = temp;
        }
        return Object.freeze(result);
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateServerConfigs_internalUsage(configs) {
    try {
        let collection = await getCollection('configs');
        let result = await collection.updateOne({title: 'server configs'}, {
            $set: configs,
        });
        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateServerConfigs(configs) {
    try {
        let collection = await getCollection('configs');
        let prevConfigs = await collection.findOne({title: 'server configs'});

        if (configs.disableCrawlerForDuration !== undefined) {
            if (configs.disableCrawlerForDuration === 0 && prevConfigs.crawlerDisabled) {
                configs.disableCrawlerStart = 0;
                configs.crawlerDisabled = false;
            } else if (configs.disableCrawlerForDuration > 0) {
                configs.disableCrawlerStart = new Date();
                configs.crawlerDisabled = true;
            }
        }
        if (configs.developmentFaze !== undefined) {
            if (configs.developmentFaze) {
                configs.developmentFazeStart = new Date();
            } else {
                configs.developmentFazeStart = 0;
            }
        }

        let result = await collection.updateOne({title: 'server configs'}, {
            $set: configs,
        });
        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        await updateServerConfigsDb();
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------------------------------
//----------------------------------------------------

export async function getConfigDB_CorsAllowedOrigins() {
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

export async function getConfigDB_DisableTestUserRequests() {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'server configs'}, {
            projection: {
                disableTestUserRequests: 1,
            }
        });
        return !!result?.disableTestUserRequests;
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getConfigDB_DevelopmentFaze() {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'server configs'}, {
            projection: {
                developmentFaze: 1,
            }
        });
        return !!result?.developmentFaze;
    } catch (error) {
        saveError(error);
        return [];
    }
}