import * as utils from "../../utils.js";
import {getCharacterInfo, getCharactersStaff, getPersonInfo} from "../jikanApi.js";
import {getPersonModel} from "../../../models/person.js";
import {getCharacterModel} from "../../../models/character.js";
import isEqual from 'lodash.isequal';
import isEmpty from 'lodash.isempty';
import {default as pQueue} from "p-queue";
import {extractStaffDataFromJikanAbout} from "../extractDataFields.js";
import {saveError} from "../../../error/saveError.js";
import {
    addImageToStaffAndCharacters,
    fetchDataFromDB,
    insertData,
    updateData
} from "./dbMethods.js";

const maxStaffOrCharacterSize = 30;

export async function addStaffAndCharacters(movieID, movieName, movieType, moviePoster, movieThumbnail, allApiData, castUpdateDate) {
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
            } = getTvMazeActorsAndCharacters(movieID, movieName, movieType, moviePoster, movieThumbnail, tvmazeApiFields.cast);
            staff = tvmazeActors;
            characters = tvmazeCharacters;
        }

        if (jikanApiFields) {
            let jikanCharatersStaff = await getCharactersStaff(jikanApiFields.jikanID);
            if (jikanCharatersStaff) {
                let jikanStaff = await getJikanStaff(movieID, movieName, movieType, moviePoster, movieThumbnail, jikanCharatersStaff.staff, staff);
                staff = [...staff, ...jikanStaff];
                let jikanVoiceActors = await getJikanStaff_voiceActors(movieID, movieName, movieType, moviePoster, movieThumbnail, jikanCharatersStaff.characters, staff);
                staff = [...staff, ...jikanVoiceActors];
                let jikanCharacters = await getJikanCharaters(movieID, movieName, movieType, moviePoster, movieThumbnail, jikanCharatersStaff.characters, characters);
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

//-----------------------------------------------------
//-----------------------------------------------------

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
                            thumbnail: character.imageData ? character.imageData.thumbnail : '',
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
                    thumbnail: staff[i].imageData ? staff[i].imageData.thumbnail : '',
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
                thumbnail: '',
                positions: ['Voice Actor'],
                characterData: {
                    id: characters[i]._id,
                    name: characters[i].rawName,
                    gender: characters[i].gender,
                    image: characters[i].imageData ? characters[i].imageData.url : '',
                    thumbnail: characters[i].imageData ? characters[i].imageData.thumbnail : '',
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
            thumbnail: '',
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
            thumbnail: '',
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
                thumbnail: '',
                positions: ['Actor'],
                characterData: null,
            });
        }
    }
    return staffAndCharactersData;
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
                    //---------------------------------------------
                    let characterImage = thisCharacter.imageData ? thisCharacter.imageData.url : '';
                    if (!isEqual(thisCredit.characterImage, characterImage) && isTrulyValue(characterImage)) {
                        thisCredit.characterImage = characterImage;
                        staff[i].updateFlag = true;
                    }
                    //---------------------------------------------
                    let characterThumbnail = thisCharacter.imageData ? thisCharacter.imageData.thumbnail : '';
                    if (!isEqual(thisCredit.characterThumbnail, characterThumbnail) && isTrulyValue(characterThumbnail)) {
                        thisCredit.characterThumbnail = characterThumbnail;
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
                    //---------------------------------------------
                    let actorImage = thisStaff.imageData ? thisStaff.imageData.url : '';
                    if (!isEqual(thisCredit.actorImage, actorImage) && isTrulyValue(actorImage)) {
                        thisCredit.actorImage = actorImage;
                        characters[i].updateFlag = true;
                    }
                    //---------------------------------------------
                    let actorThumbnail = thisStaff.imageData ? thisStaff.imageData.thumbnail : '';
                    if (!isEqual(thisCredit.actorThumbnail, actorThumbnail) && isTrulyValue(actorThumbnail)) {
                        thisCredit.actorThumbnail = actorThumbnail;
                        characters[i].updateFlag = true;
                    }
                }
            }
        }
    }
    return {staff, characters};
}

//-----------------------------------------------------
//-----------------------------------------------------

