const {searchStaffAndCharactersDB, insertToDB, updateByIdDB} = require('../../dbMethods');
const {uploadCastImageToS3ByURl} = require('../../cloudStorage');
const {getCharactersStaff, getPersonInfo, getCharacterInfo} = require('./jikanApi');
const {getPersonModel} = require('../models/person');
const {getCharacterModel} = require('../models/character');
const {replaceSpecialCharacters, removeDuplicateElements} = require('../utils');
const {saveError} = require('../../saveError');


export async function addStaffAndCharacters(movieID, movieName, moviePoster, allApiData, castUpdateDate) {
    let now = new Date();
    let apiUpdateDate = new Date(castUpdateDate);
    let daysBetween = (now.getTime() - apiUpdateDate.getTime()) / (24 * 3600 * 1000);
    if (daysBetween < 10) {
        return null;
    }

    try {
        let {omdbApiFields, tvmazeApiFields, jikanApiFields} = allApiData;
        let staff = [];
        let characters = [];

        if (tvmazeApiFields) {
            let tvmazeCast = tvmazeApiFields.cast;
            let {tvmazeActors, tvmazeCharacters} = getTvMazeActorsAndCharacters(movieID, tvmazeCast);
            staff = tvmazeActors;
            characters = tvmazeCharacters;
        }

        if (jikanApiFields) {
            let jikanCharatersStaff = await getCharactersStaff(jikanApiFields.updateFields.jikanID);
            if (jikanCharatersStaff) {
                let jikanStaff = await getJikanStaff(movieID, jikanCharatersStaff.staff);
                let jikanVoiceActors = await getJikanStaff_voiceActors(movieID, jikanCharatersStaff.characters);
                let jikanCharacters = await getJikanCharaters(movieID, jikanCharatersStaff.characters);
                staff = [...staff, ...jikanStaff, ...jikanVoiceActors];
                if (tvmazeApiFields) {
                    characters = mergeCharactersInfo(characters, jikanCharacters);
                } else {
                    characters = jikanCharacters;
                }
            }
        }

        characters = await addOrUpdateStaffOrCharacters(movieID, movieName, moviePoster, characters, 'characters', []);
        staff = await addOrUpdateStaffOrCharacters(movieID, movieName, moviePoster, staff, 'staff', characters);

        let staffAndCharactersData = getStaffAndCharactersData(staff, characters, movieID);
        if (omdbApiFields) {
            staffAndCharactersData = addOmdbApiData(staffAndCharactersData, omdbApiFields, tvmazeApiFields);
        }

        return staffAndCharactersData;
    } catch (error) {
        saveError(error);
        return null;
    }
}

function getStaffAndCharactersData(staff, characters, movieID) {
    return staff.map(item => {
        let thisMovieCredit = item.credits.find(x => x.movieID.toString() === movieID.toString());
        let characterData = null;
        if (thisMovieCredit.characterName) {
            let character = characters.find(char => char.name === thisMovieCredit.characterName);
            if (character) {
                characterData = {
                    name: character.name,
                    rawName: character.rawName,
                    gender: character.gender,
                    image: character.image,
                    role: character.credits.find(x => x.movieID.toString() === movieID.toString()).role,
                }
            }
        }

        return {
            name: item.name,
            rawName: item.rawName,
            gender: item.gender,
            country: item.country,
            image: item.image,
            positions: thisMovieCredit.positions,
            characterData: characterData,
        }
    });
}

