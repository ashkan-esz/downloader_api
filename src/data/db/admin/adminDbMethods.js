import getCollection from "../../mongoDB.js";
import {saveError} from "../../../error/saveError.js";

export async function getDuplicateTitles(preCheck = true) {
    try {
        let collection = await getCollection('movies');
        let duplicateTitles = await collection.aggregate([
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
                    add_dates: 1,
                    sources: 1,
                    ids: 1,
                }
            }
        ]).toArray();
        if (preCheck) {
            return duplicateTitles.filter(item => preCheckDuplicateTitle(item));
        }
        return duplicateTitles;
    } catch (error) {
        saveError(error);
        return [];
    }
}

export function preCheckDuplicateTitle(res) {
    let sameYearAndType = false;
    ss: for (let j = 0; j < res.years.length - 1; j++) {
        for (let k = j + 1; k < res.years.length; k++) {
            if (
                res.years[j] === res.years[k] &&
                res.types[j].replace('anime_', '') === res.types[k].replace('anime_', '')
            ) {
                sameYearAndType = true;
                break ss;
            }
        }
    }

    let mismatchYearAndEndYear = false;
    for (let j = 0; j < res.years.length - 1; j++) {
        if (
            (res.years[j] !== res.premiered[j].split('-')[0] || res.years[j] !== res.endYear[j]) &&
            res.types[j].includes('movie')) {
            mismatchYearAndEndYear = true;
            break;
        }
    }

    let yearMismatch = false;
    for (let j = 0; j < res.years.length - 1; j++) {
        if (
            (res.premiered[j] && res.years[j] > res.premiered[j].split('-')[0]) ||
            (res.endYear[j] && res.years[j] > res.endYear[j])
        ) {
            yearMismatch = true;
            break;
        }
    }

    return (sameYearAndType || mismatchYearAndEndYear || yearMismatch);
}
