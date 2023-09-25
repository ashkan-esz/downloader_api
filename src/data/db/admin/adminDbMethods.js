import mongodb from "mongodb";
import getCollection from "../../mongoDB.js";
import PQueue from 'p-queue';
import {removeDuplicateElements} from "../../../crawlers/utils/utils.js";
import {saveError} from "../../../error/saveError.js";

export async function getDuplicateTitles() {
    try {
        let collection = await getCollection('movies');
        return await collection.aggregate([
            {
                $sort: {
                    year: -1,
                    insert_date: -1,
                }
            },
            {
                $group: {
                    _id: "$title",
                    count: {"$sum": 1},
                    types: {$push: "$type"},
                    years: {$push: "$year"},
                    premiered: {$push: "$premiered"},
                    endYear: {$push: "$endYear"},
                    posters: {$first: "$posters"},
                    add_dates: {$push: "$add_date"},
                    sources: {$push: "$sources"},
                    ids: {$push: "$_id"},
                }
            },
            {
                $match: {
                    _id: {"$ne": null},
                    count: {"$gt": 1}
                }
            },
            {
                $sort: {count: -1}
            },
            {
                $project: {
                    title: "$_id",
                    _id: 0,
                    count: 1,
                    types: 1,
                    years: 1,
                    premiered: 1,
                    endYear: 1,
                    posters: 1,
                    add_dates: 1,
                    sources: 1,
                    ids: 1,
                }
            }
        ]).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getDuplicateStaffOrCharacter(collectionName) {
    try {
        let collection = await getCollection(collectionName);
        return await collection.aggregate([
            {
                $group: {
                    _id: {name: "$name", tvmazePersonID: "$tvmazePersonID", jikanPersonID: "$jikanPersonID"},
                    count: {"$sum": 1},
                    rawNames: {$push: "$rawName"},
                    insert_dates: {$push: "$insert_date"},
                    update_dates: {$push: "$update_date"},
                    ids: {$push: "$_id"},
                }
            },
            {
                $match: {
                    _id: {"$ne": null},
                    count: {"$gt": 1}
                }
            },
            {
                $sort: {count: -1}
            },
            {
                $project: {
                    name: "$_id",
                    _id: 0,
                    count: 1,
                    rawNames: 1,
                    insert_dates: 1,
                    update_dates: 1,
                    ids: 1,
                }
            }
        ]).toArray();
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function handleDuplicateTitles(res) {
    let moviesCollection = await getCollection('movies');
    let counter = 0;
    for (let i = 0; i < res.length; i++) {
        delete res[i].posters;
        //-------------------
        let sameYearAndType = false;
        ss: for (let j = 0; j < res[i].years.length - 1; j++) {
            for (let k = j + 1; k < res[i].years.length; k++) {
                if (
                    res[i].years[j] === res[i].years[k] &&
                    res[i].types[j].replace('anime_', '') === res[i].types[k].replace('anime_', '')
                ) {
                    sameYearAndType = true;
                    break ss;
                }
            }
        }

        let mismatchYearAndEndYear = false;
        for (let j = 0; j < res[i].years.length - 1; j++) {
            if (
                (res[i].years[j] !== res[i].premiered[j].split('-')[0] || res[i].years[j] !== res[i].endYear[j]) &&
                res[i].types[j].includes('movie')) {
                mismatchYearAndEndYear = true;
                break;
            }
        }

        let yearMismatch = false;
        for (let j = 0; j < res[i].years.length - 1; j++) {
            if (
                (res[i].premiered[j] && res[i].years[j] > res[i].premiered[j].split('-')[0]) ||
                (res[i].endYear[j] && res[i].years[j] > res[i].endYear[j])
            ) {
                yearMismatch = true;
                break;
            }
        }

        if (sameYearAndType || mismatchYearAndEndYear || yearMismatch) {
            counter++;
            // console.log(res[i], sameYearAndType, mismatchYearAndEndYear, yearMismatch);
            await moviesCollection.deleteMany({title: res[i].title});
        }
    }
    return counter;
}