function getTvMazeActorsAndCharacters(movieID, movieName, movieType, moviePoster, movieThumbnail, tvmazeCast) {
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
            tvmazeCast[i].person.name, tvmazeCast[i].person.gender?.toLowerCase() || '', '',
            tvmazeCast[i].person.id, 0,
            countryName, birthday, deathday, age,
            '', '', '', '',
            originalImages,
            movieID, movieName, movieType, moviePoster, movieThumbnail, positions, tvmazeCast[i].character.name, ''
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
            movieID, movieName, movieType, moviePoster, movieThumbnail, '', tvmazeCast[i].person.name,
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

//-----------------------------------------------------
//-----------------------------------------------------

async function getJikanStaff_voiceActors(movieID, movieName, movieType, moviePoster, movieThumbnail, jikanCharactersArray, staff) {
    let voiceActors = [];
    for (let i = 0; i < jikanCharactersArray.length; i++) {
        let thisCharacterVoiceActors = jikanCharactersArray[i].voice_actors;
        for (let j = 0; j < thisCharacterVoiceActors.length; j++) {
            if (thisCharacterVoiceActors[j].language.toLowerCase() === 'japanese') {
                thisCharacterVoiceActors[j].positions = ['Voice Actor'];
                thisCharacterVoiceActors[j].characterName = jikanCharactersArray[i].character.name.split(',').map(item => item.trim()).reverse().join(' ');
                thisCharacterVoiceActors[j].characterRole = jikanCharactersArray[i].role;
                voiceActors.push(thisCharacterVoiceActors[j]);
            }
        }
    }
    return await getJikanStaff(movieID, movieName, movieType, moviePoster, movieThumbnail, voiceActors, staff);
}

async function getJikanStaff(movieID, movieName, movieType, moviePoster, movieThumbnail, jikanStaffArray, staff) {
    const promiseQueue = new pQueue.default({concurrency: 5});
    let result = [];
    for (let i = 0; i < jikanStaffArray.length && i < maxStaffOrCharacterSize; i++) {
        promiseQueue.add(() => getPersonInfo(jikanStaffArray[i].person.mal_id).then(staffApiData => {
            if (staffApiData) {
                let newStaff = makeNewStaffOrCharacterFromJikanData(
                    movieID, movieName, movieType, moviePoster, movieThumbnail,
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

async function getJikanCharaters(movieID, movieName, movieType, moviePoster, movieThumbnail, jikanCharatersArray, characters) {
    const promiseQueue = new pQueue.default({concurrency: 5});
    let result = [];
    for (let i = 0; i < jikanCharatersArray.length && i < maxStaffOrCharacterSize; i++) {
        promiseQueue.add(() => getCharacterInfo(jikanCharatersArray[i].character.mal_id).then(characterApiData => {
            if (characterApiData) {
                let newCharacter = makeNewStaffOrCharacterFromJikanData(
                    movieID, movieName, movieType, moviePoster, movieThumbnail,
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

//-----------------------------------------------------
//-----------------------------------------------------

function makeNewStaffOrCharacterFromJikanData(movieID, movieName, movieType, moviePoster, movieThumbnail, SemiData, fullApiData, type) {
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

    let originalImages = [];
    if (fullApiData.images) {
        if (fullApiData.images.webp) {
            let imageUrl = fullApiData.images.webp.image_url;
            if (imageUrl && !imageUrl.includes('/icon/')) {
                originalImages.push(imageUrl);
            }
        }
        if (fullApiData.images.jpg) {
            let imageUrl = fullApiData.images.jpg.image_url;
            if (imageUrl && !imageUrl.includes('/icon/')) {
                originalImages.push(imageUrl);
            }
        }
    }

    if (type === 'staff') {
        return getPersonModel(
            fullApiData.name, gender, fullApiData.about,
            0, fullApiData.mal_id,
            country, birthday, deathday, age,
            height, weight, hairColor, eyeColor,
            originalImages,
            movieID, movieName, movieType, moviePoster, movieThumbnail, SemiData.positions,
            (SemiData.characterName || ''), (SemiData.characterRole || '')
        );
    } else {
        let voiceActors = SemiData.voice_actors;
        let actorName = '';
        for (let j = 0; j < voiceActors.length; j++) {
            if (voiceActors[j].language.toLowerCase() === 'japanese') {
                actorName = voiceActors[j].person.name.split(',').map(item => item.trim()).reverse().join(' ');
                break;
            }
        }
        return getCharacterModel(
            fullApiData.name, gender, fullApiData.about,
            0, fullApiData.mal_id,
            country, birthday, deathday, age,
            height, weight, hairColor, eyeColor,
            originalImages,
            movieID, movieName, movieType, moviePoster, movieThumbnail, SemiData.role, actorName,
        );
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

export function updateStaffAndCharactersFields(prevFields, currentFields) {
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
                    let mergedImages = utils.removeDuplicateElements([...prevFields.originalImages, ...currentFields.originalImages]);
                    if (prevFields.originalImages.length !== mergedImages.length) {
                        isUpdated = true;
                        newFields.originalImages = mergedImages;
                    } else {
                        for (let j = 0; j < mergedImages; j++) {
                            if (!prevFields.originalImages.includes(mergedImages[j])) {
                                isUpdated = true;
                                newFields.originalImages = mergedImages;
                                break;
                            }
                        }
                    }
                } else {
                    newFields[keys[i]] = currentFields[keys[i]];
                    isUpdated = true;
                }
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
