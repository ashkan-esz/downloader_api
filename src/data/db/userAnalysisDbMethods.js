import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";


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

export async function saveTotalAndActiveUsersCount(counts) {
    try {
        let collection = await getCollection('userAnalysis');
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
            await collection.insertOne({
                yearAndMonth: yearAndMonth,
                userCounts: [{
                    total: counts.total,
                    active: counts.active,
                    date: now,
                }],
            });
        }
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getUserCountsInTimes(startTime, endTime, skip, limit) {
    try {
        let collection = await getCollection('userAnalysis');

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
