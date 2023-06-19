import config from "../../../config/index.js";
import getCollection from "../../mongoDB.js";
import {saveError} from "../../../error/saveError.js";
import {safeFieldsToRead, safeFieldsToRead_array, updateServerConfigsDb} from "../../../config/configsDb.js";
import {v4 as uuidv4} from "uuid";
import {findUserById} from "../usersDbMethods.js";


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
        return false;
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
        return false;
    }
}

//----------------------------------------------------
//----------------------------------------------------

export async function setMessageDB(message, date) {
    try {
        let collection = await getCollection('configs');
        let result = await collection.updateOne({title: 'message'}, {
            $set: {
                message: message,
                date: date,
            }
        });
        if (result.matchedCount === 0 && result.modifiedCount === 0) {
            await collection.insertOne({
                title: 'message',
                message: message,
                date: date,
            });
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getMessageDB() {
    try {
        let collection = await getCollection('configs');
        return await collection.findOne({title: 'message', date: {$gte: new Date()}}, {
            projection: {
                _id: 0,
                title: 0,
            }
        });
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------------------------------
//----------------------------------------------------

export async function addNewAppVersionDB(appData, userData) {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'apps'});

        const newAppData = {
            appName: appData.appName,
            os: appData.os,
            latestVersion: appData.version,
            latestVersionName: appData.versionName,
            minVersion: appData.minVersion,
            versions: [{
                version: appData.version,
                versionName: appData.versionName,
                uploaderId: userData.userId,
                uploaderRole: userData.role,
                vid: uuidv4(),
                fileData: appData.fileData,
            }]
        };

        if (!result) {
            //create doc
            await collection.insertOne({
                title: 'apps',
                apps: [newAppData],
            });
            return 'ok';
        }

        //new app/version
        let findApp = result.apps.find(item => item.appName === appData.appName && item.os === appData.os);
        if (!findApp) {
            //new app
            result.apps.push(newAppData);
        } else {
            let findVersion = findApp.versions.find(item => item.version === appData.version);
            if (findVersion) {
                return 'already exists';
            }
            //new version
            if (compareAppVersions(appData.version, findApp.latestVersion) === 1) {
                findApp.latestVersion = appData.version;
                findApp.latestVersionName = appData.versionName;
            }
            if (compareAppVersions(appData.minVersion, findApp.minVersion) === 1) {
                findApp.minVersion = appData.minVersion;
            }
            findApp.versions.push(newAppData.versions[0]);
            findApp.versions = findApp.versions.sort((a, b) => compareAppVersions(a.version, b.version) === -1 ? 1 : -1).slice(0, 5);
        }

        await collection.updateOne({title: 'apps'}, {
            $set: {
                apps: result.apps,
            }
        });
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeAppVersionDB(vid) {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'apps'});
        if (!result) {
            return "not found";
        }

        let findVersion = null;
        for (let i = 0; i < result.apps.length; i++) {
            findVersion = result.apps[i].versions.find(item => item.vid === vid);
            if (findVersion) {
                result.apps[i].versions = result.apps[i].versions.filter(item => item.vid !== vid);
                if (result.apps[i].versions.length === 0) {
                    //remove app
                    result.apps = result.apps.filter(item => item.appName !== result.apps[i].appName);
                } else {
                    result.apps[i].latestVersion = result.apps[i].versions[0].version;
                    result.apps[i].latestVersionName = result.apps[i].versions[0].versionName;
                    if (compareAppVersions(result.apps[i].minVersion, result.apps[i].versions[0].version) === 1) {
                        result.apps[i].minVersion = result.apps[i].versions[0].version;
                    }
                }
                break;
            }
        }
        if (!findVersion) {
            return "not found";
        }

        await collection.updateOne({title: 'apps'}, {
            $set: {
                apps: result.apps,
            }
        });
        return findVersion;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getAppVersionDB() {
    try {
        let collection = await getCollection('configs');
        let result = await collection.findOne({title: 'apps'});
        if (result && result.apps) {
            let users = [];
            for (let i = 0; i < result.apps.length; i++) {
                let versions = result.apps[i].versions;
                for (let j = 0; j < versions.length; j++) {
                    let uploaderId = versions[j].uploaderId;
                    let uploaderData = users.find(item => item.id === uploaderId);
                    if (uploaderData) {
                        versions[j].uploaderData = uploaderData.data;
                    } else {
                        let data = await findUserById(uploaderId, {_id: 0, rawUsername: 1});
                        users.push({id: uploaderId, data: data});
                        versions[j].uploaderData = data;
                    }
                }
            }
        }
        return result ? result.apps : [];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export const newAppDataFields = Object.freeze(["appName", "version", "versionName", "os", "description", "minVersion"]);

export function compareAppVersions(v1, v2) {
    let v1split = v1.split('.').map(item => Number(item));
    let v2split = v2.split('.').map(item => Number(item));
    for (let i = 0; i < v1split.length; i++) {
        if (v1split[i] > v2split[i]) {
            return 1;
        }
        if (v1split[i] < v2split[i]) {
            return -1;
        }
    }
    return 0;
}

//----------------------------------------------------
//----------------------------------------------------