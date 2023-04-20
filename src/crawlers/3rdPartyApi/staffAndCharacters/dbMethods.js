import PQueue from 'p-queue';
import * as crawlerMethodsDB from "../../../data/db/crawlerMethodsDB.js";
import * as cloudStorage from "../../../data/cloudStorage.js";
import {updateStaffAndCharactersFields} from "./personCharacter.js";
import {saveError} from "../../../error/saveError.js";

export async function addImageToStaffAndCharacters(dataArray) {
    const promiseQueue = new PQueue({concurrency: 10});
    for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i].imageData) {
            continue;
        }
        if (dataArray[i].originalImages.length > 0) {
            promiseQueue.add(() => cloudStorage.uploadCastImageToS3ByURl(
                dataArray[i].name, dataArray[i].tvmazePersonID, dataArray[i].jikanPersonID,
                dataArray[i].originalImages[0]).then(s3ImageData => {
                dataArray[i].updateFlag = true;
                dataArray[i].imageData = s3ImageData;
            }));
        }
    }
    await promiseQueue.onIdle();
    return dataArray;
}

export async function fetchDataFromDB(staff_characters, type) {
    const promiseQueue = new PQueue({concurrency: 30});
    for (let i = 0; i < staff_characters.length; i++) {
        promiseQueue.add(() => crawlerMethodsDB.searchStaffAndCharactersDB(
            type,
            staff_characters[i].name,
            staff_characters[i].tvmazePersonID,
            staff_characters[i].jikanPersonID
        ).then(searchResult => {
            if (!searchResult) {
                //new staff/character
                staff_characters[i].insertFlag = true;
                staff_characters[i].updateFlag = true;
            } else {
                let fieldsUpdateResult = updateStaffAndCharactersFields(searchResult, staff_characters[i]);
                staff_characters[i] = fieldsUpdateResult.fields;
                staff_characters[i].insertFlag = false;
                staff_characters[i].updateFlag = fieldsUpdateResult.isUpdated;
            }
        })).catch(error => saveError(error));
    }
    await promiseQueue.onIdle();
    return staff_characters;
}

export async function insertData(staff, characters) {
    const promiseQueue = new PQueue({concurrency: 30});

    for (let i = 0; i < staff.length; i++) {
        let insertFlag = staff[i].insertFlag;
        delete staff[i].insertFlag;
        if (insertFlag) {
            delete staff[i].updateFlag;
            promiseQueue.add(() => crawlerMethodsDB.insertToDB('staff', staff[i]).then(insertedId => {
                if (insertedId) {
                    staff[i]._id = insertedId;
                }
            }));
        }
    }

    for (let i = 0; i < characters.length; i++) {
        let insertFlag = characters[i].insertFlag;
        delete characters[i].insertFlag;
        if (insertFlag) {
            delete characters[i].updateFlag;
            promiseQueue.add(() => crawlerMethodsDB.insertToDB('characters', characters[i]).then(insertedId => {
                if (insertedId) {
                    characters[i]._id = insertedId;
                }
            }));
        }
    }

    await promiseQueue.onIdle();
    return {staff, characters};
}

export async function updateData(staff, characters) {
    const promiseQueue = new PQueue({concurrency: 30});
    for (let i = 0; i < staff.length; i++) {
        let updateFlag = staff[i].updateFlag;
        delete staff[i].updateFlag;
        delete staff[i].insert_date;
        delete staff[i].userStats;
        if (updateFlag) {
            staff[i].update_date = new Date();
            promiseQueue.add(() => crawlerMethodsDB.updateByIdDB('staff', staff[i]._id, staff[i]));
        }
    }
    for (let i = 0; i < characters.length; i++) {
        let updateFlag = characters[i].updateFlag;
        delete characters[i].updateFlag;
        delete characters[i].insert_date;
        delete characters[i].userStats;
        if (updateFlag) {
            characters[i].update_date = new Date();
            promiseQueue.add(() => crawlerMethodsDB.updateByIdDB('characters', characters[i]._id, characters[i]));
        }
    }
    await promiseQueue.onIdle();
    return {staff, characters};
}
