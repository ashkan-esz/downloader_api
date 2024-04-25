## Environment Variables

To run this project, you will need to add the following environment variables to your env/.env file

| Prop                                   | Description                                                                                                                    | Required | Default Value |
|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|----------|---------------|
| **`PORT`**                             | server port                                                                                                                    | `false`  | 3000          |
| **`REMOTE_BROWSER_PASSWORD{i}`**       | `i` start from 1. like REMOTE_BROWSER_PASSWORD1, password of remote headless browser (puppeteer)                               | `true`   |               |
| **`REMOTE_BROWSER_ENDPOINT{i}`**       | end point of remote headless browser (puppeteer), [source](https://github.com/ashkan-esz/downloader_remotebrowser/)            | `true`   |               |
| **`REMOTE_BROWSER_TABS_COUNT{i}`**     | number of tabs that set on remote headless browser (puppeteer)                                                                 | `false`  | 7             |
| **`MONGODB_DATABASE_URL`**             | mongodb url, for example see [mongodb.com](https://www.mongodb.com/)                                                           | `true`   |               |
| **`POSTGRE_DATABASE_URL`**             | postgresSql url                                                                                                                | `true`   |               |
| **`POSTGRES_PASSWORD`**                |                                                                                                                                | `true`   |               |
| **`REDIS_URL`**                        | redis url                                                                                                                      | `true`   |               |
| **`REDIS_PASSWORD`**                   | redis password                                                                                                                 | `true`   |               |
| **`RABBITMQ_URL`**                     |                                                                                                                                | `true`   |               |
| **`SENTRY_DNS`**                       | see [sentry.io](https://sentry.io)                                                                                             | `false`  |               |
| **`CLOUAD_STORAGE_ENDPOINT`**          | s3 sever url, for example see [arvancloud.com](https://www.arvancloud.com/en)                                                  | `true`   |               |
| **`CLOUAD_STORAGE_WEBSITE_ENDPOINT`**  | s3 static website postfix                                                                                                      | `true`   |               |
| **`CLOUAD_STORAGE_ACCESS_KEY`**        |                                                                                                                                | `true`   |               |
| **`CLOUAD_STORAGE_SECRET_ACCESS_KEY`** |                                                                                                                                | `true`   |               |
| **`BUCKET_NAME_PREFIX`**               | if bucket names not exist use this. for example 'poster' --> 'test_poster'                                                     | `false`  |               |
| **`OMDB_API_KEY{i}`**                  | `i` start from 1. like OMDB_API_KEY1, see [omdbapi.com](https://www.omdbapi.com/)                                              | `true`   |               |
| **`GOOGLE_API_KEY`**                   | see [google console](https://console.cloud.google.com/apis)                                                                    | `true`   |               |
| **`PRINT_ERRORS`**                     |                                                                                                                                | `false`  | false         |
| **`DISABLE_CRAWLER`**                  | crawler doesn't run                                                                                                            | `false`  | false         |
| **`DISABLE_TORRENT_CRAWLER`**          | torrent crawler doesn't run                                                                                                    | `false`  | false         |
| **`DISABLE_THUMBNAIL_CREATE`**         | thumbnails doesnt create                                                                                                       | `false`  | false         |
| **`CRAWLER_CONCURRENCY`**              |                                                                                                                                | `false`  |               |
| **`ACCESS_TOKEN_SECRET`**              |                                                                                                                                | `true`   |               |
| **`REFRESH_TOKEN_SECRET`**             |                                                                                                                                | `true`   |               |
| **`CORS_ALLOWED_ORIGINS`**             | address joined by `---` example: https://download-admin.com---https:download-website.com                                       | `false`  |               |
| **`PAUSE_CRAWLER_ON_HIGH_LOAD`**       | with this flag crawler get paused inorder to prevent server crash                                                              | `false`  | true          |
| **`CRAWLER_PAUSE_DURATION_LIMIT`**     | Number of minutes to crawler can be paused on high load                                                                        | `false`  | 10            |
| **`CRAWLER_TOTAL_MEMORY`**             | this value get used to determine crawler need to get paused. (MB)                                                              | `false`  | 1024          |
| **`CRAWLER_MEMORY_LIMIT`**             | if the memory usage is higher than this value, crawler will pause, if not set, it will use 85% of `CRAWLER_TOTAL_MEMORY`. (MB) | `false`  | 0             |
| **`CRAWLER_CPU_LIMIT`**                | if the cpu usage is higher than this value, crawler will pause                                                                 | `false`  | 95            |
| **`TOTAL_DISK_SPACE`**                 | amount of disk space that app can use, by default its 1024. (MB)                                                               | `false`  | 1024          |
| **`DEFAULT_USED_DISK_SPACE`**          | amount of disk space that app use in init state, by default its. (MB)                                                          | `false`  | 0             |
| **`INIT_DBS_ON_START`**                | create mongodb collections and indexes, create testUser, create s3 buckets                                                     | `false`  |               |
| **`ADMIN_USER`**                       | admin username which created automatically on app start, can be changed after                                                  | `false`  |               |
| **`ADMIN_PASS`**                       | admin password which created automatically on app start, can be changed after                                                  | `false`  |               |
| **`DB_BACKUP_PASSWORD`**               | password used on db backup files                                                                                               | `false`  |               |
| **`IGNORE_HENTAI`**                    | dont add hentai to db                                                                                                          | `false`  | true          |
| **`DOMAIN`**                           | base domain, used for cookies domain and subdomain                                                                             | `false`  |               |

>**NOTE: check [configs schema](CONFIGS.README.md) for other configs that read from db.**
