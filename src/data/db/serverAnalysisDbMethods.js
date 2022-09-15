import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";


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
        let collection = await getCollection('serverAnalysis');
        let now = new Date();
        let yearAndMonth = now.getFullYear() + '-' + (now.getMonth() + 1);

        let bucket = await collection.find({yearAndMonth: yearAndMonth}).limit(1).toArray();
        if (bucket.length > 0) {
            let updateResult = await collection.updateOne({
                _id: bucket[0]._id,
                'crawlerLogs.crawlId': crawlerLog.crawlId,
            }, {
                $set: {
                    'crawlerLogs.$': crawlerLog
                }
            });

            if (updateResult.modifiedCount === 0) {
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

function getNewBucket(yearAndMonth) {
    return ({
        yearAndMonth: yearAndMonth,
        userCounts: [],
        crawlerLogs: [],
    });
}
