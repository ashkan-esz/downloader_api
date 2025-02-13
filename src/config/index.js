import dotenv from 'dotenv';

dotenv.config({path: './.env'});

export default Object.freeze({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3000,
    printErrors: process.env.PRINT_ERRORS,
    crawler: Object.freeze({
        concurrency: process.env.CRAWLER_CONCURRENCY,
        disable: process.env.DISABLE_CRAWLER === 'true',
        torrentDisable: process.env.DISABLE_TORRENT_CRAWLER === 'true',
        pauseOnHighLoad: process.env.PAUSE_CRAWLER_ON_HIGH_LOAD !== 'false',
        totalMemory: Number(process.env.CRAWLER_TOTAL_MEMORY || 1024),
        memoryLimit: Number(process.env.CRAWLER_MEMORY_LIMIT || 0),
        cpuLimit: Number(process.env.CRAWLER_CPU_LIMIT || 95),
        pauseDurationLimit: Number(process.env.CRAWLER_PAUSE_DURATION_LIMIT || 10),
    }),
    disableThumbnailCreate: process.env.DISABLE_THUMBNAIL_CREATE,
    dataBases: Object.freeze({
        mongodb: {
            url: process.env.MONGODB_DATABASE_URL,
        },
        postgres: Object.freeze({
            url: process.env.POSTGRE_DATABASE_URL,
            password: process.env.POSTGRES_PASSWORD,
        }),
        redis: Object({
            url: process.env.REDIS_URL,
            password: process.env.REDIS_PASSWORD,
        }),
        backupPassword: process.env.DB_BACKUP_PASSWORD || '',
    }),
    rabbitmqUrl: process.env.RABBITMQ_URL,
    sentryDns: process.env.SENTRY_DNS,
    apiKeys: Object.freeze({
        omdbApiKeys: getOmdbApiKeys(),
        googleApiKey: process.env.GOOGLE_API_KEY || '',
    }),
    cloudStorage: Object.freeze({
        endpoint: process.env.CLOUAD_STORAGE_ENDPOINT,
        accessKeyId: process.env.CLOUAD_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUAD_STORAGE_SECRET_ACCESS_KEY,
        websiteEndPoint: process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT,
        bucketNamePrefix: process.env.BUCKET_NAME_PREFIX || '',
    }),
    remoteBrowser: getRemoteBrowsers(),
    jwt: Object.freeze({
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        accessTokenExpire: '1h',
        accessTokenExpireSeconds: 60 * 60,
        refreshTokenExpire: '180d',
    }),
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "").split('---').map(item => item.trim()),
    diskSpace: Object.freeze({
        totalDiskSpace: Number(process.env.TOTAL_DISK_SPACE || 1024),
        defaultUsedDiskSpace: Number(process.env.DEFAULT_USED_DISK_SPACE || 0),
    }),
    initDbsOnStart: process.env.INIT_DBS_ON_START === 'true',
    admin: Object.freeze({
        user: process.env.ADMIN_USER || '',
        pass: process.env.ADMIN_PASS || '',
    }),
    ignoreHentai: process.env.IGNORE_HENTAI !== 'false',
    serverStartTime: Date.now(),
    domain: process.env.DOMAIN,
});

function getRemoteBrowsers() {
    let remoteBrowsers = [];
    let i = 1;
    while (true) {
        let endpoint = process.env[`REMOTE_BROWSER_ENDPOINT${i}`];
        let password = process.env[`REMOTE_BROWSER_PASSWORD${i}`];
        let tabsCount = process.env[`REMOTE_BROWSER_TABS_COUNT${i}`] || 7;
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
