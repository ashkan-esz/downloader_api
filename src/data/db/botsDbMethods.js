import getCollection from "../mongoDB.js";
import {v4 as uuidv4} from 'uuid';
import {saveError} from "../../error/saveError.js";

export async function addNewBot(name, type) {
    //for admin usage
    try {
        let collection = await getCollection('bots');
        let daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - 10);
        daysAgo.setHours(0, 0, 0, 0);
        let newBot = {
            botId: uuidv4(),
            name: name,
            type: type,
            addDate: new Date(),
            lastUseDate: 0,
            lastApiCall_news: daysAgo,
            lastApiCall_updates: daysAgo,
            disabled: false,
        };
        await collection.insertOne(newBot);
        return newBot.botId;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getBotData(botId) {
    try {
        let collection = await getCollection('bots');
        return await collection.findOne({botId: botId});
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

export async function updateBotActivation(botId, disable) {
    try {
        let collection = await getCollection('bots');
        let result = await collection.updateOne({botId: botId}, {
            $set: {
                disabled: disable,
                disabledDate: disable ? new Date() : 0,
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
