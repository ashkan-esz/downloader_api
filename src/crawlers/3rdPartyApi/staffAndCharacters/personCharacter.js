import PQueue from 'p-queue';
import * as staffAndCharactersDbMethods from "../../../data/db/staffAndCharactersDbMethods.js";
import * as cloudStorage from "../../../data/cloudStorage.js";
import {getCharacterInfo, getCharactersStaff, getPersonInfo} from "../jikanApi.js";
import * as utils from "../../utils/utils.js";
import {extractStaffDataFromJikanAbout} from "../extractDataFields.js";
import {saveError} from "../../../error/saveError.js";
import * as rabbitmqPublisher from "../../../../rabbitmq/publish.js";
import {changePageLinkStateFromCrawlerStatus, checkForceStopCrawler} from "../../status/crawlerStatus.js";

const _maxStaffOrCharacterSize = 150;
const _pqConcurrency = 8;
const _maxCastConcurrency = 2;
let _castConcurrency = 0;

export async function addStaffAndCharacters(pageLink, movieId, allApiData, castUpdateDate, extraConfigs = null) {
    try {
        movieId = movieId.toString();
        //castUpdateState is none|ignore|force
        if (extraConfigs?.castUpdateState === 'ignore') {
            return null;
        }
        if (utils.getDatesBetween(new Date(), new Date(castUpdateDate)).days < 30 && extraConfigs?.castUpdateState !== 'force') {
            return null;
        }

        let {omdbApiFields, tvmazeApiFields, jikanApiFields} = allApiData;

        const credits = [];

        if (checkForceStopCrawler()) {
            return;
        }
        if (tvmazeApiFields) {
            await addTvMazeActorsAndCharacters(pageLink, movieId, tvmazeApiFields.cast, credits);
        }

        if (checkForceStopCrawler()) {
            return;
        }

        if (jikanApiFields) {
            changePageLinkStateFromCrawlerStatus(pageLink, ` ([3/6] jikan: fetching staff/character list)`, true);

            while (_castConcurrency >= _maxCastConcurrency) {
                changePageLinkStateFromCrawlerStatus(pageLink, ` (exceed concurrency limit: ${_castConcurrency}/${_maxCastConcurrency})`, true);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            _castConcurrency++;

            let jikanCharatersStaff = await getCharactersStaff(jikanApiFields.jikanID);
            if (jikanCharatersStaff) {
                await handleJikanStaff(pageLink, movieId, jikanCharatersStaff.staff, credits);
                await handleJikanStaff_voiceActors(pageLink, movieId, jikanCharatersStaff.characters, credits);
                await handleJikanCharaters(movieId, jikanCharatersStaff.characters, credits);
            }
            _castConcurrency--;
        }
        changePageLinkStateFromCrawlerStatus(pageLink, ` ([6/6] updating credits)`, true);
        await handleCredits(credits);
    } catch (error) {
        saveError(error);
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

async function addTvMazeActorsAndCharacters(pageLink, movieId, tvmazeCast, credits) {
    for (let i = 0; i < tvmazeCast.length; i++) {
        changePageLinkStateFromCrawlerStatus(pageLink, ` ([1/6] tvmaze-staff: ${i + 1}/${tvmazeCast.length})`, true);
        if (checkForceStopCrawler()) {
            break;
        }
        const countryName = tvmazeCast[i].person.country?.name?.toLowerCase() || '';
        const originalImages = [tvmazeCast[i].person.image?.medium, tvmazeCast[i].person.image?.original].filter(item => item);
        const positions = tvmazeCast[i].voice ? ['Voice Actor'] : ['Actor'];
        const birthday = tvmazeCast[i].person.birthday;
        const deathday = tvmazeCast[i].person.deathday;
        let age = 0;
        if (birthday && deathday === null) {
            let birthYear = Number(birthday.split('-')[0]);
            let currentYear = new Date().getFullYear();
            age = currentYear - birthYear;
        }

        const rawName = utils.fixJapaneseCharacter(tvmazeCast[i].person.name);
        const name = utils.replaceSpecialCharacters(rawName.toLowerCase());
        const gender = tvmazeCast[i].person.gender?.toLowerCase() || '';
        const staffData = {
            gender: gender, tvmazePersonID: tvmazeCast[i].person.id,
            country: countryName, birthday: birthday, deathday: deathday, age: age,
            originalImages: originalImages,
        };
        const keys = Object.keys(staffData);
        for (let j = 0; j < keys.length; j++) {
            if (!staffData[keys[j]]) {
                delete staffData[keys[j]];
            }
        }
        const createStaffResult = await staffAndCharactersDbMethods.upsertStaffDb(name, rawName, staffData);
        if (createStaffResult) {
            const characterName = utils.fixJapaneseCharacter(tvmazeCast[i].character.name);
            credits.push({
                movieId: movieId,
                staffId: createStaffResult.id,
                characterId: null,
                actorPositions: positions,
                characterName: characterName,
                characterRole: '',
            });
            if (!createStaffResult.imageData) {
                const castImage = await cloudStorage.uploadCastImageToS3ByURl(name, 'staff', createStaffResult.id, originalImages[0]);
                if (castImage) {
                    let res = await staffAndCharactersDbMethods.addCastImageDb(createStaffResult.id, 'staff', castImage);
                    if (res && res.blurHash === "") {
                        await rabbitmqPublisher.addBlurHashToQueue(rabbitmqPublisher.blurHashTypes.staff, createStaffResult.id, castImage.url)
                    }
                }
            }
        }
    }

    for (let i = 0; i < tvmazeCast.length; i++) {
        changePageLinkStateFromCrawlerStatus(pageLink, ` ([2/6] tvmaze-character: ${i + 1}/${tvmazeCast.length})`, true);
        if (checkForceStopCrawler()) {
            break;
        }
        const originalImages = [tvmazeCast[i].character.image?.medium, tvmazeCast[i].character.image?.original].filter(item => item);
        const rawName = utils.fixJapaneseCharacter(tvmazeCast[i].character.name);
        const name = utils.replaceSpecialCharacters(rawName.toLowerCase());
        const characterData = {
            tvmazePersonID: tvmazeCast[i].character.id,
            originalImages: originalImages,
        };
        const createCharacterResult = await staffAndCharactersDbMethods.upsertCharacterDb(name, rawName, characterData);
        if (createCharacterResult) {
            credits.push({
                movieId: movieId,
                staffId: null,
                characterId: createCharacterResult.id,
                actorPositions: [],
                characterName: rawName,
                characterRole: '',
            });
            if (!createCharacterResult.imageData) {
                const castImage = await cloudStorage.uploadCastImageToS3ByURl(name, 'character', createCharacterResult.id, originalImages[0]);
                if (castImage) {
                    let res = await staffAndCharactersDbMethods.addCastImageDb(createCharacterResult.id, 'character', castImage);
                    if (res && res.blurHash === "") {
                        await rabbitmqPublisher.addBlurHashToQueue(rabbitmqPublisher.blurHashTypes.character, createCharacterResult.id, castImage.url)
                    }
                }
            }
        }
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

async function handleJikanStaff_voiceActors(pageLink, movieId, jikanCharactersArray, credits) {
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
    await handleJikanStaff(pageLink, movieId, voiceActors, credits, true);
}

async function handleJikanStaff(pageLink, movieId, jikanStaffArray, credits, isVoiceActors = false) {
    if (isVoiceActors) {
        changePageLinkStateFromCrawlerStatus(pageLink, ` ([4/6] jikan-voiceActor: 0/?)`, true);
    } else {
        changePageLinkStateFromCrawlerStatus(pageLink, ` ([3/6] jikan-staff: 0/?)`, true);
    }
    const promiseQueue = new PQueue({concurrency: _pqConcurrency});
    for (let i = 0; i < jikanStaffArray.length && i < _maxStaffOrCharacterSize; i++) {
        if (checkForceStopCrawler()) {
            promiseQueue.clear();
            break;
        }
        promiseQueue.add(() => getPersonInfo(jikanStaffArray[i].person.mal_id).then(async (staffApiData) => {
            if (staffApiData) {
                await addStaffOrCharacterFromJikanData(movieId, jikanStaffArray[i], staffApiData, 'staff', credits);
            }
        })).catch(error => saveError(error));
    }

    let counter = 0;
    let total = Math.min(jikanStaffArray.length, _maxStaffOrCharacterSize);
    promiseQueue.on('next', () => {
        counter++;
        if (isVoiceActors) {
            changePageLinkStateFromCrawlerStatus(pageLink, ` ([4/6] jikan-voiceActor: ${counter}(+${promiseQueue.pending})/${total})`, true);
        } else {
            changePageLinkStateFromCrawlerStatus(pageLink, ` ([3/6] jikan-staff: ${counter}(+${promiseQueue.pending})/${total})`, true);
        }
        if (checkForceStopCrawler()) {
            promiseQueue.clear();
        }
    });
    await promiseQueue.onIdle();
}

async function handleJikanCharaters(pageLink, movieId, jikanCharatersArray, credits) {
    changePageLinkStateFromCrawlerStatus(pageLink, ` ([5/6] jikan-characters: 0/?)`, true);
    const promiseQueue = new PQueue({concurrency: _pqConcurrency});
    for (let i = 0; i < jikanCharatersArray.length && i < _maxStaffOrCharacterSize; i++) {
        if (checkForceStopCrawler()) {
            promiseQueue.clear();
            break;
        }
        const index = i;
        if (!jikanCharatersArray[index].character?.mal_id) {
            continue;
        }
        promiseQueue.add(() => getCharacterInfo(jikanCharatersArray[index].character.mal_id).then(async (characterApiData) => {
            if (characterApiData) {
                await addStaffOrCharacterFromJikanData(movieId, jikanCharatersArray[i], characterApiData, 'character', credits);
            }
        })).catch(error => saveError(error));
    }

    let counter = 0;
    let total = Math.min(jikanCharatersArray.length, _maxStaffOrCharacterSize);
    promiseQueue.on('next', () => {
        counter++;
        changePageLinkStateFromCrawlerStatus(pageLink, ` ([5/6] jikan-characters: ${counter}(+${promiseQueue.pending})/${total})`, true);
        if (checkForceStopCrawler()) {
            promiseQueue.clear();
        }
    });
    await promiseQueue.onIdle();
}

//-----------------------------------------------------
//-----------------------------------------------------

async function addStaffOrCharacterFromJikanData(movieId, SemiData, fullApiData, type, credits) {
    let extractedData = extractStaffDataFromJikanAbout(fullApiData);

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

    if (!fullApiData.name) {
        return;
    }
    const rawName = utils.fixJapaneseCharacter(fullApiData.name);
    const name = utils.replaceSpecialCharacters(rawName.toLowerCase());
    const data = {
        about: (fullApiData.about || '').trim().replace(/\n\s*\n/g, '\n').replace(/\s\s+/g, ' '),
        jikanPersonID: fullApiData.mal_id,
        originalImages: originalImages.filter(item => item),
        ...extractedData,
    };
    const keys = Object.keys(data);
    for (let j = 0; j < keys.length; j++) {
        if (!data[keys[j]]) {
            delete data[keys[j]];
        }
    }

    if (type === 'staff') {
        const createStaffResult = await staffAndCharactersDbMethods.upsertStaffDb(name, rawName, data);
        if (createStaffResult) {
            const characterName = utils.fixJapaneseCharacter(SemiData.characterName || '');

            let findCredit = credits.find(c => c.movieId === movieId && c.staffId === createStaffResult.id && c.actorPositions[0] === SemiData.positions[0] && (!c.characterName || c.characterName === characterName));
            if (findCredit) {
                findCredit.actorPositions = SemiData.positions;
                if (!findCredit.characterName) {
                    findCredit.characterName = characterName;
                }
                if (!findCredit.characterRole) {
                    findCredit.characterRole = SemiData.characterRole || '';
                }
            } else {
                credits.push({
                    movieId: movieId,
                    staffId: createStaffResult.id,
                    characterId: null,
                    actorPositions: SemiData.positions,
                    characterName: characterName,
                    characterRole: SemiData.characterRole || '',
                });
            }

            if (!createStaffResult.imageData) {
                const castImage = await cloudStorage.uploadCastImageToS3ByURl(name, 'staff', createStaffResult.id, originalImages[0]);
                if (castImage) {
                    let res = await staffAndCharactersDbMethods.addCastImageDb(createStaffResult.id, 'staff', castImage);
                    if (res && res.blurHash === "") {
                        await rabbitmqPublisher.addBlurHashToQueue(rabbitmqPublisher.blurHashTypes.staff, createStaffResult.id, castImage.url)
                    }
                }
            }
        }
    } else {
        const createCharacterResult = await staffAndCharactersDbMethods.upsertCharacterDb(name, rawName, data);
        if (createCharacterResult) {

            let findCredit = credits.find(c => c.movieId === movieId && c.characterId === createCharacterResult.id && c.characterName === rawName);
            if (findCredit) {
                if (!findCredit.characterRole) {
                    findCredit.characterRole = SemiData.role || '';
                }
            } else {
                credits.push({
                    movieId: movieId,
                    staffId: null,
                    characterId: createCharacterResult.id,
                    actorPositions: [],
                    characterName: rawName,
                    characterRole: SemiData.role || '',
                });
            }

            if (!createCharacterResult.imageData) {
                const castImage = await cloudStorage.uploadCastImageToS3ByURl(name, 'staff', createCharacterResult.id, originalImages[0]);
                if (castImage) {
                    let res = await staffAndCharactersDbMethods.addCastImageDb(createCharacterResult.id, 'character', castImage);
                    if (res && res.blurHash === "") {
                        await rabbitmqPublisher.addBlurHashToQueue(rabbitmqPublisher.blurHashTypes.character, createCharacterResult.id, castImage.url)
                    }
                }
            }
        }
    }
}

//-----------------------------------------------------
//-----------------------------------------------------

async function handleCredits(credits) {
    try {
        let result = credits.filter(c => c.staffId);
        for (let j = 0; j < credits.length; j++) {
            if (!credits[j].staffId && credits[j].characterId && credits[j].characterName) {
                for (let k = 0; k < result.length; k++) {
                    if (result[k].characterName === credits[j].characterName && (!result[k].characterId || !result[k].characterRole)) {
                        result[k].characterId = credits[j].characterId;
                        if (!result[k].characterRole) {
                            result[k].characterRole = credits[j].characterRole;
                        }
                    }
                }
            }
        }

        const promiseQueue = new PQueue({concurrency: 30});
        for (let j = 0; j < result.length; j++) {
            promiseQueue.add(() => staffAndCharactersDbMethods.insertOrUpdateCredit(result[j].movieId, result[j].staffId, result[j].characterId, result[j].actorPositions, result[j].characterRole));
        }
        await promiseQueue.onIdle();
    } catch (error) {
        saveError(error);
    }
}