import {
    userStatsService,
    searchCharacterById,
    searchMovieById,
    searchStaffById
} from "../../services/movies.services.js";
import {addUser} from "../../data/usersDbMethods.js";
import {insertToDB, removeByIdDB} from "../../data/dbMethods.js";
import {
    handleAddUserStatsTransaction,
    handleRemoveUserStatsTransaction,
    removeUserStatsBucketsAll
} from "../../data/db/userStats.js";
import getCollection from "../../data/mongoDB.js";
import {userStats} from "../../models/movie.js";
import {userStats_character} from "../../models/character.js";
import {userStats_staff} from "../../models/person.js";


export async function testLikeService() {
    try {
        console.log('------ testLikeService: start');
        const {userId, docTypes, docIds} = await createTestUserAndDocs();
        let allOk = true;
        for (let i = 0; i < docTypes.length; i++) {
            let statType = docTypes[i].includes('staff')
                ? 'like_staff'
                : docTypes[i].includes('character')
                    ? 'like_character'
                    : 'like_movie';
            let statType2 = statType.replace('like', 'dislike');
            let statType_count = statType + '_count';
            let statType_count2 = statType2 + '_count';
            console.log(`docType: ${docTypes[i]} , docId: ${docIds[i]}`);
            //----------------------------------------------------------------------------------------------------------
            let data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`title/name: ${data.title || data.name} , userStats --> ${JSON.stringify(data.userStats, null, 4)}`);
            //----------------------------------------------------------------------------------------------------------
            await userStatsService(userId, statType, docIds[i], false);
            data = await getData(userId, docTypes[i], docIds[i]);
            let ok = data.userStats[statType_count] === 1 && data.userStats[statType_count2] === 0 && data.userStats[statType] && !data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after like --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------
            await userStatsService(userId, statType, docIds[i], true);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.userStats[statType_count] === 0 && data.userStats[statType_count2] === 0 && !data.userStats[statType] && !data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after remove like --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------------------------------------------------------------
            await userStatsService(userId, statType2, docIds[i], false);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.userStats[statType_count] === 0 && data.userStats[statType_count2] === 1 && !data.userStats[statType] && data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after dislike --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------
            await userStatsService(userId, statType2, docIds[i], true);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.userStats[statType_count] === 0 && data.userStats[statType_count2] === 0 && !data.userStats[statType] && !data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after remove dislike --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------------------------------------------------------------
            await userStatsService(userId, statType, docIds[i], false);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.userStats[statType_count] === 1 && data.userStats[statType_count2] === 0 && data.userStats[statType] && !data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after like --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------
            await userStatsService(userId, statType2, docIds[i], false);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.userStats[statType_count] === 0 && data.userStats[statType_count2] === 1 && !data.userStats[statType] && data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after dislike --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------
            await userStatsService(userId, statType2, docIds[i], true);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.userStats[statType_count] === 0 && data.userStats[statType_count2] === 0 && !data.userStats[statType] && !data.userStats[statType2];
            allOk = ok && allOk;
            console.log(`after remove dislike --> userStats --> ${JSON.stringify(data.userStats, null, 4)} ---> ok: ${ok}`);
            //----------------------------------------------------------------------------------------------------------
            console.log('--------------------------------------');
            console.log('--------------------------------------');
            console.log('--------------------------------------');
        }
        await removeTestUserAndDocs(userId, docTypes, docIds);
        console.log(`------ testLikeService: Done (ok=${allOk})`);
    } catch (error) {
        console.log(error);
    }
}

export async function testLikeTransaction() {
    try {
        console.log('------ testLikeTransaction: Start');
        const {userId, docTypes, docIds} = await createTestUserAndDocs();
        for (let i = 0; i < docTypes.length; i++) {
            let data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`title/name: ${data.title || data.name} , userStats --> ${JSON.stringify(data.userStats, null, 4)}`);
            //----------------------------------------------------------------------------------------------------------
            let statType = docTypes[i].includes('staff')
                ? 'like_staff'
                : docTypes[i].includes('character')
                    ? 'like_character'
                    : 'like_movie';
            let statType2 = statType.replace('like', 'dislike');
            //----------------------------------------------------------------------------------------------------------
            let likeResult = await Promise.allSettled([
                handleAddUserStatsTransaction(userId, statType, docIds[i]),
                handleAddUserStatsTransaction(userId, statType2, docIds[i]),
            ]);
            console.log(likeResult);
            data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`after like,dislike --> userStats --> ${JSON.stringify(data.userStats, null, 4)}`);
            //----------------------------------------------------------------------------------------------------------
            let removeResult = await Promise.allSettled([
                handleRemoveUserStatsTransaction(userId, statType, docIds[i]),
                handleRemoveUserStatsTransaction(userId, statType2, docIds[i]),
            ]);
            console.log(removeResult);
            data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`after remove like,dislike --> userStats --> ${JSON.stringify(data.userStats, null, 4)}`);
            //----------------------------------------------------------------------------------------------------------
            console.log('--------------------------------------');
            console.log('--------------------------------------');
            console.log('--------------------------------------');
        }
        await removeTestUserAndDocs(userId, docTypes, docIds);
        console.log('------ testLikeTransaction: Done');
    } catch (error) {
        console.log(error);
    }
}

export async function createTestUserAndDocs() {
    let userId = await checkTestDocExist('users', {username: 'TestUser'});
    if (!userId) {
        userId = await addUser({
            username: 'TestUser',
            rawUsername: 'TestUser',
        });
    }
    //---------------------------------------
    const docTypes = ['movies', 'staff', 'characters'];
    let docIds = [];

    let movieId = await checkTestDocExist('movies', {title: 'TestMovie'});
    if (!movieId) {
        movieId = await insertToDB('movies', {
            title: 'TestMovie',
            userStats: userStats,
        });
    }
    docIds.push(movieId);

    let staffId = await checkTestDocExist('staff', {name: 'TestStaff'});
    if (!staffId) {
        staffId = await insertToDB('staff', {
            name: 'TestStaff',
            userStats: userStats_staff,
        });
    }
    docIds.push(staffId);

    let characterId = await checkTestDocExist('characters', {name: 'TestCharacter'});
    if (!characterId) {
        characterId = await insertToDB('characters', {
            name: 'TestCharacter',
            userStats: userStats_character,
        });
    }
    docIds.push(characterId);

    return {userId, docTypes, docIds};
}

async function checkTestDocExist(collectionName, searchQuery) {
    let collection = await getCollection(collectionName);
    let id = await collection.find(searchQuery, {projection: {_id: 1}}).limit(1).toArray();
    id = id[0] && id[0]._id;
    return id;
}

async function removeTestUserAndDocs(userId, docTypes, docIds) {
    await removeByIdDB('users', userId);
    for (let i = 0; i < docTypes.length; i++) {
        await removeByIdDB(docTypes[i], docIds[i]);
    }
    await removeUserStatsBucketsAll(userId);
}

async function getData(userId, docType, docId) {
    let data;
    if (docType === 'movies') {
        data = await searchMovieById(userId, docId, 'high');
    } else if (docType === 'staff') {
        data = await searchStaffById(userId, docId);
    } else if (docType === 'characters') {
        data = await searchCharacterById(userId, docId);
    }
    data = data.responseData.data;
    return {
        title: data.title,
        name: data.name,
        userStats: data.userStats,
    };
}
