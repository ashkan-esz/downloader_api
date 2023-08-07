import {removeServerOldLogsJobFunc, saveTotalUsersCountJobFunc} from "../jobs/userAnalysisJob.js";
import {computeUsersFavoriteGenresJobFunc} from "../jobs/computeUserJob.js";
import {checkCrawlerDomainsJobFunc} from "../jobs/checkSourceDomains.js";
import {removeS3UnusedFilesJobFunc, resetMonthLikesJobFunc, updateJikanImdbDataJobFunc} from "../agenda/index.js";
import {saveError} from "../error/saveError.js";

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