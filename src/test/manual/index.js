import * as likeService from './likeService';

startManualTest();

export async function startManualTest() {
    await likeService.testLikeService();
    await likeService.testLikeTransaction();
}
