const Sentry = require('@sentry/node');

export async function saveError(error) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error);
        if (process.env.PRINT_ERRORS === 'true') {
            console.log(error);
            console.log();
        }
    } else {
        console.log(error);
        console.log();
    }
}
