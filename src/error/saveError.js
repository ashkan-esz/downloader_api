import config from "../config";
import * as Sentry from "@sentry/node";

export async function saveError(error) {
    if (config.nodeEnv === 'production') {
        if (error.isAxiosError) {
            Sentry.withScope(function (scope) {
                scope.setExtra('axiosErrorData', error);
                scope.setTag("axiosError", "axiosError");
                Sentry.captureException(error);
            });
        } else {
            Sentry.captureException(error);
        }
        if (config.printErrors === 'true') {
            console.trace();
            console.log(error);
            console.log();
        }
    } else {
        console.trace();
        console.log(error);
        console.log();
    }
}
