
# downloader api

A webcrawler based movie/anime data provider with rest api's


## Motivation
There is lots of movie sources to download from and also they change url frequently , so i made this to collect them all in one place and handle url changes.

## How to use
First install and start remote headless browser from [remoteHeadlessBrowser](https://github.com/ashkan-esz/downloader_remotebrowser/) .  
then use command `npm install` and then `npm run start`.


> you may want to change `--max_old_space_size` and `--gc_interval` values in start script.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

| Prop                       | Description                                          | Required |
| -------------------------- | ---------------------------------------------------- | -------- |
| **`PORT`**                 | server port  | `false (default:3000)` |
| **`UPDATE_PASSWORD`**         | password to start web crawler if needed. | `true` |
| **`REMOTE_BROWSER_PASSWORD`** | password of remote headless browser (puppeteer) | `true` |
| **`REMOTE_BROWSER_ENDPOINT`** | end point of remote headless browser (puppeteer), [source](https://github.com/ashkan-esz/downloader_remotebrowser/)  | `true` |
| **`DATABASE_URL`**            | mongodb url, for example see [mongodb.com](https://www.mongodb.com/) | `true` |
| **`SENTRY_DNS`** | see [sentry.io](https://sentry.io) | `false` |
| **`CLOUAD_STORAGE_ENDPOINT`**          | s3 sever url, for example see [arvancloud.com](https://www.arvancloud.com/en) | `true` |
| **`CLOUAD_STORAGE_WEBSITE_ENDPOINT`**  | s3 static website postfix | `true` |
| **`CLOUAD_STORAGE_ACCESS_KEY`**        |  | `true` |
| **`CLOUAD_STORAGE_SECRET_ACCESS_KEY`** |  | `true` |
| **`IMDB_API_KEY`**        | see [imdb-api.com](https://imdb-api.com/) | `true` |
| **`OMDB_API_KEY{i}`**     | `i` start from 1 to infinite. like OMDB_API_KEY1, see [omdbapi.com](https://www.omdbapi.com/) | `true` |
| **`PRINT_ERRORS`**        |  | `false (default:false)` |
| **`CRAWLER_CONCURRENCY`** |  | `false` |
| **`EMAIL_USERNAME`** |  | `true` |
| **`EMAIL_PASSWORD`** |  | `true` |
| **`ACCESS_TOKEN_SECRET`** |  | `true` |
| **`REFRESH_TOKEN_SECRET`** |  | `true` |


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
    },
    film2movie: {
        movie_url: "https://www.film2movie.asia/page/",
        page_count: 1488,
    },
    ....
}

>> a file with the same name of [sourceName] exist in src/crawlers/sources/[sourceName].js
>> and can be accessed from src/crawlers/sourcesArray.js 

```

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

## Api routes
Open [api routes](API.README.md) for api docs.

## Contributing

Contributions are always welcome!

See `contributing.md` for ways to get started.

Please adhere to this project's `code of conduct`.

##  Support
Contributions, issues, and feature requests are welcome!
Give a ⭐️ if you like this project!

## Related

- [downloader_app](https://github.com/ashkan-esz/downloader_app/)

## Extra

This product includes IP2Location LITE data available from http://www.ip2location.com.

## Author

**Ashkan Esz**

- [Profile](https://github.com/ashkan-esz "Ashkan esz")
- [Email](mailto:ashkanaz2828@gmail.com?subject=Hi "Hi!")
