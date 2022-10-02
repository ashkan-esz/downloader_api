import mongodb from "mongodb";
import {userStats} from "../../models/movie.js";
import {userStats_staff} from "../../models/person.js";
import {userStats_character} from "../../models/character.js";

export function getLookupOnCustomCollectionStage(collectionName, localField, projection) {
    //used in getting user stats list
    let lookupConfig = {
        $lookup: {
            from: collectionName,
            localField: localField,
            foreignField: '_id',
            pipeline: [
                {$limit: 1}
            ],
            as: 'data',
        }
    }
    if (projection && Object.keys(projection).length > 0) {
        lookupConfig['$lookup']['pipeline'].push({$project: projection});
    }
    return lookupConfig;
}

export function getLookupOnUserStatsStage(userId, collectionName) {
    //----------------------
    let {defaultFieldValues, projection} = getDefaultFieldValuesAndProjection(collectionName);
    //----------------------
    let stats = Object.keys({...defaultFieldValues});
    let checkStatArray = [];
    let addStatFieldsArray = {
        $addFields: {}
    };
    for (let i = 0; i < stats.length; i++) {
        let stat = stats[i];
        checkStatArray.push({
            $in: ["$$movieId", `$${stat}`]
        });
        addStatFieldsArray["$addFields"][stat] = {
            $cond: [{$in: ["$$movieId", `$${stat}`]}, true, false]
        }
    }
    //----------------------
    return [
        {
            $lookup: {
                let: {movieId: "$_id"},
                from: 'userStats',
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {$eq: ["$userId", new mongodb.ObjectId(userId)]},
                                    {$or: checkStatArray},
                                ],
                            }
                        }
                    },
                    addStatFieldsArray,
                    {
                        $project: projection,
                    },
                    {$limit: 1}
                ],
                as: 'userStats2',
            }
        },
        {
            $addFields: {
                userStats: {
                    $mergeObjects: [defaultFieldValues, {$arrayElemAt: ['$userStats2', 0]}, '$userStats']
                }
            }
        },
        {
            $project: {
                userStats2: 0,
            }
        }
    ];
}

function getDefaultFieldValuesAndProjection(collectionName) {
    let defaultFieldValues; //booleans --> all false
    let projection;
    if (collectionName.includes('staff')) {
        defaultFieldValues = {...userStats_staff};
        projection = {...userStats, ...userStats_character};
    } else if (collectionName.includes('character')) {
        defaultFieldValues = {...userStats_character};
        projection = {...userStats, ...userStats_staff};
    } else {
        defaultFieldValues = {...userStats};
        projection = {...userStats_staff, ...userStats_character};
    }

    let defaultKeys = Object.keys(defaultFieldValues);
    for (let i = 0; i < defaultKeys.length; i++) {
        let temp = defaultKeys[i].replace('_count', '');
        defaultFieldValues[temp] = false;
        let temp2 = defaultKeys[i].replace('_count', '_full');
        projection[temp2] = 0;
        delete defaultFieldValues[defaultKeys[i]];
    }

    let projectionKeys = Object.keys(projection);
    for (let i = 0; i < projectionKeys.length; i++) {
        let temp = projectionKeys[i].replace('_count', '');
        projection[temp] = 0;
        let temp2 = projectionKeys[i].replace('_count', '_full');
        projection[temp2] = 0;
    }
    projection._id = 0;
    projection.userId = 0;
    projection.pageNumber = 0;

    return {defaultFieldValues, projection};
}