function addOmdbApiData(staffAndCharactersData, omdbApiFields, tvmazeApiFields) {
    for (let i = 0; i < omdbApiFields.directorsNames.length; i++) {
        staffAndCharactersData.push({
            name: replaceSpecialCharacters(omdbApiFields.directorsNames[i].toLowerCase()),
            rawName: omdbApiFields.directorsNames[i],
            gender: '',
            country: '',
            image: '',
            positions: ['Director'],
            characterData: null,
        });
    }
    for (let i = 0; i < omdbApiFields.writersNames.length; i++) {
        staffAndCharactersData.push({
            name: replaceSpecialCharacters(omdbApiFields.writersNames[i].toLowerCase()),
            rawName: omdbApiFields.writersNames[i],
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
                name: replaceSpecialCharacters(omdbApiFields.actorsNames[i].toLowerCase()),
                rawName: omdbApiFields.actorsNames[i],
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

async function addOrUpdateStaffOrCharacters(movieID, movieName, moviePoster, staff_characters, type, characters) {
    let newStaffCharactersArray = [];
    let updateStaffCharactersArray = [];
    let promiseArray = [];
    for (let i = 0; i < staff_characters.length; i++) {
        let promise = searchStaffAndCharactersDB(type, staff_characters[i].name).then(searchResult => {
            if (!searchResult) {
                //new staff_character
                newStaffCharactersArray.push(staff_characters[i]);
            } else {
                let fieldsUpdateResult = updateStaffAndCharactersFields(searchResult, staff_characters[i], type);
                searchResult = fieldsUpdateResult.newFields;
                let creditUpdateResult = updateCredits(searchResult.credits, staff_characters[i].credits, type);
                searchResult.credits = creditUpdateResult.prevCredits;
                if (fieldsUpdateResult.fieldsUpdated || creditUpdateResult.creditsUpdated) {
                    staff_characters[i] = searchResult;
                    updateStaffCharactersArray.push(searchResult);
                }
            }
        });
        promiseArray.push(promise);
        if (promiseArray.length > 20) {
            await Promise.all(promiseArray);
            promiseArray = [];
        }
    }
    await Promise.all(promiseArray);

    if (newStaffCharactersArray.length > 0) {
        newStaffCharactersArray = await addImage(newStaffCharactersArray);
        if (type === 'staff') {
            newStaffCharactersArray = addCharacterDataToStaffData(movieID, movieName, moviePoster, newStaffCharactersArray, characters);
        }
        await insertToDB(type, newStaffCharactersArray, true);
    }
    if (updateStaffCharactersArray.length > 0) {
        if (type === 'staff') {
            updateStaffCharactersArray = addCharacterDataToStaffData(movieID, movieName, moviePoster, updateStaffCharactersArray, characters);
        }
        let promiseArray = [];
        for (let i = 0; i < updateStaffCharactersArray.length; i++) {
            let promise = updateByIdDB(type, updateStaffCharactersArray[i]._id, updateStaffCharactersArray[i]);
            promiseArray.push(promise);
            if (promiseArray.length > 20) {
                await Promise.all(promiseArray);
                promiseArray = [];
            }
        }
        await Promise.all(promiseArray);
    }
    return staff_characters;
}

function addCharacterDataToStaffData(movieID, movieName, moviePoster, staff, characters) {
    for (let i = 0; i < staff.length; i++) {
        let thisMovieCredit = staff[i].credits.find(x => x.movieID.toString() === movieID.toString());
        if (thisMovieCredit) {
            let thisCharacter = characters.find(x => x.name === thisMovieCredit.characterName);
            if (thisCharacter) {
                thisMovieCredit.movieName = movieName;
                thisMovieCredit.moviePoster = moviePoster || '';
                thisMovieCredit.characterRole = thisCharacter.role || '';
                thisMovieCredit.characterImage = thisCharacter.image || '';
            }
        }
    }
    return staff;
}

function updateStaffAndCharactersFields(prevFields, currentFields, type) {
    let fieldsUpdated = false;
    let newFields = {...prevFields};
    if (!newFields.gender && currentFields.gender) {
        newFields.gender = currentFields.gender;
        fieldsUpdated = true;
    }
    if (!newFields.about && currentFields.about) {
        newFields.about = currentFields.about;
        fieldsUpdated = true;
    }
    if (!newFields.tvmazePersonID && currentFields.tvmazePersonID) {
        newFields.tvmazePersonID = currentFields.tvmazePersonID;
        fieldsUpdated = true;
    }
    if (!newFields.jikanPersonID && currentFields.jikanPersonID) {
        newFields.jikanPersonID = currentFields.jikanPersonID;
        fieldsUpdated = true;
    }
    if (type === 'staff') {
        if (!newFields.country && currentFields.country) {
            newFields.country = currentFields.country;
            fieldsUpdated = true;
        }
        if (!newFields.birthday && currentFields.birthday) {
            newFields.birthday = currentFields.birthday;
            fieldsUpdated = true;
        }
        if (!newFields.deathday && currentFields.deathday) {
            newFields.deathday = currentFields.deathday;
            fieldsUpdated = true;
        }
    }
    let prevLength = newFields.originalImages.length;
    newFields.originalImages = removeDuplicateElements([...newFields.originalImages, ...currentFields.originalImages]);
    let newLength = newFields.originalImages.length;
    if (prevLength !== newLength) {
        fieldsUpdated = true;
    }
    return {newFields, fieldsUpdated};
}

async function addImage(dataArray) {
    let promiseArray = [];
    for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i].originalImages.length > 0) {
            let promise = uploadCastImageToS3ByURl(dataArray[i].originalImages[0], dataArray[i].name + '.jpg').then(imageUrl => {
                dataArray[i].image = imageUrl;
            });
            promiseArray.push(promise);
            if (promiseArray.length > 10) {
                await Promise.all(promiseArray);
                promiseArray = [];
            }
        }
    }
    await Promise.all(promiseArray);
    return dataArray;
}

function updateCredits(prevCredits, currentCredits, type) {
    let creditsUpdated = false;
    for (let j = 0; j < currentCredits.length; j++) {
        let exist = false;
        for (let k = 0; k < prevCredits.length; k++) {
            if (prevCredits[k].movieID.toString() === currentCredits[j].movieID.toString()) {
                exist = true;
                if (type === 'staff') {
                    if (
                        (prevCredits[k].positions.length < currentCredits[j].positions.length) ||
                        (prevCredits[k].characterName !== currentCredits[j].characterName && currentCredits[j].characterName)
                    ) {
                        creditsUpdated = true;
                    }
                } else {
                    if (
                        (prevCredits[k].role !== currentCredits[j].role && currentCredits[j].role) ||
                        (prevCredits[k].actorName !== currentCredits[j].actorName && currentCredits[j].actorName)
                    ) {
                        creditsUpdated = true;
                    }
                }
                prevCredits[k] = currentCredits[j];
                break;
            }
        }
        if (!exist) {
            prevCredits.push(currentCredits[j]);
            creditsUpdated = true;
        }
    }
    return {prevCredits, creditsUpdated};
}

function mergeCharactersInfo(tvmazeCharacters, jikanCharacters) {
    let result = [...tvmazeCharacters];
    for (let i = 0; i < jikanCharacters.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (result[j].name === jikanCharacters[i].name) {
                exist = true;
                result[j].gender = jikanCharacters[i].gender;
                result[j].jikanPersonID = jikanCharacters[i].jikanPersonID;
                result[j].about = jikanCharacters[i].about;
                result[j].originalImages.push(...jikanCharacters[i].originalImages);
                result[j].credits[0].role = jikanCharacters[i].credits[0].role;
                break;
            }
        }
        if (!exist) {
            result.push(jikanCharacters[i]);
        }
    }
    return result;
}

