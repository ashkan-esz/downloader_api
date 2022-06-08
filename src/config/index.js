import dotenv from 'dotenv';

dotenv.config({path: './.env'});

export default {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3000,
    printErrors: process.env.PRINT_ERRORS,
    disableCrawler: process.env.DISABLE_CRAWLER,
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
    remoteBrowser: [{
        endpoint: process.env.REMOTE_BROWSER_ENDPOINT,
        password: process.env.REMOTE_BROWSER_PASSWORD,
        tabsCount: Number(process.env.REMOTE_BROWSER_TABS_COUNT) || 3,
    }, {
        endpoint: process.env.REMOTE_BROWSER_ENDPOINT2,
        password: process.env.REMOTE_BROWSER_PASSWORD2,
        tabsCount: Number(process.env.REMOTE_BROWSER_TABS_COUNT2) || 3,
    }].filter(item => item.endpoint && item.password),
    email: {
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
    },
    jwt: {
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        accessTokenExpire: '1h',
        refreshTokenExpire: '180d',
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
