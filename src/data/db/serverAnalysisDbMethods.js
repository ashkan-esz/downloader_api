import {v4 as uuidv4} from "uuid";
import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";

const _maxSaveLogDuration = 1;

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

export async function getUserCountsInTimes(startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('serverAnalysis');

        let aggregationPipeline = [
            {
                $match: {
                    'userCounts.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $unwind: '$userCounts',
            },
            {
                $match: {
                    'userCounts.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $sort: {
                    'userCounts.date': 1
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
                    newRoot: "$userCounts",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

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

export async function getCrawlerLogsInTimes(startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('serverAnalysis');

        let aggregationPipeline = [
            {
                $match: {
                    'crawlerLogs.startTime': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $unwind: '$crawlerLogs',
            },
            {
                $match: {
                    'crawlerLogs.startTime': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $sort: {
                    'crawlerLogs.startTime': 1
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
                    newRoot: "$crawlerLogs",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

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

export async function getServerLogsInTimes(startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('serverAnalysis');

        let aggregationPipeline = [
            {
                $match: {
                    'serverLogs.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $unwind: '$serverLogs',
            },
            {
                $match: {
                    'serverLogs.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $sort: {
                    'serverLogs.date': 1
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
                    newRoot: "$serverLogs",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getCurrentServerLogs() {
    try {
        let collection = await getCollection('serverAnalysis');
        const now = new Date();
        const yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
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
                $unwind: '$serverLogs',
            },
            {
                $sort: {
                    'serverLogs.date': 1,
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$serverLogs",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeServerLogById(id) {
    try {
        let {bucket, collection} = await getCollectionAndBucket();

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                'serverLogs.id': id,
            }, {
                $pull: {
                    serverLogs: {id: id},
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

export async function resolveCrawlerWarningById(id) {
    try {
        let {bucket, collection} = await getCollectionAndBucket();

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                warnings: {$elemMatch: {id: id, resolved: false}}
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

export async function getCrawlerWarningsInTimes(startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('serverAnalysis');

        let aggregationPipeline = [
            {
                $match: {
                    'warnings.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $unwind: '$warnings',
            },
            {
                $match: {
                    'warnings.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $sort: {
                    'warnings.date': 1
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
                    newRoot: "$warnings",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getCrawlerCurrentWarnings() {
    try {
        let collection = await getCollection('serverAnalysis');
        const now = new Date();
        const yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
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
                $unwind: '$warnings',
            },
            {
                $match: {
                    'warnings.resolved': false,
                }
            },
            {
                $sort: {
                    'warnings.date': 1
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$warnings",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

//-----------------------------------------
//-----------------------------------------

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

export async function getGoogleCacheCallsInTimes(startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('serverAnalysis');

        let aggregationPipeline = [
            {
                $match: {
                    'googleCacheCalls.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $unwind: '$googleCacheCalls',
            },
            {
                $match: {
                    'googleCacheCalls.date': {$gte: startTime, $lte: endTime},
                }
            },
            {
                $sort: {
                    'googleCacheCalls.date': 1
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
                    newRoot: "$googleCacheCalls",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getCurrentGoogleCacheCalls() {
    try {
        let collection = await getCollection('serverAnalysis');
        const now = new Date();
        const yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
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
                $unwind: '$googleCacheCalls',
            },
            {
                $sort: {
                    'googleCacheCalls.count': -1,
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$googleCacheCalls",
                }
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function removeGoogleCacheCallsById(id) {
    try {
        let {bucket, collection} = await getCollectionAndBucket();

        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
            }, {
                $pull: {
                    googleCacheCalls: {id: id},
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
