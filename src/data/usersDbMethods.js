import getCollection from './mongoDB';
import mongodb from 'mongodb';
import {saveError} from "../error/saveError";


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

export async function updateUserAuthTokens(userId, refreshToken, isLoginMethod = false) {
    try {
        let collection = await getCollection('users');
        let updateFields = {
            refreshToken: refreshToken,
        };
        if (isLoginMethod) {
            updateFields.loginDate = new Date();
        }
        await collection.findOneAndUpdate({_id: userId}, {
            $set: updateFields,
        });
    } catch (error) {
        saveError(error);
    }
}
