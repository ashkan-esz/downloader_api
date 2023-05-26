import {v4 as uuidv4} from "uuid";
import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";

const _maxSaveLogDuration = 1;
const _pageSize = 24;

export async function removeOldAnalysis() {
    try {
        let collection = await getCollection('serverAnalysis');
        let now = new Date();
        let yearAndMonth = (now.getFullYear() - _maxSaveLogDuration) + '-' + (now.getMonth() + 1);
        let result = await collection.deleteMany({
            yearAndMonth: yearAndMonth,
        });
        return result.value;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

export async function saveTotalAndActiveUsersCount(counts) {
    try {
        let collection = await getCollection('serverAnalysis');
        let now = new Date();
        let yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
        let result = await collection.updateOne({
            yearAndMonth: yearAndMonth,
        }, {
            $push: {
                userCounts: {
                    $each: [{
                        total: counts.total,
                        active: counts.active,
                        date: now,
                    }],
                    $position: 0,
                }
            }
        });
        if (result.modifiedCount === 0) {
            //new year/month, new bucket
            let newBucket = getNewBucket(yearAndMonth);
            newBucket.userCounts.push({
                total: counts.total,
                active: counts.active,
                date: now,
            });
            await collection.insertOne(newBucket);
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function saveCrawlerLog(crawlerLog) {
    try {
        let {yearAndMonth, bucket, collection} = await getCollectionAndBucket();

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                'crawlerLogs.crawlId': crawlerLog.crawlId,
            }, {
                $set: {
                    'crawlerLogs.$': crawlerLog
                }
            });

            if (updateResult.matchedCount === 0 && updateResult.modifiedCount === 0) {
                //new crawl
                await collection.updateOne({
                    _id: bucket[0]._id,
                }, {
                    $push: {
                        crawlerLogs: {
                            $each: [crawlerLog],
                            $position: 0,
                        }
                    }
                });
            }
        } else {
            //create new bucket
            let newBucket = getNewBucket(yearAndMonth);
            newBucket.crawlerLogs.push(crawlerLog);
            await collection.insertOne(newBucket);
        }

        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function saveServerLog(logMessage) {
    try {
        let {now, yearAndMonth, bucket, collection} = await getCollectionAndBucket();

        let newServerLog = {
            message: logMessage,
            date: now,
            id: uuidv4(),
        };

        if (bucket.length > 0) {
            //new serverLog
            await collection.updateOne({
                _id: bucket[0]._id,
            }, {
                $push: {
                    serverLogs: {
                        $each: [newServerLog],
                        $position: 0,
                    }
                }
            });
        } else {
            //create new bucket
            let newBucket = getNewBucket(yearAndMonth);
            newBucket.serverLogs.push(newServerLog);
            await collection.insertOne(newBucket);
        }

        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function saveGoogleCacheCall(url) {
    try {
        let {now, yearAndMonth, bucket, collection} = await getCollectionAndBucket();

        let newGoogleCacheCall = {
            url: url,
            date: now,
            count: 1,
            id: uuidv4(),
        };

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                'googleCacheCalls.url': url,
            }, {
                $set: {
                    'googleCacheCalls.$.date': now,
                },
                $inc: {
                    'googleCacheCalls.$.count': 1,
                }
            });

            if (updateResult.matchedCount === 0 && updateResult.modifiedCount === 0) {
                //new cache call
                await collection.updateOne({
                    _id: bucket[0]._id,
                }, {
                    $push: {
                        googleCacheCalls: newGoogleCacheCall,
                    }
                });
            }
        } else {
            //create new bucket
            let newBucket = getNewBucket(yearAndMonth);
            newBucket.googleCacheCalls.push(newGoogleCacheCall);
            await collection.insertOne(newBucket);
        }

        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

export async function saveCrawlerWarning(message) {
    try {
        let {now, yearAndMonth, bucket, collection} = await getCollectionAndBucket();

        let newWarning = {
            message: message,
            date: now,
            resolved: false,
            resolvedDate: 0,
            count: 1,
            id: uuidv4(),
        };

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                'warnings.message': message,
            }, {
                $set: {
                    'warnings.$.date': now,
                    'warnings.$.resolved': false,
                    'warnings.$.resolvedDate': 0,
                },
                $inc: {
                    'warnings.$.count': 1,
                }
            });

            if (updateResult.matchedCount === 0 && updateResult.modifiedCount === 0) {
                //new warning
                await collection.updateOne({
                    _id: bucket[0]._id,
                }, {
                    $push: {
                        warnings: newWarning
                    }
                });
            }
        } else {
            //create new bucket
            let newBucket = getNewBucket(yearAndMonth);
            newBucket.warnings.push(newWarning);
            await collection.insertOne(newBucket);
        }

        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function resolveCrawlerWarning(message) {
    try {
        let {bucket, collection} = await getCollectionAndBucket();

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                warnings: {$elemMatch: {message: message, resolved: false}}
            }, {
                $set: {
                    'warnings.$.resolved': true,
                    'warnings.$.resolvedDate': new Date(),
                }
            });

            if (updateResult.modifiedCount === 0) {
                return "not found";
            }
        } else {
            return "not found";
        }

        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

export async function getServerAnalysisInTimesDB(fieldName, startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('serverAnalysis');

        const matchField = ['crawlerLogs'].includes(fieldName) ? 'startTime' : 'date';
        const sortField = ['crawlerLogs'].includes(fieldName) ? 'startTime' : 'date';

        let aggregationPipeline = [
            {
                $match: {
                    [`${fieldName}.${matchField}`]: {$gte: startTime, $lte: endTime},
                }
            },
            {
                $unwind: `$${fieldName}`,
            },
            {
                $match: {
                    [`${fieldName}.${matchField}`]: {$gte: startTime, $lte: endTime},
                }
            },
            {
                $sort: {
                    [`${fieldName}.${sortField}`]: 1,
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            {
                $replaceRoot: {
                    newRoot: `$${fieldName}`,
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getServerAnalysisInCurrentMonthDB(fieldName, page) {
    try {
        let collection = await getCollection('serverAnalysis');
        const now = new Date();
        const yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);

        const sortField = ['crawlerLogs'].includes(fieldName) ? 'startTime' : 'date';
        const sortValue = fieldName === "crawlerLogs" ? 1 : -1;

        let aggregationPipeline = [
            {
                $match: {
                    yearAndMonth: yearAndMonth,
                }
            },
            {
                $limit: 1,
            },
            {
                $unwind: `$${fieldName}`,
            },
            {
                $match: {
                    [`${fieldName}.resolved`]: {$ne: true},
                }
            },
            {
                $sort: {
                    [`${fieldName}.${sortField}`]: sortValue,
                }
            },
            {
                $skip: _pageSize * (page - 1),
            },
            {
                $limit: _pageSize,
            },
            {
                $replaceRoot: {
                    newRoot: `$${fieldName}`,
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function resolveServerAnalysisDB(fieldsName, id) {
    try {
        let collection = await getCollection('serverAnalysis');

        let updateResult;
        if (fieldsName === "googleCacheCalls" || fieldsName === "serverLogs") {
            updateResult = await collection.updateOne({
                [`${fieldsName}.id`]: id,
            }, {
                $pull: {
                    [fieldsName]: {id: id},
                }
            });
        } else {
            updateResult = await collection.updateOne({
                [fieldsName]: {$elemMatch: {id: id, resolved: {$ne: true}}}
            }, {
                $set: {
                    [`${fieldsName}.$.resolved`]: true,
                    [`${fieldsName}.$.resolvedDate`]: new Date(),
                }
            });
        }

        if (updateResult.modifiedCount === 0) {
            return "not found";
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function resolveServerAnalysisLastDaysDB(fieldsName, days) {
    try {
        let collection = await getCollection('serverAnalysis');

        let daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        daysAgo.setHours(0, 0, 0, 0);
        const matchField = ['crawlerLogs'].includes(fieldsName) ? 'startTime' : 'date';

        let updateResult;
        if (fieldsName === "googleCacheCalls" || fieldsName === "serverLogs") {
            updateResult = await collection.updateMany({
                [`${fieldsName}.${matchField}`]: {$gte: daysAgo},
            }, {
                $pull: {
                    [fieldsName]: {[matchField]: {$gte: daysAgo}},
                }
            });
        } else {
            updateResult = await collection.updateMany({
                [fieldsName]: {$elemMatch: {[matchField]: {$gte: daysAgo}, resolved: {$ne: true}}}
            }, {
                $set: {
                    [`${fieldsName}.$[item].resolved`]: true,
                    [`${fieldsName}.$[item].resolvedDate`]: new Date(),
                },
            }, {
                arrayFilters: [
                    {
                        [`item.${matchField}`]: {$gte: daysAgo},
                        'item.resolved': {$ne: true}
                    },
                ],
            });
        }

        if (updateResult.modifiedCount === 0) {
            return "not found";
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function resolveServerAnalysisByIdsDB(fieldsName, ids) {
    try {
        let collection = await getCollection('serverAnalysis');

        let updateResult;
        if (fieldsName === "googleCacheCalls" || fieldsName === "serverLogs") {
            updateResult = await collection.updateMany({
                [`${fieldsName}.id`]: {$in: ids},
            }, {
                $pull: {
                    [fieldsName]: {id: {$in: ids}},
                }
            });
        } else {
            updateResult = await collection.updateMany({
                [`${fieldsName}.id`]: {$in: ids},
            }, {
                $set: {
                    [`${fieldsName}.$[item].resolved`]: true,
                    [`${fieldsName}.$[item].resolvedDate`]: new Date(),
                },
            }, {
                arrayFilters: [
                    {'item.id': {$in: ids}},
                ],
            });
        }

        if (updateResult.modifiedCount === 0) {
            return "not found";
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

async function getCollectionAndBucket() {
    let collection = await getCollection('serverAnalysis');
    let now = new Date();
    let yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);

    let bucket = await collection.find({yearAndMonth: yearAndMonth}).limit(1).toArray();
    return {now, yearAndMonth, bucket, collection};
}

function getNewBucket(yearAndMonth) {
    return ({
        yearAndMonth: yearAndMonth,
        userCounts: [],
        crawlerLogs: [],
        serverLogs: [],
        warnings: [],
        googleCacheCalls: [],
    });
}

export const serverAnalysisFields = Object.freeze(['userCounts', 'crawlerLogs', 'serverLogs', 'warnings', 'googleCacheCalls']);
