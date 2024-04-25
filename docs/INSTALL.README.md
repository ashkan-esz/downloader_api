## Getting started (without docker)

### 1. Install and start remote headless browser

Go to [remoteHeadlessBrowser](https://github.com/ashkan-esz/downloader_remotebrowser/) and follow instructions. (`REMOTE_BROWSER_PASSWORD`, `REMOTE_BROWSER_ENDPOINT`)

**Note: Without this almost half of movie sources and url updater doesn't work .**


### 2. Install dependencies and Environment variables
First set all environment variables to env/.env file in your local environment or to server shell. then use npm script `npm install` to install dependencies.

### 3. Setup Db collections

1. set env `INIT_DBS_ON_START` to `true` or
2. you can run npm script `npm run pre_start` to create collections and their indexes automatically.

Collection information listed in [`src/data/createCollectionsIndex`](../src/data/createCollectionsIndex.js).

> **NOTE: schema for movie sources used by crawler can be found in [sources schema](./SOURCES.README.md).
(this can be done from admin panel too)**

> a file with the same name of [sourceName] exist in [sources](../src/crawlers/sources)
> and can be accessed from [sourcesArray](../src/crawlers/sourcesArray.js).

### 4. Setup cloud storage

Config your own preferred cloud storage provider (s3) and create buckets with names of [serverstatic, cast, download-subtitle, poster, download-trailer, media-file].

1. set env `INIT_DBS_ON_START` to `true` or
2. you can run npm script `npm run pre_start` to create buckets automatically.

> Don't forget to add file 'defaultProfile.png' in bucket 'serverstatic'.

> **Note: all of them must be public and enable static website.**

### 5. Finally, the end

Set the rest of environment variables, like `CLOUAD_STORAGE_ENDPOINT`.

if you have more than 1024mb of ram (which you should have) change `--max_old_space_size` values in start script (or use docker!).

start npm script `npm run start` and boom server is working.