function getTvMazeActorsAndCharacters(movieID, tvmazeCast) {
    let tvmazeActors = [];
    for (let i = 0; i < tvmazeCast.length; i++) {
        if (tvmazeCast[i].voice) {
            continue;
        }

        let exist = false;
        for (let j = 0; j < tvmazeActors.length; j++) {
            if (replaceSpecialCharacters(tvmazeCast[i].person.name.toLowerCase()) === tvmazeActors[j].name) {
                exist = true;
                let newCredit = {
                    movieID: movieID,
                    positions: ['Actor'],
                    actorName: replaceSpecialCharacters(tvmazeCast[i].character.name.toLowerCase())
                };
                tvmazeActors[j].credits.push(newCredit);
                break;
            }
        }
        if (!exist) {
            let countryName = tvmazeCast[i].person.country ? tvmazeCast[i].person.country.name : '';
            let originalImages = [];
            if (tvmazeCast[i].person.image) {
                originalImages = [tvmazeCast[i].person.image.medium, tvmazeCast[i].person.image.original];
            }
            let person = getPersonModel(
                tvmazeCast[i].person.name, tvmazeCast[i].person.gender, '',
                tvmazeCast[i].person.id, 0,
                countryName, tvmazeCast[i].person.birthday, tvmazeCast[i].person.deathday,
                originalImages,
                movieID, ['Actor'], replaceSpecialCharacters(tvmazeCast[i].character.name.toLowerCase())
            );
            tvmazeActors.push(person);
        }
    }

    let tvmazeCharacters = [];
    for (let i = 0; i < tvmazeCast.length; i++) {
        let originalImages = [];
        if (tvmazeCast[i].character.image) {
            originalImages = [tvmazeCast[i].character.image.medium, tvmazeCast[i].character.image.original];
        }
        let character = getCharacterModel(
            tvmazeCast[i].character.name, '', '',
            tvmazeCast[i].character.id, 0,
            originalImages,
            movieID, '', replaceSpecialCharacters(tvmazeCast[i].person.name.toLowerCase()),
        );
        tvmazeCharacters.push(character);
    }
    return {tvmazeActors, tvmazeCharacters};
}

