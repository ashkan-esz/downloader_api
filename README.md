
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
| **`REMOTE_BROWSER_ENDPOINT`** | end point of remote headless browser (puppeteer) | `true` |
| **`DATABASE_URL`**            | mongodb url | `true` |
| **`SENTRY_DNS`** |  | `false` |
| **`CLOUAD_STORAGE_ENDPOINT`**          | s3 sever url | `true` |
| **`CLOUAD_STORAGE_WEBSITE_ENDPOINT`**  | s3 static website postfix | `true` |
| **`CLOUAD_STORAGE_ACCESS_KEY`**        |  | `true` |
| **`CLOUAD_STORAGE_SECRET_ACCESS_KEY`** |  | `true` |
| **`IMDB_API_KEY`**        |  | `true` |
| **`OMDB_API_KEY{i}`**     | `i` start from 1 to infinit. like OMDB_API_KEY1 | `true` |
| **`PRINT_ERRORS`**        |  | `false (default:false)` |
| **`CRAWLER_CONCURRENCY`** |  | `false` |
| **`EMAIL_USERNAME`** |  | `true` |
| **`EMAIL_PASSWORD`** |  | `true` |


## Future updates
- [x]  Direct download link.
- [x]  Serve local poster/trailer.
- [x]  Efficient and low memory usage web crawler.
- [x]  Handle sources url changes.
- [ ]  Authentication.
- [ ]  Movie suggestion.
- [ ]  Clustring.
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

## Author

**Ashkan Esz**

- [Profile](https://github.com/ashkan-esz "Ashkan esz")
- [Email](mailto:ashkanaz2828@gmail.com?subject=Hi "Hi!")
