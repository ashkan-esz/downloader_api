import {removeServerOldLogsJobFunc, saveTotalUsersCountJobFunc} from "../jobs/userAnalysisJob.js";
import {computeUsersFavoriteGenresJobFunc} from "../jobs/computeUserJob.js";
import {checkCrawlerDomainsJobFunc} from "../jobs/checkSourceDomains.js";
import {removeS3UnusedFilesJobFunc, resetMonthLikesJobFunc, updateJikanImdbDataJobFunc} from "../agenda/index.js";
import {createThumbnails} from "../data/db/admin/thumbnailDbMethods.js";
import {addTrailersFromYoutubeJobFunc} from "../jobs/youtubeTrailers.js";
import {saveError} from "../error/saveError.js";
import {updateMovieRanksJobFunc} from "../jobs/movieRanks.js";
import {backupDbJobFunc, restoreBackupDbJobFunc} from "../jobs/dbBackup.js";
import {
    removeS3PosterJobFunc,
    removeS3ProfileImageJobFunc,
    removeS3TrailerJobFunc,
    removeS3WidePosterJobFunc
} from "../jobs/s3Files.js";

const cronJobsStatus = {
    checkCrawlerDomains: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'Every hour - **:15',
        startFunc: checkCrawlerDomainsJobFunc,
    },
    updateJikanImdbData: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'Every day at 12:00 and 24:00',
        startFunc: updateJikanImdbDataJobFunc,
    },
    updateMovieRanks: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'Every day at 12:30 and 00:30',
        startFunc: updateMovieRanksJobFunc,
    },
    resetMonthLikes: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: resetMonthLikesJobFunc,
    },
    removeS3UnusedFiles: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'At 00:00 on Sunday',
        startFunc: removeS3UnusedFilesJobFunc,
    },
    computeUserFavoriteGenres: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'At 01:00 on Sunday',
        startFunc: computeUsersFavoriteGenresJobFunc,
    },
    saveTotalUsersCount: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'Every day At 23:00',
        startFunc: saveTotalUsersCountJobFunc,
    },
    removeServerOldLogs: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'At 00:00 on day-of-month 7',
        startFunc: removeServerOldLogsJobFunc,
    },
    createThumbnail: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: createThumbnails,
    },
    addTrailersFromYoutube: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'Every 8 hours',
        startFunc: addTrailersFromYoutubeJobFunc,
    },
    backupDb: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: 'Every day at 02:00',
        startFunc: backupDbJobFunc,
    },
    restoreBackupDb: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: restoreBackupDbJobFunc,
    },
    removeS3Poster: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: removeS3PosterJobFunc,
    },
    removeS3WidePoster: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: removeS3WidePosterJobFunc,
    },
    removeS3Trailer: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: removeS3TrailerJobFunc,
    },
    removeS3ProfileImage: {
        running: false,
        startDate: 0,
        state: '',
        value: '',
        description: '',
        startFunc: removeS3ProfileImageJobFunc,
    },
}


export function getCronJobsStatus() {
    try {
        let result = [];
        let keys = Object.keys(cronJobsStatus);
        for (let i = 0; i < keys.length; i++) {
            let temp = {...cronJobsStatus[keys[i]]};
            delete temp.startFunc;
            result.push({
                jobName: keys[i],
                ...temp,
            });
        }
        return result;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function startCronJobByName(jobName) {
    try {
        if (!cronJobsStatus[jobName]) {
            return 'notfound';
        }
        if (cronJobsStatus[jobName].running) {
            return 'already running';
        }
        return await cronJobsStatus[jobName].startFunc();
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export function updateCronJobsStatus(jobName, state, value = '') {
    cronJobsStatus[jobName].state = state;
    cronJobsStatus[jobName].value = value;
    if (state === 'start') {
        cronJobsStatus[jobName].running = true;
        cronJobsStatus[jobName].startDate = new Date();
    }
    if (state === 'end') {
        cronJobsStatus[jobName].running = false;
        cronJobsStatus[jobName].startDate = 0;
        cronJobsStatus[jobName].state = '';
    }
}