import dotenv from 'dotenv';

dotenv.config({path: './.env'});

export default Object.freeze({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3000,
    printErrors: process.env.PRINT_ERRORS,
    crawler: Object.freeze({
        concurrency: process.env.CRAWLER_CONCURRENCY,
        disable: process.env.DISABLE_CRAWLER === 'true',
        pauseOnHighLoad: process.env.PAUSE_CRAWLER_ON_HIGH_LOAD !== 'false',
        totalMemory: Number(process.env.CRAWLER_TOTAL_MEMORY || 512),
        memoryLimit: Number(process.env.CRAWLER_MEMORY_LIMIT || 0),
        cpuLimit: Number(process.env.CRAWLER_CPU_LIMIT || 95),
        pauseDurationLimit: Number(process.env.CRAWLER_PAUSE_DURATION_LIMIT || 10),
    }),
    disableThumbnailCreate: process.env.DISABLE_THUMBNAIL_CREATE,
    databaseURL: process.env.DATABASE_URL,
    sentryDns: process.env.SENTRY_DNS,
    apiKeys: Object.freeze({
        imdbApiKey: process.env.IMDB_API_KEY ? process.env.IMDB_API_KEY.split('-') : [],
        omdbApiKeys: getOmdbApiKeys(),
    }),
    cloudStorage: Object.freeze({
        endpoint: process.env.CLOUAD_STORAGE_ENDPOINT,
        accessKeyId: process.env.CLOUAD_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUAD_STORAGE_SECRET_ACCESS_KEY,
        websiteEndPoint: process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT,
        bucketNamePrefix: process.env.BUCKET_NAME_PREFIX || '',
    }),
    remoteBrowser: getRemoteBrowsers(),
    email: Object.freeze({
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
    }),
    jwt: Object.freeze({
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        accessTokenExpire: '1h',
        refreshTokenExpire: '180d',
    }),
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "").split('---'),
    diskSpace: Object.freeze({
        totalDiskSpace: Number(process.env.TOTAL_DISK_SPACE || 500),
        defaultUsedDiskSpace: Number(process.env.DEFAULT_USED_DISK_SPACE || 0),
    }),
});

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
