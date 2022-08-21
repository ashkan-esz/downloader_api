import * as crawlerMethodsDB from "../../data/db/crawlerMethodsDB.js";
import * as cloudStorage from "../../data/cloudStorage.js";
import * as utils from "../utils.js";
import {getCharacterInfo, getCharactersStaff, getPersonInfo} from "./jikanApi.js";
import {getPersonModel} from "../../models/person.js";
import {getCharacterModel} from "../../models/character.js";
import isEqual from 'lodash.isequal';
import isEmpty from 'lodash.isempty';
import {default as pQueue} from "p-queue";
import {extractStaffDataFromJikanAbout} from "./extractDataFields.js";
import {saveError} from "../../error/saveError.js";

const maxStaffOrCharacterSize = 30;

export async function addStaffAndCharacters(movieID, movieName, movieType, moviePoster, allApiData, castUpdateDate) {
    if (utils.getDatesBetween(new Date(), new Date(castUpdateDate)).days < 30) {
        return null;
    }

    try {
        let {omdbApiFields, tvmazeApiFields, jikanApiFields} = allApiData;
        let staff = [];
        let characters = [];

        if (tvmazeApiFields) {
            let {
                tvmazeActors,
                tvmazeCharacters
            } = getTvMazeActorsAndCharacters(movieID, movieName, movieType, moviePoster, tvmazeApiFields.cast);
            staff = tvmazeActors;
            characters = tvmazeCharacters;
        }

        if (jikanApiFields) {
            let jikanCharatersStaff = await getCharactersStaff(jikanApiFields.jikanID);
            if (jikanCharatersStaff) {
                let jikanStaff = await getJikanStaff(movieID, movieName, movieType, moviePoster, jikanCharatersStaff.staff, staff);
                let jikanVoiceActors = await getJikanStaff_voiceActors(movieID, movieName, movieType, moviePoster, jikanCharatersStaff.characters, staff);
                let jikanCharacters = await getJikanCharaters(movieID, movieName, movieType, moviePoster, jikanCharatersStaff.characters, characters);
                staff = [...staff, ...jikanStaff, ...jikanVoiceActors];
                characters = [...characters, ...jikanCharacters];
            }
        }

        staff = await fetchDataFromDB(staff, 'staff');
        characters = await fetchDataFromDB(characters, 'characters');

        staff = await addImageToStaffAndCharacters(staff);
        characters = await addImageToStaffAndCharacters(characters);

        ({staff, characters} = await insertData(staff, characters));

        ({staff, characters} = embedStaffAndCharacters(movieID, staff, characters));

        ({staff, characters} = await updateData(staff, characters));

        let staffAndCharactersData = getStaffAndCharactersData(staff, characters, movieID);
        if (omdbApiFields) {
            staffAndCharactersData = addOmdbApiData(staffAndCharactersData, omdbApiFields, tvmazeApiFields);
        }
        return extractActorsCharactersAndStaff(staffAndCharactersData);
    } catch (error) {
        saveError(error);
        return null;
    }
}

function extractActorsCharactersAndStaff(staffAndCharacters) {
    let actorsAndCharacters = [];
    let staff = {
        directors: [],
        writers: [],
        others: [],
    };

    for (let i = 0; i < staffAndCharacters.length; i++) {
        let positions = staffAndCharacters[i].positions.map(item => item.toLowerCase()).join(' , ');
        if (positions.includes('actor') || positions.includes('voice actor')) {
            actorsAndCharacters.push(staffAndCharacters[i]);
        } else if (positions.includes('director')) {
            staff.directors.push(staffAndCharacters[i]);
        } else if (positions.includes('writer')) {
            staff.writers.push(staffAndCharacters[i]);
        } else {
            staff.others.push(staffAndCharacters[i]);
        }
    }
    return {
        actorsAndCharacters,
        staff,
    };
}

function getStaffAndCharactersData(staff, characters, movieID) {
    let result = [];
    for (let i = 0; i < staff.length; i++) {
        for (let j = 0; j < staff[i].credits.length; j++) {
            let thisMovieCredit = staff[i].credits[j];
            if (thisMovieCredit.movieID.toString() === movieID.toString()) {
                let characterData = null;
                if (thisMovieCredit.characterName) {
                    let character = characters.find(char => char.rawName === thisMovieCredit.characterName);
                    if (character) {
                        characterData = {
                            id: character._id,
                            name: character.rawName,
                            gender: character.gender,
                            image: character.imageData ? character.imageData.url : '',
                            role: character.credits.find(x => x.movieID.toString() === movieID.toString()).role,
                        }
                    }
                }

                result.push({
                    id: staff[i]._id,
                    name: staff[i].rawName,
                    gender: staff[i].gender,
                    country: staff[i].country,
                    image: staff[i].imageData ? staff[i].imageData.url : '',
                    positions: thisMovieCredit.positions,
                    characterData: characterData,
                });
            }
        }
    }

    for (let i = 0; i < characters.length; i++) {
        if (!result.find(item => item.characterData && item.characterData.name === characters[i].rawName)) {
            result.push({
                id: '',
                name: '',
                gender: '',
                country: '',
                image: '',
                positions: ['Voice Actor'],
                characterData: {
                    id: characters[i]._id,
                    name: characters[i].rawName,
                    gender: characters[i].gender,
                    image: characters[i].imageData ? characters[i].imageData.url : '',
                    role: characters[i].credits.find(x => x.movieID.toString() === movieID.toString()).role,
                },
            });
        }
    }

    return result;
}

