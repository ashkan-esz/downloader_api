## API Parameters

| param name | Values         | Description              | Required |
|------------|----------------|--------------------------|----------|
| duration   | Number [1-120] | amount of time in minute | true     |
| force      | Boolean        | amount of time in minute | true     |
| id         | String, uuid   |                          | true     |

> they are case-insensitive.


## API Resources

- [POST /admin/login](#post-adminlogin)
- [PUT /admin/getToken](#put-admingettoken)
- [PUT /admin/crawler/start](#put-admincrawlerstart)
- [PUT /admin/crawler/pause/[duration]](#put-admincrawlerpauseduration)
- [PUT /admin/crawler/resume/[force]](#put-admincrawlerresumeforce)
- [PUT /admin/crawler/stop](#put-admincrawlerstop)
- [GET /admin/crawler/status](#get-admincrawlerstatus)
- [GET admin/crawler/history/[startTime]/[endTime]/[skip]/[limit]](#get-admincrawlerhistorystarttimeendtimeskiplimit)
- [GET admin/serverLogs/history/[startTime]/[endTime]/[skip]/[limit]](#get-adminserverlogshistorystarttimeendtimeskiplimit)
- [GET admin/serverLogs](#get-adminserverlogs)
- [PUT admin/serverLogs/remove/[id]](#put-adminserverlogsremoveid)
- [GET admin/crawler/warnings/history/[startTime]/[endTime]/[skip]/[limit]](#get-admincrawlerwarningshistorystarttimeendtimeskiplimit)
- [GET admin/crawler/sources](#get-admincrawlersources)
- [PUT admin/crawler/warnings/resolve/[id]](#put-admincrawlerwarningsresolveid)
- [GET admin/crawler/warnings](#get-admincrawlerwarnings)
- [PUT admin/crawler/editSource/[sourceName]](#put-admincrawlereditsourcesourcename)
- [PUT admin/crawler/addSource](#put-admincrawleraddsource)
- [GET admin/analysis/activeUsers/[startTime]/[endTime]/[skip]/[limit]](#get-adminanalysisactiveusersstarttimeendtimeskiplimit)
- [GET /admin/server/status](#get-adminserverstatus)
- [PUT /admin/configs/update](#put-adminconfigsupdate)
- [GET /admin/configs](#get-adminconfigs)

<br />
<br />


### POST /admin/login
> receives { __username_email__, __password__, __deviceInfo__ } in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
>
> __username_email__ means user can log in with username or email address.
>
> return Tokens. ([Tokens schema](SCHEMA.README.md#Tokens))

<br/>


### PUT /admin/getToken
> receives __deviceInfo__ in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
>
> return __Tokens__ and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))

<br/>


### PUT /admin/crawler/start

Query parameters:

| param name                   | Values    | Description          | Required                 |
|------------------------------|-----------|----------------------|--------------------------|
| **`mode`**                   | 0 , 1 , 2 | crawling mode        | `false (default: 0)`     |
| **`sourceName`**             | string    | source name to crawl | `false`                  |
| **`handleDomainChange`**     | Boolean   | crawler flag         | `false (default: true)`  |
| **`handleDomainChangeOnly`** | Boolean   | crawler flag         | `false (default: false)` |
| **`handleCastUpdate`**       | Boolean   | crawler flag         | `false (default: true)`  |

<br />

### PUT /admin/crawler/pause/[duration]
> pause crawler for `duration` minutes.

<br />

### PUT /admin/crawler/resume/[force]
> resume the paused crawler session.

<br />

### PUT /admin/crawler/stop
> stop the current crawler session.

<br />

### GET /admin/crawler/status
> return status of the crawler.

<br />

### GET admin/crawler/history/[startTime]/[endTime]/[skip]/[limit]
> return history of crawler run in the past.

<br />

### GET admin/crawler/warnings/history/[startTime]/[endTime]/[skip]/[limit]
> return history of crawler warnings.

<br />

### GET admin/serverLogs/history/[startTime]/[endTime]/[skip]/[limit]
> return history of server logs.

<br />

### GET admin/serverLogs
> return server logs.

<br />

### PUT admin/serverLogs/remove/[id]
> remove server log.

<br />

### GET admin/crawler/sources
> checkWarnings is Boolean.
> 
> return sources that get use by crawler.

<br />

### PUT admin/crawler/warnings/resolve/[id]
> resolve crawler warnings.

<br />


### GET admin/crawler/warnings
> return crawler warnings.

<br />


### PUT admin/crawler/editSource/[sourceName]
> update data of selected source.

<br />


### PUT admin/crawler/addSource
> add new source to crawler, receives data in request body.

<br />


### GET admin/analysis/activeUsers/[startTime]/[endTime]/[skip]/[limit]
> return number of total/active users in the past.

<br />

### GET /admin/server/status
> return resource status of the server

<br />

### PUT /admin/configs/update
> update configs of the server

> editable configs: [ <br />
> 'corsAllowedOrigins', <br />
> 'disableTestUserRequests', <br />
> 'disableCrawlerForDuration' <br />
> 'disableCrawler' <br />
> ]

<br />

### GET /admin/configs
> return configs of the server

<br />

# API
- Open [user api docs](API.USER.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [schema](SCHEMA.README.md).
- Open [error messages docs](ERRORMESSAGE.README.md).
- Open [configs schema](CONFIGS.README.md).