import * as likeService from './likeService.js';

startManualTest();

export async function startManualTest() {
    await likeService.testLikeService();
    await likeService.testLikeTransaction();
}
