import mongodb from "mongodb";
import getCollection from "../mongoDB.js";
import * as lookupDbMethods from "./lookupDbMethods.js";
import * as userStatsDbMethods from "./userStatsDbMethods.js";
import {userStats_staff} from "../../models/person.js";
import {saveError} from "../../error/saveError.js";


export async function getTodayStaffOrCharactersBirthday(collectionName, userId, skip, limit, projection, dontLookupUserStats) {
    try {
        let collection = await getCollection(collectionName);

        let now = new Date();
        let monthAndDay = '-' + (now.getMonth() + 1) + '-' + now.getDate();
        monthAndDay = monthAndDay
            .replace(/-\d(-|$)/g, r => r.replace('-', '-0'))
            .replace(/-\d(-|$)/g, r => r.replace('-', '-0'));
        let aggregationPipeline = [
            {
                $match: {
                    birthday: new RegExp(monthAndDay),
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...lookupDbMethods.getLookupOnUserStatsStage(userId, collectionName, dontLookupUserStats),
        ];

        if (Object.keys(projection).length > 0) {
            aggregationPipeline.push({
                $project: projection,
            });
        }

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function getFollowedStaffTodayBirthday(userId, skip, limit, projection) {
    try {
        let collection = await getCollection('userStats');

        let now = new Date();
        let monthAndDay = '-' + (now.getMonth() + 1) + '-' + now.getDate();
        monthAndDay = monthAndDay
            .replace(/-\d(-|$)/g, r => r.replace('-', '-0'))
            .replace(/-\d(-|$)/g, r => r.replace('-', '-0'));

        //--------------------------------------
        let stats = Object.keys((projection && projection.userStats) || userStats_staff);
        //--------------------------------------
        let newProjection = {...projection};
        if (Object.keys(newProjection).length > 0 && Object.values(newProjection).every(item => item !== 0)) {
            newProjection.birthday = 1;
        }
        //--------------------------------------

        let aggregationPipeline = [
            {
                $match: {
                    userId: new mongodb.ObjectId(userId),
                }
            },
            {
                $sort: {
                    pageNumber: -1
                }
            },
            {
                $unwind: `$follow_staff`,
            },
            lookupDbMethods.getLookupOnCustomCollectionStage('staff', 'follow_staff', newProjection),
            {
                $addFields: {
                    data: {$arrayElemAt: ['$data', 0]},
                }
            },
            {
                $match: {
                    'data.birthday': new RegExp(monthAndDay),
                }
            },
            userStatsDbMethods.userStatsList_addFieldsPipeline(stats, 'follow_staff', '$data._id'),
            {
                $replaceRoot: {
                    newRoot: "$data",
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
        ];

        return await collection.aggregate(aggregationPipeline).toArray();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
