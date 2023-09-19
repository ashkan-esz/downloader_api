
## Sources Schema

```
> a mongodb collection with name `sources` with single doc in format of:

{
    title: "sources",
    [sourceName]: {
        movie_url: "https://example.com/page/",
        serial_url: "https://example.com/serie/page/", //if needed
        lastCrawlDate: Date,
        crawlCycle: Number, // 0 means no cycle
        cookies: Array({
           name:String,
           value:String,
           expire: Int(Date) //0 means no expire
        }),
        disabled: Boolean,
        disabledDate: Date,
        addDate: Date,
        lastDomainChangeDate: Date,
        userData: {
            userId: Int,
            role: String,
            rawUsername: String,
        }
    },
}

for example ::
{
    title: "sources",
    digimoviez: {
        movie_url: "https://digimovie.vip/page/",
        serial_url: "https://digimovie.vip/serie/page/",
        lastCrawlDate: 2022-09-14T18:37:22.403Z,
        crawlCycle: 3,
        cookies: [],
        disabled: false,
        disabledDate: 0,
        addDate: 2021-10-05T21:37:57.849+00:00,
        lastDomainChangeDate: 2021-12-05T21:37:57.849+00:00,
    },
    film2movie: {
        movie_url: "https://www.film2movie.asia/page/",
        lastCrawlDate: 2022-09-10T18:37:22.403Z,
        crawlCycle: 0,
        cookies: [],
        disabled: false,
        disabledDate: 0,
        addDate: 2021-10-09T21:37:57.849+00:00,
        lastDomainChangeDate: 2021-12-09T21:37:57.849+00:00,
    },
    ....
    ....
}

```


<br />
<br />

# API

- Open [user api docs](API.USER.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [utils api docs](API.UTILS.README.md).
- Open [schema](SCHEMA.README.md).
- Open [configs schema](CONFIGS.README.md).
