
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

```
> Also, a mongodb collection with name `sources` with single doc in format of:

{
    title: "sources",
    pageCounter_time: Date,
    [sourceName]: {
        movie_url: "https://example.com/page/",
        serial_url: "https://example.com/serie/page/", //if needed
        page_count: Number,
        serial_page_count: Number,
        lastCrawlDate: Date,
        crawlCycle: Number, // 0 means no cycle
    },
}

for example ::
{
    title: "sources",
    pageCounter_time: '2021-09-17T23:06:48.443+00:00',
    digimoviez: {
        movie_url: "https://digimovie.win/page/",
        serial_url: "https://digimovie.win/serie/page/",
        page_count: 419,
        serial_page_count: 66,
        lastCrawlDate: 2022-09-14T18:37:22.403Z,
        crawlCycle: 3,
    },
    film2movie: {
        movie_url: "https://www.film2movie.asia/page/",
        page_count: 1488,
        lastCrawlDate: 2022-09-10T18:37:22.403Z,
        crawlCycle: 0,
    },
    ....
    ....
}

```

> a file with the same name of [sourceName] exist in [sources](src/crawlers/sources)
> and can be accessed from [sourcesArray](src/crawlers/sourcesArray.js).

### 4. Setup cloud storage

Config your own preferred cloud storage provider (s3) and create buckets with names of [serverstatic, cast, download-subtitle, poster, download-trailer].

you can run npm script `npm run pre_start` to create buckes automatically.
> Don't forget to add file 'defaultProfile.png' in bucket 'serverstatic'.

**Note: all of them must be public and enable static website.**


### 5. Finally, the end

Set the rest of environment variables, like `CLOUAD_STORAGE_ENDPOINT`.

if you have more than 500mb of ram (which you should have) change `--max_old_space_size` and `--gc_interval` values in start script.

start npm script `npm run start` and boom server is working.

### Note

In few hours (almost every 3 hour) crawler start and populates database, also you can start the crawler with api (POST /crawler/[password])
 
we plan to add this step into admin panel.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

| Prop                                   | Description                                                                                                         | Required                |
|----------------------------------------|---------------------------------------------------------------------------------------------------------------------|-------------------------|
| **`PORT`**                             | server port                                                                                                         | `false (default:3000)`  |
| **`UPDATE_PASSWORD`**                  | password to start web crawler if needed.                                                                            | `true`                  |
| **`REMOTE_BROWSER_PASSWORD{i}`**       | `i` start from 1. like REMOTE_BROWSER_PASSWORD1, password of remote headless browser (puppeteer)                    | `true`                  |
| **`REMOTE_BROWSER_ENDPOINT{i}`**       | end point of remote headless browser (puppeteer), [source](https://github.com/ashkan-esz/downloader_remotebrowser/) | `true`                  |
| **`REMOTE_BROWSER_TABS_COUNT{i}`**     | number of tabs that set on remote headless browser (puppeteer)                                                      | `false (default: 3)`    |
| **`DATABASE_URL`**                     | mongodb url, for example see [mongodb.com](https://www.mongodb.com/)                                                | `true`                  |
| **`SENTRY_DNS`**                       | see [sentry.io](https://sentry.io)                                                                                  | `false`                 |
| **`CLOUAD_STORAGE_ENDPOINT`**          | s3 sever url, for example see [arvancloud.com](https://www.arvancloud.com/en)                                       | `true`                  |
| **`CLOUAD_STORAGE_WEBSITE_ENDPOINT`**  | s3 static website postfix                                                                                           | `true`                  |
| **`CLOUAD_STORAGE_ACCESS_KEY`**        |                                                                                                                     | `true`                  |
| **`CLOUAD_STORAGE_SECRET_ACCESS_KEY`** |                                                                                                                     | `true`                  |
| **`BUCKET_NAME_PREFIX`**               | if bucket names not exist use this. for example 'poster' --> 'test_poster'                                          | `false`                 |
| **`IMDB_API_KEY`**                     | keys split by `-` see [imdb-api.com](https://imdb-api.com/)                                                         | `true`                  |
| **`OMDB_API_KEY{i}`**                  | `i` start from 1. like OMDB_API_KEY1, see [omdbapi.com](https://www.omdbapi.com/)                                   | `true`                  |
| **`PRINT_ERRORS`**                     |                                                                                                                     | `false (default:false)` |
| **`DISABLE_CRAWLER`**                  | crawler doesn't run                                                                                                 | `false (default:false)` |
| **`DISABLE_THUMBNAIL_CREATE`**         | thumbnails doesnt create                                                                                            | `false (default:false)` |
| **`CRAWLER_CONCURRENCY`**              |                                                                                                                     | `false`                 |
| **`EMAIL_USERNAME`**                   |                                                                                                                     | `true`                  |
| **`EMAIL_PASSWORD`**                   |                                                                                                                     | `true`                  |
| **`ACCESS_TOKEN_SECRET`**              |                                                                                                                     | `true`                  |
| **`REFRESH_TOKEN_SECRET`**             |                                                                                                                     | `true`                  |



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
- Open [admin api docs](readme/API.ADMIN.README.md).
- Open [user api docs](readme/API.USER.README.md).
- Open [movie api docs](readme/API.MOVIES.README.md).

## Clients
- [movie tracker](https://github.com/amir-7979/MovieTrracker) (Flutter)
- [downloader_app](https://github.com/ashkan-esz/downloader_app) (React Native)

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

## Extra

This product includes IP2Location LITE data available from http://www.ip2location.com.

## Author

**Ashkan Esz**

- [Profile](https://github.com/ashkan-esz "Ashkan esz")
- [Email](mailto:ashkanaz2828@gmail.com?subject=Hi "Hi!")
