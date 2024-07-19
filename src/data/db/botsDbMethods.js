import getCollection from "../mongoDB.js";
import * as usersDbMethods from "./usersDbMethods.js";
import {v4 as uuidv4} from 'uuid';
import prisma from "../prisma.js";
import {saveError} from "../../error/saveError.js";

export async function addBotsFromMongodbToPostgres() {
    try {
        let collection = await getCollection('bots');
        let rr = await collection.find({}).toArray();
        rr = rr.map(b => ({
            botId: b.botId,
            botName: b.botName,
            botType: b.botType,
            disabled: b.disabled,
            isOfficial: b.isOfficial,
            permissionToLogin: b.permissionToLogin,
            permissionToCrawl: b.permissionToCrawl,
            permissionToTorrentLeech: b.permissionToTorrentLeech,
        }));

        await prisma.bot.deleteMany({
            where: {
                botId: {
                    notIn: rr.map(m => m.botId),
                }
            }
        });
        await prisma.bot.createMany({
            data: rr,
            skipDuplicates: true,
        });
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getAllBots() {
    try {
        let collection = await getCollection('bots');
        let result = await collection.find({}, {
            projection: {
                _id: 0,
            }
        }).toArray();

        let users = [];
        for (let i = 0; i < result.length; i++) {
            if (!result[i].userData) {
                continue;
            }
            let userId = result[i].userData.userId;
            let data = users.find(item => item.id === userId);
            if (data) {
                result[i].userData = {...result[i].userData, ...data};
            } else {
                let data = await usersDbMethods.findUserById(userId, {rawUsername: true});
                users.push({id: userId, data: data});
                result[i].userData = {...result[i].userData, ...data};
            }
        }

        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getBotData(botId) {
    try {
        let collection = await getCollection('bots');
        let result = await collection.findOne({botId: botId}, {
            projection: {
                _id: 0,
            }
        });

        if (result && result.userData) {
            let userId = result.userData.userId;
            let data = await usersDbMethods.findUserById(userId, {rawUsername: true});
            result.userData = {...result.userData, ...data};
        }

        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function addNewBot(botName, botType, disabled, description, isOfficial, permissionToLogin, permissionToCrawl, permissionToTorrentLeech, userData) {
    //for admin usage
    try {
        let collection = await getCollection('bots');
        let daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - 10);
        daysAgo.setHours(0, 0, 0, 0);
        let newBot = {
            botId: uuidv4(),
            botName: botName,
            botType: botType,
            addDate: new Date(),
            lastUseDate: 0,
            lastApiCall_news: daysAgo,
            lastApiCall_updates: daysAgo,
            disabled: disabled,
            disabledDate: disabled ? new Date() : 0,
            userData: {
                userId: userData.userId,
                role: userData.role,
            },
            description: description,
            lastConfigUpdateDate: 0,
            isOfficial: isOfficial,
            permissionToLogin: permissionToLogin,
            permissionToCrawl: permissionToCrawl,
            permissionToTorrentLeech: permissionToTorrentLeech,
        };
        await collection.insertOne(newBot);

        try {
            await prisma.bot.create({
                data: {
                    botId: newBot.botId,
                    botName: newBot.botName,
                    botType: newBot.botType,
                    disabled: newBot.disabled,
                    isOfficial: newBot.isOfficial,
                    permissionToLogin: newBot.permissionToLogin,
                    permissionToCrawl: newBot.permissionToCrawl,
                    permissionToTorrentLeech: newBot.permissionToTorrentLeech,
                },
            });
        } catch (error2) {
            saveError(error2);
        }

        return newBot.botId;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateBotData(botId, data, userData) {
    try {
        let collection = await getCollection('bots');
        let botData = await collection.findOne({botId: botId});
        if (!botData) {
            return 'notfound';
        }

        if (botData.disabled && !data.disabled) {
            //bot got activated
            botData.disabled = false;
            botData.disabledDate = 0;
        } else if (!botData.disabled && data.disabled) {
            //bot got disabled
            botData.disabled = true;
            botData.disabledDate = new Date();
        }

        botData = {...botData, ...data};
        botData.userData = {
            userId: userData.userId,
            role: userData.role,
        }
        botData.lastConfigUpdateDate = new Date();

        let updateResult = await collection.updateOne({botId: botId}, {
            $set: botData
        });
        if (updateResult.modifiedCount === 0) {
            return 'notfound';
        }

        await prisma.bot.update({
            where: {
                botId: botId,
            },
            data: {
                ...botData,
            },
        });

        return botData;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function updateBotApiCallDate(botId, updateFields) {
    try {
        let collection = await getCollection('bots');
        let result = await collection.updateOne({botId: botId}, {
            $set: {
                lastUseDate: new Date(),
                ...updateFields,
            }
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

export async function removeBotData(botId) {
    try {
        let collection = await getCollection('bots');
        let result = await collection.deleteOne({botId: botId});
        if (!result || result.deletedCount === 0) {
            return 'notfound';
        }

        await prisma.bot.delete({
            where: {
                botId: botId,
            },
        });

        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}