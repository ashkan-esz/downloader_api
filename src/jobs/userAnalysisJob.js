import {getTotalAndActiveUsersCount, saveTotalAndActiveUsersCount} from "../data/db/userAnalysisDbMethods.js";
import {saveError} from "../error/saveError.js";


export default function (agenda) {
    agenda.define("save total/active users count", {concurrency: 1}, async (job) => {
        try {
            let counts = await getTotalAndActiveUsersCount();
            if (!counts) {
                return {status: 'error'};
            }
            let saveResult = await saveTotalAndActiveUsersCount(counts);
            if (saveResult === 'error') {
                return {status: 'error'};
            }
            return {status: 'ok'};
        } catch (error) {
            saveError(error);
            return {status: 'error'};
        }
    });
}

