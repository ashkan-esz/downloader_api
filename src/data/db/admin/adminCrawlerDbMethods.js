import getCollection from "../../mongoDB.js";
import {resolveCrawlerWarning} from "../serverAnalysisDbMethods.js";
import {saveError} from "../../../error/saveError.js";
import {getCrawlerWarningMessages} from "../../../crawlers/status/crawlerWarnings.js";
import {reCreateLatestData} from "../../../crawlers/latestData.js";

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
            temp = sourceData.status.notRespondingFrom;
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

export async function removeSource(sourceName, userData, isManualRemove) {
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

        if (!sourceData.disabled) {
            //source got disabled
            sourceData.disabled = true;
            sourceData.isManualDisable = isManualRemove;
            sourceData.disabledDate = new Date();
        } else if (isManualRemove) {
            sourceData.isManualDisable = true;
        }
        if (isManualRemove) {
            sourceData.userData = {
                userId: userData.userId,
                role: userData.role,
            }
        }
        sourceData.lastConfigUpdateDate = new Date();

        let moviesCollection = await getCollection('movies');

        while (true) {
            let result = await moviesCollection.find({'sources.sourceName': sourceName}, {
                projection: {
                    title: 1,
                    type: 1,
                    seasons: 1,
                    qualities: 1,
                    subtitles: 1,
                    sources: 1,
                    posters: 1,
                    trailers: 1,
                }
            }).limit(50).toArray();
            if (result.length === 0) {
                break;
            }

            let promiseArray = [];
            for (let i = 0; i < result.length; i++) {
                //------------------------------------------
                let updateFields = {
                    sources: result[i].sources.filter(item => item.sourceName !== sourceName),
                    posters: result[i].posters.filter(item => !item.info.includes(sourceName)),
                    trailers: result[i].trailers.filter(item => !item.info.includes(sourceName)),
                };
                if (updateFields.trailers.length === 0) {
                    updateFields.trailerDate = 0;
                }
                //------------------------------------------
                if (result[i].type.includes('movie')) {
                    for (let j = 0; j < result[i].qualities.length; j++) {
                        result[i].qualities[j].links = result[i].qualities[j].links.filter(item => item.sourceName !== sourceName);
                        result[i].qualities[j].watchOnlineLinks = result[i].qualities[j].watchOnlineLinks.filter(item => item.sourceName !== sourceName);
                    }
                } else {
                    for (let j = 0; j < result[i].seasons.length; j++) {
                        for (let k = 0; k < result[i].seasons[j].episodes.length; k++) {
                            result[i].seasons[j].episodes[k].links = result[i].seasons[j].episodes[k].links.filter(item => item.sourceName !== sourceName);
                            result[i].seasons[j].episodes[k].watchOnlineLinks = result[i].seasons[j].episodes[k].watchOnlineLinks.filter(item => item.sourceName !== sourceName);
                        }
                    }
                }
                //------------------------------------------
                for (let j = 0; j < result[i].subtitles.length; j++) {
                    result[i].subtitles[j].links = result[i].subtitles[j].links.filter(item => item.sourceName !== sourceName);
                }
                //------------------------------------------
                updateFields.seasons = result[i].seasons;
                updateFields.qualities = result[i].qualities;
                updateFields.subtitles = result[i].subtitles;
                updateFields.latestData = reCreateLatestData(result[i], result[i].type);
                //------------------------------------------

                let updatePromise = moviesCollection.findOneAndUpdate({_id: result[i]._id}, {
                    $set: updateFields,
                });
                promiseArray.push(updatePromise);
            }
            await Promise.allSettled(promiseArray);
        }

        await collection.updateOne({title: 'sources'}, {
            $set: {
                [sourceName]: sourceData,
            }
        });
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}