function addOmdbApiData(staffAndCharactersData, omdbApiFields, tvmazeApiFields) {
    for (let i = 0; i < omdbApiFields.directorsNames.length; i++) {
        staffAndCharactersData.push({
            _id: '',
            name: omdbApiFields.directorsNames[i],
            gender: '',
            country: '',
            image: '',
            positions: ['Director'],
            characterData: null,
        });
    }
    for (let i = 0; i < omdbApiFields.writersNames.length; i++) {
        staffAndCharactersData.push({
            _id: '',
            name: omdbApiFields.writersNames[i],
            gender: '',
            country: '',
            image: '',
            positions: ['Writer'],
            characterData: null,
        });
    }
    if (!tvmazeApiFields) {
        for (let i = 0; i < omdbApiFields.actorsNames.length; i++) {
            staffAndCharactersData.push({
                _id: '',
                name: omdbApiFields.actorsNames[i],
                gender: '',
                country: '',
                image: '',
                positions: ['Actor'],
                characterData: null,
            });
        }
    }
    return staffAndCharactersData;
}

async function addImageToStaffAndCharacters(dataArray) {
    const promiseQueue = new pQueue.default({concurrency: 10});
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

async function fetchDataFromDB(staff_characters, type) {
    const promiseQueue = new pQueue.default({concurrency: 30});
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

async function insertData(staff, characters) {
    const promiseQueue = new pQueue.default({concurrency: 30});

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

async function updateData(staff, characters) {
    const promiseQueue = new pQueue.default({concurrency: 30});
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

function embedStaffAndCharacters(movieID, staff, characters) {
    for (let i = 0; i < staff.length; i++) {
        for (let j = 0; j < staff[i].credits.length; j++) {
            let thisCredit = staff[i].credits[j];
            if (thisCredit.movieID.toString() === movieID.toString()) {
                let thisCharacter = characters.find(x => x.rawName === thisCredit.characterName);
                if (thisCharacter) {
                    //update/set characterId and characterImage of staff credit
                    if (!isEqual(thisCredit.characterID, thisCharacter._id) && thisCharacter._id) {
                        thisCredit.characterID = thisCharacter._id;
                        staff[i].updateFlag = true;
                    }
                    let temp = thisCharacter.imageData ? thisCharacter.imageData.url : '';
                    if (!isEqual(thisCredit.characterImage, temp) && isTrulyValue(temp)) {
                        thisCredit.characterImage = temp;
                        staff[i].updateFlag = true;
                    }
                }
            }
        }
    }

    for (let i = 0; i < characters.length; i++) {
        for (let j = 0; j < characters[i].credits.length; j++) {
            let thisCredit = characters[i].credits[j];
            if (thisCredit.movieID.toString() === movieID.toString()) {
                let thisStaff = staff.find(x => x.rawName === thisCredit.actorName);
                if (thisStaff) {
                    //update/set actorId and actorImage of character credit
                    if (!isEqual(thisCredit.actorID, thisStaff._id) && thisStaff._id) {
                        thisCredit.actorID = thisStaff._id;
                        characters[i].updateFlag = true;
                    }
                    let temp = thisStaff.imageData ? thisStaff.imageData.url : '';
                    if (!isEqual(thisCredit.actorImage, temp) && isTrulyValue(temp)) {
                        thisCredit.actorImage = temp;
                        characters[i].updateFlag = true;
                    }
                }
            }
        }
    }
    return {staff, characters};
}

function getTvMazeActorsAndCharacters(movieID, movieName, movieType, moviePoster, tvmazeCast) {
    let tvmazeActors = [];
    for (let i = 0; i < tvmazeCast.length; i++) {
        let countryName = tvmazeCast[i].person.country ? tvmazeCast[i].person.country.name.toLowerCase() : '';
        let originalImages = tvmazeCast[i].person.image ? [tvmazeCast[i].person.image.medium, tvmazeCast[i].person.image.original] : [];
        let positions = tvmazeCast[i].voice ? ['Voice Actor'] : ['Actor'];
        let birthday = tvmazeCast[i].person.birthday;
        let deathday = tvmazeCast[i].person.deathday;
        let age = 0;
        if (birthday && deathday === null) {
            let birthYear = Number(birthday.split('-')[0]);
            let currentYear = new Date().getFullYear();
            age = currentYear - birthYear;
        }
        let newStaff = getPersonModel(
            tvmazeCast[i].person.name, tvmazeCast[i].person.gender.toLowerCase(), '',
            tvmazeCast[i].person.id, 0,
            countryName, birthday, deathday, age,
            '', '', '', '',
            originalImages,
            movieID, movieName, movieType, moviePoster, positions, tvmazeCast[i].character.name, ''
        );
        //one actor play as multiple character
        let findExistingStaff = tvmazeActors.find(item => item.name === newStaff.name);
        if (findExistingStaff) {
            findExistingStaff.credits.push(newStaff.credits[0]);
        } else {
            tvmazeActors.push(newStaff);
        }
    }

    let tvmazeCharacters = [];
    for (let i = 0; i < tvmazeCast.length; i++) {
        let originalImages = [];
        if (tvmazeCast[i].character.image) {
            originalImages = [tvmazeCast[i].character.image.medium, tvmazeCast[i].character.image.original];
        }
        let newCharacter = getCharacterModel(
            tvmazeCast[i].character.name, '', '',
            tvmazeCast[i].character.id, 0,
            '', '', '', 0,
            '', '', '', '',
            originalImages,
            movieID, movieName, movieType, moviePoster, '', tvmazeCast[i].person.name,
        );
        //one character mey have separate voice actor and actor
        let findExistingCharacter = tvmazeCharacters.find(item => item.name === newCharacter.name);
        if (findExistingCharacter) {
            findExistingCharacter.credits.push(newCharacter.credits[0]);
        } else {
            tvmazeCharacters.push(newCharacter);
        }
    }
    return {tvmazeActors, tvmazeCharacters};
}

async function getJikanStaff_voiceActors(movieID, movieName, movieType, moviePoster, jikanCharactersArray, staff) {
    let voiceActors = [];
    for (let i = 0; i < jikanCharactersArray.length; i++) {
        let thisCharacterVoiceActors = jikanCharactersArray[i].voice_actors;
        for (let j = 0; j < thisCharacterVoiceActors.length; j++) {
            if (thisCharacterVoiceActors[j].language.toLowerCase() === 'japanese') {
                thisCharacterVoiceActors[j].positions = ['Voice Actor'];
                thisCharacterVoiceActors[j].characterName = jikanCharactersArray[i].name.split(',').map(item => item.trim()).reverse().join(' ');
                thisCharacterVoiceActors[j].characterRole = jikanCharactersArray[i].role;
                voiceActors.push(thisCharacterVoiceActors[j]);
            }
        }
    }
    return await getJikanStaff(movieID, movieName, movieType, moviePoster, voiceActors, staff);
}

async function getJikanStaff(movieID, movieName, movieType, moviePoster, jikanStaffArray, staff) {
    const promiseQueue = new pQueue.default({concurrency: 5});
    let result = [];
    for (let i = 0; i < jikanStaffArray.length && i < maxStaffOrCharacterSize; i++) {
        promiseQueue.add(() => getPersonInfo(jikanStaffArray[i].mal_id).then(staffApiData => {
            if (staffApiData) {
                let newStaff = makeNewStaffOrCharacterFromJikanData(
                    movieID, movieName, movieType, moviePoster,
                    jikanStaffArray[i], staffApiData, 'staff'
                );
                //one actor play as multiple character
                let existingStaffIndex = staff.findIndex(item => item.name === newStaff.name);
                if (existingStaffIndex !== -1) {
                    //merge data
                    let fieldsUpdateResult = updateStaffAndCharactersFields(staff[existingStaffIndex], newStaff);
                    staff[existingStaffIndex] = fieldsUpdateResult.fields;
                } else {
                    existingStaffIndex = result.findIndex(item => item.name === newStaff.name);
                    if (existingStaffIndex !== -1) {
                        //merge data
                        let fieldsUpdateResult = updateStaffAndCharactersFields(result[existingStaffIndex], newStaff);
                        result[existingStaffIndex] = fieldsUpdateResult.fields;
                    } else {
                        result.push(newStaff);
                    }
                }
            }
        })).catch(error => saveError(error));
    }
    await promiseQueue.onIdle();
    return result;
}

async function getJikanCharaters(movieID, movieName, movieType, moviePoster, jikanCharatersArray, characters) {
    const promiseQueue = new pQueue.default({concurrency: 5});
    let result = [];
    for (let i = 0; i < jikanCharatersArray.length && i < maxStaffOrCharacterSize; i++) {
        promiseQueue.add(() => getCharacterInfo(jikanCharatersArray[i].mal_id).then(characterApiData => {
            if (characterApiData) {
                let newCharacter = makeNewStaffOrCharacterFromJikanData(
                    movieID, movieName, movieType, moviePoster,
                    jikanCharatersArray[i], characterApiData, 'character'
                );
                let existingCharacterIndex = characters.findIndex(item => item.name === newCharacter.name);
                if (existingCharacterIndex !== -1) {
                    //merge data
                    let fieldsUpdateResult = updateStaffAndCharactersFields(characters[existingCharacterIndex], newCharacter);
                    characters[existingCharacterIndex] = fieldsUpdateResult.fields;
                } else {
                    result.push(newCharacter);
                }
            }
        })).catch(error => saveError(error));
    }
    await promiseQueue.onIdle();
    return result;
}

function updateStaffAndCharactersFields(prevFields, currentFields) {
    try {
        let isUpdated = false;
        let newFields = {...prevFields};
        let keys = Object.keys(currentFields);
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] === 'userStats') {
                continue;
            }
            if (keys[i] === 'insertFlag' || keys[i] === 'updateFlag' ||
                keys[i] === 'insert_date' || keys[i] === 'update_date') {
                newFields[keys[i]] = currentFields[keys[i]];
                continue;
            }
            if (keys[i] === 'credits') {
                let creditUpdateResult = updateCredits(prevFields.credits, currentFields.credits);
                newFields.credits = creditUpdateResult.credits;
                isUpdated = isUpdated || creditUpdateResult.isUpdated;
            } else if (!isEqual(prevFields[keys[i]], currentFields[keys[i]]) && isTrulyValue(currentFields[keys[i]])) {
                if (keys[i] === 'originalImages') {
                    newFields.originalImages = utils.removeDuplicateElements([...prevFields.originalImages, ...currentFields.originalImages]);
                } else {
                    newFields[keys[i]] = currentFields[keys[i]];
                }
                isUpdated = true;
            }
        }
        return {fields: newFields, isUpdated};
    } catch (error) {
        saveError(error);
        return {fields: prevFields, isUpdated: false};
    }
}

function updateCredits(prevCredits, newCredits) {
    let isUpdated = false;
    let credits = [...prevCredits];
    let keys = Object.keys(newCredits[0]);
    for (let i = 0; i < newCredits.length; i++) {
        let exist = false;
        for (let j = 0; j < credits.length; j++) {
            if (
                credits[j].movieID.toString() === newCredits[i].movieID.toString() &&
                (
                    (credits[j].characterName === undefined || credits[j].characterName === newCredits[i].characterName) && // for staff
                    (credits[j].actorName === undefined || credits[j].actorName === newCredits[i].actorName) // for character
                )
            ) {
                for (let k = 0; k < keys.length; k++) {
                    if (!isEqual(credits[j][keys[k]], newCredits[i][keys[k]]) && isTrulyValue(newCredits[i][keys[k]])) {
                        credits[j][keys[k]] = newCredits[i][keys[k]];
                        isUpdated = true;
                    }
                }
                exist = true;
                break;
            }
        }
        if (!exist) {
            credits.push(newCredits[i]);
            isUpdated = true;
        }
    }
    return {credits, isUpdated};
}

function isTrulyValue(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value > 0;
    }
    return !isEmpty(value);
}

