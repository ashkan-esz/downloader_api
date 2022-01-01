import getCollection from './mongoDB';
import mongodb from 'mongodb';
import {saveError} from "../error/saveError";
import {getNewSession} from "../models/user.js";


export async function findUser(username, email) {
    try {
        let collection = await getCollection('users');
        let searchObj = {
            $or: [
                {
                    $and: [
                        {username: {$ne: ''}},
                        {username: username.toLowerCase()}
                    ]
                },
                {
                    $and: [
                        {email: {$ne: ''}},
                        {email: email.toLowerCase()}
                    ]
                },
            ],
        };
        return await collection.findOne(searchObj);
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function findUserById(userId) {
    try {
        let collection = await getCollection('users');
        return await collection.findOne({_id: new mongodb.ObjectId(userId)});
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function addUser(userData) {
    try {
        let collection = await getCollection('users');
        let result = await collection.insertOne(userData);
        return result.insertedId;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function updateUserByID(userId, updateFields) {
    try {
        let collection = await getCollection('users');
        await collection.findOneAndUpdate({_id: new mongodb.ObjectId(userId)}, {
            $set: updateFields
        });
    } catch (error) {
        saveError(error);
    }
}

export async function updateEmailToken(userId, token, expire) {
    try {
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate({
            _id: new mongodb.ObjectId(userId),
        }, {
            $set: {
                emailVerifyToken: token,
                emailVerifyToken_expire: expire,
            },
        });
        return result && result.value;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function verifyUserEmail(token) {
    try {
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate({
            emailVerifyToken: token,
            emailVerifyToken_expire: {$gte: Date.now()},
        }, {
            $set: {
                emailVerified: true,
            },
            $unset: {
                emailVerifyToken: '',
                emailVerifyToken_expire: '',
            }
        });
        return result && result.value;
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function setTokenForNewUser(userId, refreshToken) {
    try {
        let collection = await getCollection('users');
        let updateFields = {
            'activeSessions.0.refreshToken': refreshToken,
        }
        await collection.findOneAndUpdate({_id: userId}, {
            $set: updateFields,
        });
    } catch (error) {
        saveError(error);
    }
}

export async function setTokenForNewDevice(userId, deviceInfo, deviceId, refreshToken) {
    try {
        let collection = await getCollection('users');
        let newDeviceData = getNewSession(deviceInfo, deviceId, refreshToken);
        let result = await collection.findOneAndUpdate({_id: userId}, {
            $push: {
                activeSessions: newDeviceData,
            }
        });
        return result.value ? result.value : 'cannot find user';
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function updateUserAuthToken(userId, deviceInfo, refreshToken, prevRefreshToken) {
    try {
        let collection = await getCollection('users');
        let sessionData = getNewSession(deviceInfo, '', refreshToken);
        let updateFields = {
            "activeSessions.$[item].appName": sessionData.appName,
            "activeSessions.$[item].appVersion": sessionData.appVersion,
            "activeSessions.$[item].deviceOs": sessionData.deviceOs,
            "activeSessions.$[item].deviceModel": sessionData.deviceModel,
            "activeSessions.$[item].lastUseDate": sessionData.lastUseDate,
            "activeSessions.$[item].refreshToken": sessionData.refreshToken,
        };
        const options = {
            returnDocument: 'after',
            arrayFilters: [
                {
                    "item.refreshToken": prevRefreshToken,
                },
            ],
        };
        let result = await collection.findOneAndUpdate({_id: new mongodb.ObjectId(userId)}, {$set: updateFields}, options);
        if (result.value) {
            for (let i = 0; i < result.value.activeSessions.length; i++) {
                if (result.value.activeSessions[i].refreshToken === refreshToken) {
                    return result.value;
                }
            }
        }
        return 'cannot find device';
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function removeAuthToken(userId, prevRefreshToken) {
    try {
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate({
            _id: new mongodb.ObjectId(userId),
            'activeSessions.refreshToken': prevRefreshToken,
        }, {
            $pull: {
                activeSessions: {refreshToken: prevRefreshToken},
            }
        });
        return result.value ? result.value : 'cannot find device';
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function removeAuthSession(userId, deviceId, prevRefreshToken) {
    try {
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate({
            _id: new mongodb.ObjectId(userId),
            'activeSessions.refreshToken': prevRefreshToken,
        }, {
            $pull: {
                activeSessions: {deviceId: deviceId},
            }
        });
        if (result.value) {
            for (let i = 0; i < result.value.activeSessions.length; i++) {
                if (result.value.activeSessions[i].deviceId === deviceId) {
                    return result.value;
                }
            }
        }
        return 'cannot find device';
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function removeAllAuthSession(userId, prevRefreshToken) {
    try {
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate({
            _id: new mongodb.ObjectId(userId),
            'activeSessions.refreshToken': prevRefreshToken,
        }, {
            $pull: {
                activeSessions: {refreshToken: {$ne: prevRefreshToken}},
            }
        });
        return result.value ? result.value : 'cannot find device';
    } catch (error) {
        saveError(error);
        return null;
    }
}
