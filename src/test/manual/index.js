import * as likeService from './mtest_userStatsService.js';

startManualTest();

export async function startManualTest() {
    await likeService.testLikeService();
    await likeService.testLikeTransaction();
}
