import dotenv from 'dotenv';

dotenv.config({path: './.env'});

export default {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3000,
    printErrors: process.env.PRINT_ERRORS,
    disableCrawler: process.env.DISABLE_CRAWLER,
    disableThumbnailCreate: process.env.DISABLE_THUMBNAIL_CREATE,
    crawlerConcurrency: process.env.CRAWLER_CONCURRENCY,
    databaseURL: process.env.DATABASE_URL,
    sentryDns: process.env.SENTRY_DNS,
    imdbApiKey: process.env.IMDB_API_KEY ? process.env.IMDB_API_KEY.split('-') : [],
    omdbApiKeys: getOmdbApiKeys(),
    cloudStorage: {
        endpoint: process.env.CLOUAD_STORAGE_ENDPOINT,
        accessKeyId: process.env.CLOUAD_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUAD_STORAGE_SECRET_ACCESS_KEY,
        websiteEndPoint: process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT,
        bucketNamePrefix: process.env.BUCKET_NAME_PREFIX || '',
    },
    remoteBrowser: getRemoteBrowsers(),
    email: {
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
    },
    jwt: {
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        accessTokenExpire: '1h',
        refreshTokenExpire: '180d',
    },
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "").split('---'),
    corsAllowedOrigins_local: [
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://127.0.0.1:5000',
        'http://localhost:5000',
    ],
}

function getRemoteBrowsers() {
    let remoteBrowsers = [];
    let i = 1;
    while (true) {
        let endpoint = process.env[`REMOTE_BROWSER_ENDPOINT${i}`];
        let password = process.env[`REMOTE_BROWSER_PASSWORD${i}`];
        let tabsCount = process.env[`REMOTE_BROWSER_TABS_COUNT${i}`] || 3;
        if (!endpoint || !password) {
            break;
        }
        remoteBrowsers.push({
            endpoint: endpoint,
            password: password,
            tabsCount: tabsCount,
        });
        i++;
    }
    return remoteBrowsers;
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
