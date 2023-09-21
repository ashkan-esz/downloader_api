
# downloader api

A webcrawler based movie/anime data provider with rest api's


## Motivation
There is lots of movie sources to download from and also they change url frequently, so I made this to collect them all in one place and handle url changes.

## Getting started

### 1. Install and start remote headless browser

Go to [remoteHeadlessBrowser](https://github.com/ashkan-esz/downloader_remotebrowser/) and follow instructions. (`REMOTE_BROWSER_PASSWORD`, `REMOTE_BROWSER_ENDPOINT`) 

**Note: Without this almost half of movie sources and url updater doesn't work .**


### 2. Install dependencies and Environment variables
First set all environment variables to .env file in your local environment or to server shell. then use npm script `npm install` to install dependencies.

### 3. Setup Db collections

Collection information listed in [`src/data/createCollectionsIndex`](src/data/createCollectionsIndex.js).

you can run npm script `npm run pre_start` to create collections and their indexes automatically.

**NOTE: schema for movie sources used by crawler can be found in [sources schema](readme/SOURCES.README.md).
(this can be done from admin panel too)**

> a file with the same name of [sourceName] exist in [sources](src/crawlers/sources)
> and can be accessed from [sourcesArray](src/crawlers/sourcesArray.js).

### 4. Setup cloud storage

Config your own preferred cloud storage provider (s3) and create buckets with names of [serverstatic, cast, download-subtitle, poster, download-trailer].

you can run npm script `npm run pre_start` to create buckes automatically.
> Don't forget to add file 'defaultProfile.png' in bucket 'serverstatic'.

**Note: all of them must be public and enable static website.**


### 5. Finally, the end

Set the rest of environment variables, like `CLOUAD_STORAGE_ENDPOINT`.

if you have more than 1024mb of ram (which you should have) change `--max_old_space_size` values in start script (or use docker!).

start npm script `npm run start` and boom server is working.

### Note

In few hours (almost every 3 hour) crawler start and populates database, also you can start the crawler with api (POST /crawler/[password])

(you can also start crawler from admin panel)

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

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
| **`SENTRY_DNS`**                       | see [sentry.io](https://sentry.io)                                                                                             | `false`  |               |
| **`CLOUAD_STORAGE_ENDPOINT`**          | s3 sever url, for example see [arvancloud.com](https://www.arvancloud.com/en)                                                  | `true`   |               |
| **`CLOUAD_STORAGE_WEBSITE_ENDPOINT`**  | s3 static website postfix                                                                                                      | `true`   |               |
| **`CLOUAD_STORAGE_ACCESS_KEY`**        |                                                                                                                                | `true`   |               |
| **`CLOUAD_STORAGE_SECRET_ACCESS_KEY`** |                                                                                                                                | `true`   |               |
| **`BUCKET_NAME_PREFIX`**               | if bucket names not exist use this. for example 'poster' --> 'test_poster'                                                     | `false`  |               |
| **`IMDB_API_KEY`**                     | keys split by `-` . see [imdb-api.com](https://imdb-api.com/)                                                                  | `true`   |               |
| **`OMDB_API_KEY{i}`**                  | `i` start from 1. like OMDB_API_KEY1, see [omdbapi.com](https://www.omdbapi.com/)                                              | `true`   |               |
| **`GOOGLE_API_KEY`**                   | see [google console](https://console.cloud.google.com/apis)                                                                    | `true`   |               |
| **`PRINT_ERRORS`**                     |                                                                                                                                | `false`  | false         |
| **`DISABLE_CRAWLER`**                  | crawler doesn't run                                                                                                            | `false`  | false         |
| **`DISABLE_THUMBNAIL_CREATE`**         | thumbnails doesnt create                                                                                                       | `false`  | false         |
| **`CRAWLER_CONCURRENCY`**              |                                                                                                                                | `false`  |               |
| **`MAILSERVER_HOST`**                  |                                                                                                                                | `false`  | localhost     |
| **`MAILSERVER_PORT`**                  |                                                                                                                                | `false`  | 587           |
| **`MAILSERVER_USERNAME`**              |                                                                                                                                | `false`  |               |
| **`MAILSERVER_PASSWORD`**              |                                                                                                                                | `false`  |               |
| **`USER_SESSION_PAGE`**                |                                                                                                                                | `false`  |               |
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

>**NOTE: check [configs schema](readme/CONFIGS.README.md) for other configs that read from db.**


## Future updates
- [x]  Direct download link.
- [x]  Serve local poster/trailer.
- [x]  Efficient and low memory usage web crawler.
- [x]  Handle sources url changes.
- [x]  Authentication.
- [ ]  Movie suggestion.
- [ ]  Clustering.
- [ ]  Documentation.
- [ ]  Write test.


## API Routes
- Open [swagger docs api](http://localhost:3000/docs). (always updated)
- Open [swagger docs file](docs/swagger.yaml). (always updated)
- Open [user api docs](readme/API.USER.README.md).
- Open [movie api docs](readme/API.MOVIES.README.md).
- Open [utils api docs](readme/API.UTILS.README.md).
- Open [schema](readme/SCHEMA.README.md).
- Open [sources schema](readme/SOURCES.README.md).
- Open [configs schema](readme/CONFIGS.README.md).

## Clients
- [movie tracker](https://github.com/amir-7979/MovieTrracker) (Flutter)
- [downloader_app](https://github.com/ashkan-esz/downloader_app) (React Native)
- [movietracker_bot](https://github.com/amir-7979/movietracker_bot) (Telegram Bot)

## Contributing

Contributions are always welcome!

See `contributing.md` for ways to get started.

Please adhere to this project's `code of conduct`.

##  Support
Contributions, issues, and feature requests are welcome!
Give a ⭐️ if you like this project!

## Related

- [remoteHeadlessBrowser](https://github.com/ashkan-esz/downloader_remotebrowser/)
- [downloader_app](https://github.com/ashkan-esz/downloader_app/)
- [downloader_adminPanel](https://github.com/ashkan-esz/downloader_adminpanel/)

## Extra

- docker repository is ashkanaz2828/downloader_api
- Change `CMD [ "node", "src/server.js"]` to `CMD [ "node", "src/tracing.js"]` in Dockerfile to enable opentelemetry.
- Run `make signoz-install` to instakk and start signoz apm dashboard. (http://localhost:3301)

- mailServer:
    1. https://hub.docker.com/r/boky/postfix
    2. https://docker-mailserver.github.io/docker-mailserver/latest/usage/
    3. create subdomain 'mail' point to server ip. example:: A   mail   SERVER_IP
    4. create record 'MX' with name of domain and point to subdomain. example:: MX   movietracker.mom   mail.movietracker.mom  DNS only
    5. add rDNS or PTR record to point to domain. example:: PTR   SERVER_IP   movietracker.mom  DNS only
    6. add rDNS or PTR in server to point to domain. exmaple:: movietracker.mom
    7. add SPF record to dns. example:: TXT   movietracker.mom   v=spf1 ip4:SERVER_IP include:movietracker.mom +all  DNS only

## Author

**Ashkan Esz**

- [Profile](https://github.com/ashkan-esz "Ashkan esz")
- [Email](mailto:ashkanaz2828@gmail.com?subject=Hi "Hi!")
