import config from "../config/index.js";
import * as Sentry from "@sentry/node";

export async function saveErrorIfNeeded(error) {
    if (
        (!error.response || error.response.status !== 404) &&
        (!error.request || !error.request.res || error.request.res.statusCode !== 404) &&
        error.code !== 'ENOTFOUND' &&
        error.code !== 'EPROTO' &&
        error.code !== 'Z_BUF_ERROR' &&
        error.code !== 'DEPTH_ZERO_SELF_SIGNED_CERT'
    ) {
        await saveError(error);
    }
}

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
