import dotenv from 'dotenv';

dotenv.config({path: './.env'});

export default {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3000,
    printErrors: process.env.PRINT_ERRORS,
    crawlerConcurrency: process.env.CRAWLER_CONCURRENCY,
    databaseURL: process.env.DATABASE_URL,
    sentryDns: process.env.SENTRY_DNS,
    crawlerStarterPassword: process.env.UPDATE_PASSWORD,
    imdbApiKey: process.env.IMDB_API_KEY,
    omdbApiKeys: getOmdbApiKeys(),
    cloudStorage: {
        endpoint: process.env.CLOUAD_STORAGE_ENDPOINT,
        accessKeyId: process.env.CLOUAD_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUAD_STORAGE_SECRET_ACCESS_KEY,
        websiteEndPoint: process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT,
    },
    remoteBrowser: {
        endpoint: process.env.REMOTE_BROWSER_ENDPOINT,
        password: process.env.REMOTE_BROWSER_PASSWORD,
    }
}

function getOmdbApiKeys() {
    let omdbApiKeys = [];
    let i = 1;
    while (true) {
        let keys = process.env[`OMDB_API_KEY${i}`];
        if (!keys) {
            break;
        }
        omdbApiKeys.push(...keys.split('-'));
        i++;
    }
    return omdbApiKeys;
}