function makeNewStaffOrCharacterFromJikanData(movieID, movieName, movieType, moviePoster, SemiData, fullApiData, type) {
    let {
        height,
        weight,
        birthday,
        age,
        deathday,
        gender,
        hairColor,
        eyeColor,
        country
    } = extractStaffDataFromJikanAbout(fullApiData);
    let originalImage = fullApiData.image_url.includes('/icon/') ? '' : fullApiData.image_url;

    if (type === 'staff') {
        return getPersonModel(
            fullApiData.name, gender, fullApiData.about,
            0, fullApiData.mal_id,
            country, birthday, deathday, age,
            height, weight, hairColor, eyeColor,
            [originalImage],
            movieID, movieName, movieType, moviePoster, SemiData.positions,
            (SemiData.characterName || ''), (SemiData.characterRole || '')
        );
    } else {
        let voiceActors = SemiData.voice_actors;
        let actorName = '';
        for (let j = 0; j < voiceActors.length; j++) {
            if (voiceActors[j].language.toLowerCase() === 'japanese') {
                actorName = voiceActors[j].name.split(',').map(item => item.trim()).reverse().join(' ');
                break;
            }
        }
        return getCharacterModel(
            fullApiData.name, gender, fullApiData.about,
            0, fullApiData.mal_id,
            country, birthday, deathday, age,
            height, weight, hairColor, eyeColor,
            [originalImage],
            movieID, movieName, movieType, moviePoster, SemiData.role, actorName,
        );
    }
}
