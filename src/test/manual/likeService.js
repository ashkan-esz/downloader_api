import {
    likeOrDislikeService,
    searchCharacterById,
    searchMovieById,
    searchStaffById
} from "../../services/movies.services";
import {
    handleLikeOrDislikeTransaction,
    handleRemoveLikeOrDislikeTransaction,
    removeUserLikeBuckets
} from "../../data/likeDbMethods";
import {addUser} from "../../data/usersDbMethods";
import {insertToDB, removeByIdDB} from "../../data/dbMethods";


export async function testLikeService() {
    try {
        console.log('------ testLikeService: start');
        const {userId, docTypes, docIds} = await createTestUserAndDocs();
        for (let i = 0; i < docTypes.length; i++) {
            console.log(`docType: ${docTypes[i]} , docId: ${docIds[i]}`);

            let data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`title/name: ${data.title || data.name} , likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike}`);

            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'like', false);
            data = await getData(userId, docTypes[i], docIds[i]);
            let ok = data.likesCount === 1 && data.dislikesCount === 0 && data.likeOrDislike === 'like';
            console.log(`after like --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);
            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'like', true);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.likesCount === 0 && data.dislikesCount === 0 && data.likeOrDislike === '';
            console.log(`after remove like --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);

            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'dislike', false);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.likesCount === 0 && data.dislikesCount === 1 && data.likeOrDislike === 'dislike';
            console.log(`after dislike --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);
            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'dislike', true);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.likesCount === 0 && data.dislikesCount === 0 && data.likeOrDislike === '';
            console.log(`after remove dislike --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);

            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'like', false);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.likesCount === 1 && data.dislikesCount === 0 && data.likeOrDislike === 'like';
            console.log(`after like --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);
            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'dislike', false);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.likesCount === 0 && data.dislikesCount === 1 && data.likeOrDislike === 'dislike';
            console.log(`after dislike --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);
            await likeOrDislikeService(userId, docTypes[i], docIds[i], 'dislike', true);
            data = await getData(userId, docTypes[i], docIds[i]);
            ok = data.likesCount === 0 && data.dislikesCount === 0 && data.likeOrDislike === '';
            console.log(`after remove dislike --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike} ---> ok: ${ok}`);
            console.log();
        }
        await removeTestUserAndDocs(userId, docTypes, docIds);
        console.log('------ testLikeService: Done');
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
            console.log(`title/name: ${data.title || data.name} , likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike}`);

            let likeResult = await Promise.allSettled([
                handleLikeOrDislikeTransaction(userId, docTypes[i], docIds[i], 'like'),
                handleLikeOrDislikeTransaction(userId, docTypes[i], docIds[i], 'dislike'),
            ]);
            console.log(likeResult);
            data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`after like --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike}`);

            let removeResult = await Promise.allSettled([
                handleRemoveLikeOrDislikeTransaction(userId, docTypes[i], docIds[i], 'like'),
                handleRemoveLikeOrDislikeTransaction(userId, docTypes[i], docIds[i], 'dislike'),
            ]);
            console.log(removeResult);
            data = await getData(userId, docTypes[i], docIds[i]);
            console.log(`after remove like --> likesCount|dislikesCount|likeOrDislike --> ${data.likesCount}|${data.dislikesCount}|${data.likeOrDislike}`);
            console.log();
        }
        await removeTestUserAndDocs(userId, docTypes, docIds);
        console.log('------ testLikeTransaction: Done');
    } catch (error) {
        console.log(error);
    }
}

async function createTestUserAndDocs() {
    let userId = await addUser({
        username: 'TestUser',
        rawUsername: 'TestUser',
    });
    const docTypes = ['movies', 'staff', 'characters']
    let docIds = [];
    let movieId = await insertToDB('movies', {
        title: 'TestMovie',
        likesCount: 0,
        dislikesCount: 0,
    });
    docIds.push(movieId);
    let staffId = await insertToDB('staff', {
        name: 'TestStaff',
        likesCount: 0,
        dislikesCount: 0,
    });
    docIds.push(staffId);
    let characterId = await insertToDB('characters', {
        name: 'TestCharacter',
        likesCount: 0,
        dislikesCount: 0,
    });
    docIds.push(characterId);
    return {userId, docTypes, docIds};
}

async function removeTestUserAndDocs(userId, docTypes, docIds) {
    await removeByIdDB('users', userId);
    for (let i = 0; i < docTypes.length; i++) {
        await removeByIdDB(docTypes[i], docIds[i]);
        await removeUserLikeBuckets(userId, docTypes[i]);
    }
}

async function getData(userId, docType, docId) {
    let data;
    if (docType === 'movies') {
        data = await searchMovieById(userId, docId, 'low', '');
    } else if (docType === 'staff') {
        data = await searchStaffById(userId, docId, '');
    } else if (docType === 'characters') {
        data = await searchCharacterById(userId, docId, '');
    }
    return data;
}
