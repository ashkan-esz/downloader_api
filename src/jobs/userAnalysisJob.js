import {getTotalAndActiveUsersCount} from "../data/db/usersDbMethods.js";
import {removeOldAnalysis, saveTotalAndActiveUsersCount} from "../data/db/serverAnalysisDbMethods.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";


export default function (agenda) {
    agenda.define("save total/active users count", {concurrency: 1}, async (job) => {
        await saveTotalUsersCountJobFunc();
    });

    agenda.define("remove server analysis old logs", {concurrency: 1}, async (job) => {
        await removeServerOldLogsJobFunc();
    });
}

export async function saveTotalUsersCountJobFunc() {
    try {
        updateCronJobsStatus('saveTotalUsersCount', 'start');
        let counts = await getTotalAndActiveUsersCount();
        updateCronJobsStatus('saveTotalUsersCount', 'calculated', counts);
        if (!counts) {
            return {status: 'error'};
        }
        let saveResult = await saveTotalAndActiveUsersCount(counts);
        updateCronJobsStatus('saveTotalUsersCount', 'end', counts);
        if (saveResult === 'error') {
            return {status: 'error'};
        }
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('saveTotalUsersCount', 'end');
        return {status: 'error'};
    }
}

export async function removeServerOldLogsJobFunc() {
    try {
        updateCronJobsStatus('removeServerOldLogs', 'start');
        let result = await removeOldAnalysis();
        updateCronJobsStatus('removeServerOldLogs', 'end', result);
        if (result === 'error') {
            return {status: 'error'};
        }
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('removeServerOldLogs', 'end');
        return {status: 'error'};
    }
}