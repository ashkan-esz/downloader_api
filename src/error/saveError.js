import config from "../config";
import * as Sentry from "@sentry/node";

export async function saveError(error) {
    if (config.nodeEnv === 'production') {
        Sentry.captureException(error);
        if (config.printErrors === 'true') {
            console.log(error);
            console.log();
        }
    } else {
        console.log(error);
        console.log();
    }
}
