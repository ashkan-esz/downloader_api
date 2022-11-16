import getCollection from "../../mongoDB.js";
import {saveError} from "../../../error/saveError.js";

export async function updateSourceData(sourceName, data) {
    try {
        let collection = await getCollection('sources');
        let sourceData = await collection.findOne({title: 'sources'}, {
            projection: {
                _id: 0,
                [sourceName]: 1,
            }
        });
        if (!sourceData || !sourceData[sourceName]) {
            return 'notfound';
        }

        sourceData = sourceData[sourceName];

        if (sourceData.disabled && !data.disabled) {
            //source got activated
            sourceData.disabled = false;
            sourceData.disabledDate = 0;
        } else if (!sourceData.disabled && data.disabled) {
            //source got disabled
            sourceData.disabled = true;
            sourceData.disabledDate = new Date();
        }

        sourceData = {...sourceData, ...data};

        await collection.updateOne({title: 'sources'}, {
            $set: {
                [sourceName]: sourceData,
            }
        });
        return sourceData;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function addSourceDB(sourceName, data) {
    try {
        let collection = await getCollection('sources');
        let sourceData = await collection.findOne({title: 'sources'}, {
            projection: {
                _id: 0,
                [sourceName]: 1,
            }
        });
        if (sourceData && sourceData[sourceName]) {
            return 'already exist';
        }

        data.disabledDate = data.disabled ? new Date() : 0;
        data.addDate = new Date();
        data.lastCrawlDate = 0;
        data.lastDomainChangeDate = 0;

        let res = await collection.findOneAndUpdate({title: 'sources'}, {
            $set: {
                [sourceName]: data,
            }
        }, {returnDocument: "after"});
        if (!res || !res.value) {
            return "notfound";
        }
        return {...res.value[sourceName], sourceName: sourceName};
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