async function getJikanStaff_voiceActors(movieID, jikanCharactersArray) {
    let voiceActors = [];
    for (let i = 0; i < jikanCharactersArray.length; i++) {
        let thisCharacterVoiceActors = jikanCharactersArray[i].voice_actors;
        for (let j = 0; j < thisCharacterVoiceActors.length; j++) {
            if (thisCharacterVoiceActors[j].language.toLowerCase() === 'japanese') {
                thisCharacterVoiceActors[j].positions = ['Voice Actor'];
                let temp = jikanCharactersArray[i].name.split(',').map(item => item.trim());
                let characterName = [temp[1], temp[0]].join(' ').toLowerCase();
                thisCharacterVoiceActors[j].characterName = replaceSpecialCharacters(characterName);
                voiceActors.push(thisCharacterVoiceActors[j]);
            }
        }
    }
    return await getJikanStaff(movieID, voiceActors);
}

async function getJikanStaff(movieID, jikanStaffArray) {
    let result = [];
    for (let i = 0; i < jikanStaffArray.length; i++) {
        let staffApiData = await getPersonInfo(jikanStaffArray[i].mal_id);
        if (!staffApiData) {
            continue;
        }
        let gender = '';
        if (staffApiData.about) {
            gender = staffApiData.about.match(/Gender:\s*Male/gi)
                ? 'Male'
                : staffApiData.about.match(/Gender:\s*Female/gi) ? 'Female' : '';
        }
        let originalImage = staffApiData.image_url.includes('/icon/') ? '' : staffApiData.image_url;
        let person = getPersonModel(
            staffApiData.name, gender, staffApiData.about,
            0, staffApiData.mal_id,
            '', '', '',
            [originalImage],
            movieID, jikanStaffArray[i].positions, (jikanStaffArray[i].characterName || '')
        );
        result.push(person);
    }
    return result;
}

async function getJikanCharaters(movieID, jikanCharatersArray) {
    let result = [];
    for (let i = 0; i < jikanCharatersArray.length; i++) {
        let characterApiData = await getCharacterInfo(jikanCharatersArray[i].mal_id);
        if (!characterApiData) {
            continue;
        }
        let gender = '';
        if (characterApiData.about) {
            gender = characterApiData.about.match(/Gender:\s*Male/gi)
                ? 'Male'
                : characterApiData.about.match(/Gender:\s*Female/gi) ? 'Female' : '';
        }
        let originalImage = characterApiData.image_url.includes('/icon/') ? '' : characterApiData.image_url;
        let voiceActors = jikanCharatersArray[i].voice_actors;
        let voiceActorName = '';
        for (let j = 0; j < voiceActors.length; j++) {
            if (voiceActors[j].language.toLowerCase() === 'japanese') {
                let temp = voiceActors[j].name.split(',').map(item => item.trim());
                let name = [temp[1], temp[0]].join(' ');
                voiceActorName = replaceSpecialCharacters(name.toLowerCase());
                break;
            }
        }
        let character = getCharacterModel(
            characterApiData.name, gender, characterApiData.about,
            0, characterApiData.mal_id,
            [originalImage],
            movieID, jikanCharatersArray[i].role, voiceActorName,
        );
        result.push(character);
    }
    return result;
}
