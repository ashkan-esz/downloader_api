import getCollection from "../../mongoDB.js";
import {resolveCrawlerWarning} from "../serverAnalysisDbMethods.js";
import {saveError} from "../../../error/saveError.js";
import {getCrawlerWarningMessages} from "../../../crawlers/status/crawlerWarnings.js";

export async function updateSourceData(sourceName, data, userData) {
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
            sourceData.isManualDisable = false;
            sourceData.disabledDate = 0;
        } else if (!sourceData.disabled && data.disabled) {
            //source got disabled
            sourceData.disabled = true;
            sourceData.isManualDisable = true;
            sourceData.disabledDate = new Date();
        }

        if (
            sourceData.cookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000))) &&
            data.cookies.length > 0 &&
            !data.cookies.find(item => item.expire && (Date.now() > (item.expire - 60 * 60 * 1000)))
        ) {
            await resolveCrawlerWarning(getCrawlerWarningMessages(sourceName).expireCookie);
        }

        sourceData = {...sourceData, ...data};
        sourceData.userData = {
            userId: userData.userId,
            role: userData.role,
        }
        sourceData.lastConfigUpdateDate = new Date();

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

export async function updateSourceResponseStatus(sourceName, isResponsible) {
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
        sourceData.status.lastCheck = new Date();
        let temp = 0;
        if (isResponsible) {
            //source activated
            temp = sourceData.status.notRespondingFrom;
            sourceData.status.notRespondingFrom = 0;
        } else {
            if (sourceData.status.notRespondingFrom === 0) {
                //source Deactivated
                sourceData.status.notRespondingFrom = new Date();
            }
        }

        await collection.updateOne({title: 'sources'}, {
            $set: {
                [sourceName]: sourceData,
            }
        });
        return temp;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function disableSource(sourceName) {
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

        sourceData.disabled = true;
        sourceData.isManualDisable = false;
        sourceData.disabledDate = new Date();

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