
# downloader api

A webcrawler based movie/anime data provider with rest api's


## Motivation
There is lots of movie sources to download from and also they change url frequently, so I made this to collect them all in one place and handle url changes.

## Getting started

#### 1. install docker in your system

#### 2. copy/clone this project
#### 3. run `docker-compose up --build`
#### 4. wait for it
<details>  
<summary>5. now the system is up and running </summary>

- Main Server: localhost:3000 || api.movieTracker.mom 
- Chat Server: localhost:3002 || chat.movieTracker.mom
- Torrent Server: localhost:3003 || download.movieTracker.mom
- Admin Panel: localhost:7070 || admin.movieTracker.mom 
- Website: localhost:9090 || movieTracker.mom 
- RemoteBrowser: localhost:5000
- Telegram Bot 
- Mail Service 
- other services: Nginx, Redis, RabbitMq, MailServer, Postgres, Mongodb
</details>

## Getting started (without docker)

**check [installation](docs/INSTALL.README.md).**

## Extra Stuff
<details>
<summary> database and s3 </summary>

### Setup Db collections
1. set env `INIT_DBS_ON_START` to `true` or
2. you can run npm script `npm run pre_start` to create collections and their indexes automatically.
> **Note: more info on [setup db](docs/INSTALL.README.md#3-setup-db-collections)**


### Setup cloud storage
1. set env `INIT_DBS_ON_START` to `true` or
2. you can run npm script `npm run pre_start` to create buckets automatically.

> **Note: more info on [setup s3](docs/INSTALL.README.md#4-setup-cloud-storage)**
</details>

<details>
<summary> crawler </summary>

In few hours (almost every 3 hour) crawler start and populates database, also you can start the crawler with api (POST /crawler/[password])

> you can also start crawler from admin panel
</details>

## Environment Variables

To run this project, you will need to add the following environment variables to your env/.env file

| Prop                                   | Description                                                                                                         | Required | Default Value |
|----------------------------------------|---------------------------------------------------------------------------------------------------------------------|----------|---------------|
| **`MONGODB_DATABASE_URL`**             | mongodb url, for example see [mongodb.com](https://www.mongodb.com/)                                                | `true`   |               |
| **`POSTGRE_DATABASE_URL`**             | postgresSql url                                                                                                     | `true`   |               |
| **`POSTGRES_PASSWORD`**                |                                                                                                                     | `true`   |               |
| **`REDIS_URL`**                        | redis url                                                                                                           | `true`   |               |
| **`REDIS_PASSWORD`**                   | redis password                                                                                                      | `true`   |               |
| **`RABBITMQ_URL`**                     |                                                                                                                     | `true`   |               |
| **`SENTRY_DNS`**                       | see [sentry.io](https://sentry.io)                                                                                  | `false`  |               |
| **`CLOUAD_STORAGE_ENDPOINT`**          | s3 sever url, for example see [arvancloud.com](https://www.arvancloud.com/en)                                       | `true`   |               |
| **`CLOUAD_STORAGE_WEBSITE_ENDPOINT`**  | s3 static website postfix                                                                                           | `true`   |               |
| **`CLOUAD_STORAGE_ACCESS_KEY`**        |                                                                                                                     | `true`   |               |
| **`CLOUAD_STORAGE_SECRET_ACCESS_KEY`** |                                                                                                                     | `true`   |               |
| **`OMDB_API_KEY{i}`**                  | `i` start from 1. like OMDB_API_KEY1, see [omdbapi.com](https://www.omdbapi.com/)                                   | `true`   |               |
| **`GOOGLE_API_KEY`**                   | see [google console](https://console.cloud.google.com/apis)                                                         | `true`   |               |
| **`ACCESS_TOKEN_SECRET`**              |                                                                                                                     | `true`   |               |
| **`REFRESH_TOKEN_SECRET`**             |                                                                                                                     | `true`   |               |
| **`CORS_ALLOWED_ORIGINS`**             | address joined by `---` example: https://download-admin.com---https:download-website.com                            | `false`  |               |
| **`DB_BACKUP_PASSWORD`**               | password used on db backup files                                                                                    | `false`  |               |
| **`DOMAIN`**                           | base domain, used for cookies domain and subdomain                                                                  | `false`  |               |

>**NOTE: check [env variable](docs/ENV.README.md) for full list of environment variables.**

>**NOTE: check [configs schema](docs/CONFIGS.README.md) for other configs that read from db.**


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
- Open [sources schema](docs/SOURCES.README.md).
- Open [configs schema](docs/CONFIGS.README.md).
- Open [env variable](docs/ENV.README.md).

## Related
- [remoteHeadlessBrowser](https://github.com/ashkan-esz/downloader_remotebrowser/)
- [downloader_adminPanel](https://github.com/ashkan-esz/downloader_adminpanel/)
- [downloader_gochat](https://github.com/ashkan-esz/downloader_gochat/)
- [downloader_torrent](https://github.com/ashkan-esz/downloader_torrent/)
- [downloader_email](https://github.com/ashkan-esz/downloader_email/)

## Clients
- [downloader_app](https://github.com/ashkan-esz/downloader_app) (React Native)
- [movietracker_bot](https://github.com/ashkan-esz/downloader_telegrambot) (Telegram Bot)

## Extra
- docker repository is ashkanaz2828/downloader_api
- Change `CMD [ "node", "src/server.js"]` to `CMD [ "node", "src/tracing.js"]` in Dockerfile to enable opentelemetry.
- Run `make signoz-install` to install and start signoz apm dashboard. (http://localhost:3301)


## Contributing

Contributions are always welcome!

See `contributing.md` for ways to get started.

Please adhere to this project's `code of conduct`.

##  Support
Contributions, issues, and feature requests are welcome!
Give a ⭐️ if you like this project!


## Author
**Ashkan Esz**
- [Profile](https://github.com/ashkan-esz "Ashkan esz")
- [Email](mailto:ashkanaz2828@gmail.com?subject=Hi "Hi!")
