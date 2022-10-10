import mongodb from 'mongodb';
import getCollection from '../mongoDB.js';
import {getNewDeviceSession} from "../../models/user.js";
import {saveError} from "../../error/saveError.js";


export async function findUser(username, email, projection) {
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
        let result = await collection.find(searchObj, {projection: projection}).limit(1).toArray();
        return result.length === 0 ? null : result[0];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function findUserById(userId, projection = {}) {
    try {
        let collection = await getCollection('users');
        return await collection.findOne({_id: new mongodb.ObjectId(userId)}, {projection: projection});
    } catch (error) {
        saveError(error);
        return 'error';
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
        let result = await collection.updateOne({_id: new mongodb.ObjectId(userId)}, {
            $set: updateFields
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

export async function updateEmailToken(userId, token, expire) {
    try {
        let collection = await getCollection('users');
        let result = await collection.updateOne(
            {
                _id: new mongodb.ObjectId(userId),
            }, {
                $set: {
                    emailVerifyToken: token,
                    emailVerifyToken_expire: expire,
                },
            });

        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function verifyUserEmail(token) {
    try {
        let collection = await getCollection('users');
        let result = await collection.updateOne({
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
        if (result.modifiedCount === 0) {
            return 'notfound';
        }
        return 'ok';
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
        await collection.updateOne({_id: userId}, {
            $set: updateFields,
        });
    } catch (error) {
        saveError(error);
    }
}

export async function setTokenForNewDevice(userId, deviceInfo, deviceId, refreshToken) {
    try {
        let collection = await getCollection('users');
        let newDeviceData = getNewDeviceSession(deviceInfo, deviceId, refreshToken);
        let result = await collection.findOneAndUpdate(
            {
                _id: userId
            }, {
                $push: {
                    activeSessions: newDeviceData,
                }
            }, {
                projection: {email: 1}
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
        let sessionData = getNewDeviceSession(deviceInfo, '', refreshToken);
        let updateFields = {
            "activeSessions.$[item].appName": sessionData.appName,
            "activeSessions.$[item].appVersion": sessionData.appVersion,
            "activeSessions.$[item].deviceOs": sessionData.deviceOs,
            "activeSessions.$[item].ipLocation": sessionData.ipLocation,
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
            projection: {
                activeSessions: 1,
                rawUsername: 1,
                profileImages: 1,
            }
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
        let result = await collection.findOneAndUpdate(
            {
                _id: new mongodb.ObjectId(userId),
                'activeSessions.refreshToken': prevRefreshToken,
            }, {
                $pull: {
                    activeSessions: {refreshToken: prevRefreshToken},
                }
            }, {
                projection: {activeSessions: 1}
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
        let result = await collection.findOneAndUpdate(
            {
                _id: new mongodb.ObjectId(userId),
                'activeSessions.refreshToken': prevRefreshToken,
            }, {
                $pull: {
                    activeSessions: {deviceId: deviceId},
                }
            }, {
                projection: {activeSessions: 1}
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
        let result = await collection.findOneAndUpdate(
            {
                _id: new mongodb.ObjectId(userId),
                'activeSessions.refreshToken': prevRefreshToken,
            }, {
                $pull: {
                    activeSessions: {refreshToken: {$ne: prevRefreshToken}},
                }
            }, {
                projection: {activeSessions: 1}
            });
        return result.value ? result.value : 'cannot find device';
    } catch (error) {
        saveError(error);
        return null;
    }
}

//----------------------------
//----------------------------

export async function uploadProfileImageDB(userId, imageData) {
    try {
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate(
            {
                _id: new mongodb.ObjectId(userId),
                profileImageCounter: {$lt: 20}
            }, {
                $push: {
                    profileImages: {
                        $each: [imageData],
                        $position: 0,
                    },
                },
                $inc: {
                    profileImageCounter: 1
                }
            }, {
                returnDocument: 'after',
                projection: {profileImages: 1}
            });
        return result.value;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeProfileImageDB(userId, fileName) {
    try {
        let fileNameRegex = new RegExp(fileName.replace(/\./g, '\\.') + '$');
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate(
            {
                _id: new mongodb.ObjectId(userId),
                'profileImages.url': fileNameRegex
            }, {
                $pull: {
                    profileImages: {
                        url: fileNameRegex
                    },
                },
                $inc: {
                    profileImageCounter: -1
                }
            }, {
                returnDocument: 'after',
                projection: {profileImages: 1}
            });
        return result.value;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------
//----------------------------

export async function getAllUserSettingsDB(userId) {
    try {
        let collection = await getCollection('users');
        let result = await collection.find({
            _id: new mongodb.ObjectId(userId),
        }, {
            projection: {
                _id: 0,
                movieSettings: 1,
                downloadLinksSettings: 1,
                notificationSettings: 1,
            }
        }).limit(1).toArray();
        return result.length === 0 ? null : result[0];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getUserSettingsDB(userId, settingSectionName) {
    try {
        let fieldName = settingSectionName + 'Settings';
        let collection = await getCollection('users');
        let result = await collection.find({
            _id: new mongodb.ObjectId(userId),
        }, {
            projection: {
                [fieldName]: 1
            }
        }).limit(1).toArray();
        return result.length === 0 ? null : result[0][fieldName];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function changeUserSettingsDB(userId, settings, settingSectionName) {
    try {
        let fieldName = settingSectionName + 'Settings';
        let collection = await getCollection('users');
        let result = await collection.findOneAndUpdate(
            {
                _id: new mongodb.ObjectId(userId),
            }, {
                $set: {
                    [fieldName]: settings
                },
            }, {
                returnDocument: 'after',
                projection: {
                    [fieldName]: 1
                }
            });

        return result.value?.[fieldName];
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//----------------------------
//----------------------------

export async function getTotalAndActiveUsersCount() {
    try {
        let collection = await getCollection('users');
        let prevDay = new Date();
        prevDay.setDate(prevDay.getDate() - 1);
        let res = await Promise.allSettled([
            await collection.countDocuments(),
            await collection.countDocuments({
                'activeSessions.lastUseDate': {$gte: prevDay}
            })
        ]);
        if (res[0].status !== 'fulfilled' || res[1].status !== 'fulfilled') {
            return null;
        }
        return {
            total: res[0].value,
            active: res[1].value
        };
    } catch (error) {
        saveError(error);
        return null;
    }
}
