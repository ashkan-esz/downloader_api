## API Parameters

| param name     | Values | Description                     | Required |
|----------------|--------|---------------------------------|----------|
| **`password`** | String | password of crawler starter api | `true`   |

> they are case-insensitive so `animeTopAiring` and `animetopairing` are equal.

## API Resources

- [PUT /crawler/[password]](#put-crawlerpassword)
- [PUT /crawler/domainChange/[password]](#put-crawlerdomainchangepassword)

<br />
<br />

### PUT /crawler/[password]

> do not use this

Example: https://downloader-node-api.herokuapp.com/crawler/{PASSWORD}/?sourceName=digimoviez&mode=0&handleDomainChange=false

additional parameters:

| param name               | Values       | Description          | Required                |
|--------------------------|--------------|----------------------|-------------------------|
| **`mode`**               | 0 , 1 , 2    | crawling mode        | `false (default: 0)`    |
| **`sourceName`**         | string       | source name to crawl | `true`                  |
| **`handleDomainChange`** | true , false | crawler flag         | `false (default: true)` |
| **`handleCastUpdate`**   | true , false | crawler flag         | `false (default: true)` |

<br />

### PUT /crawler/domainChange/[password]

> do not use this

Example: https://downloader-node-api.herokuapp.com/crawler/domainChange/{PASSWORD}

<br />

# API
- Open [user api docs](API.USER.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [schema](SCHEMA.README.md).
