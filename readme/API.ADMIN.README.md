## API Parameters

| param name           | Values              | Description                                                                                 | Required |
|----------------------|---------------------|---------------------------------------------------------------------------------------------|----------|
| duration             | Number [1-120]      | amount of time in minute                                                                    | true     |
| force                | Boolean             | amount of time in minute                                                                    | true     |
| id                   | String, uuid        |                                                                                             | true     |
| ids                  | Array(String, uuid) |                                                                                             | true     |
| mutateType           | String              | Enum(`enable`, `disable`)                                                                   | true     |
| all                  | Boolean             |                                                                                             | false    |
| sourceName           | String              |                                                                                             | true     |
| url                  | String              |                                                                                             | true     |
| serverAnalysisFields | String              | Enum('userCounts', 'crawlerLogs', 'serverLogs', 'warnings', 'googleCacheCalls', 'badLinks') | true     |
| page                 | Number start from 1 |                                                                                             | true     |
| days                 | Number start from 1 |                                                                                             | true     |

> they are case-insensitive.


## API Resources

- [POST /admin/login](#post-adminlogin)
- [PUT /admin/getToken](#put-admingettoken)
- [PUT /admin/crawler/start](#put-admincrawlerstart)
- [PUT /admin/crawler/pause/[duration]](#put-admincrawlerpauseduration)
- [PUT /admin/crawler/resume/[force]](#put-admincrawlerresumeforce)
- [PUT /admin/crawler/stop](#put-admincrawlerstop)
- [GET /admin/crawler/status](#get-admincrawlerstatus)
- [GET admin/crawler/sources](#get-admincrawlersources)
- [PUT admin/crawler/editSource/[sourceName]](#put-admincrawlereditsourcesourcename)
- [PUT admin/crawler/addSource](#put-admincrawleraddsource)
- [GET admin/analysis/[serverAnalysisFieldName]/[startTime]/[endTime]/[skip]/[limit]](#get-adminanalysisserveranalysisfieldnamestarttimeendtimeskiplimit)
- [GET admin/analysis/currentMonth/[serverAnalysisFieldName][page]](#get-adminanalysiscurrentmonthserveranalysisfieldnamepage)
- [PUT admin/analysis/resolve/[serverAnalysisFieldName]/[id]](#put-adminanalysisresolveserveranalysisfieldnameid)
- [PUT admin/analysis/resolve/[serverAnalysisFieldName]](#put-adminanalysisresolveserveranalysisfieldname)
- [PUT admin/analysis/resolve/[serverAnalysisFieldName]/lastDays/[days]](#put-adminanalysisresolveserveranalysisfieldnamelastdaysdays)
- [GET /admin/server/status](#get-adminserverstatus)
- [GET /admin/remotebrowsers/status](#get-adminremotebrowsersstatus)
- [PUT /admin/remotebrowsers/[mutateType]/[id]](#put-adminremotebrowsersmutatetypeid)
- [GET /admin/remotebrowsers/checkSource/[sourceName]/[url]](#get-adminremotebrowserschecksourcesourcenameurl)
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


### GET admin/crawler/sources
> checkWarnings is Boolean.
> 
> return sources that get use by crawler.

<br />


### PUT admin/crawler/editSource/[sourceName]
> update data of selected source.

<br />


### PUT admin/crawler/addSource
> add new source to crawler, receives data in request body.

<br />


### GET admin/analysis/[serverAnalysisFieldName]/[startTime]/[endTime]/[skip]/[limit]
> return `serverAnalysisFieldName` values through times.

<br />


### GET admin/analysis/currentMonth/[serverAnalysisFieldName]/[page]
> return `serverAnalysisFieldName` values on current month.

<br />

### PUT admin/analysis/resolve/[serverAnalysisFieldName]/[id]
> resolve/remove `serverAnalysisFieldName`.

<br />

### PUT admin/analysis/resolve/[serverAnalysisFieldName]
> resolve/remove `serverAnalysisFieldName`. <br />
> receives field `ids` in request body.

<br />

### PUT admin/analysis/resolve/[serverAnalysisFieldName]/lastDays/[days]
> resolve/remove `serverAnalysisFieldName`.

<br />


### GET /admin/server/status
> return resource status of the server

<br />


### GET /admin/remoteBrowsers/status
> return resource status of the remote browsers

<br />


### PUT /admin/remoteBrowsers/mutateType/[id]
> enable/disable selected remote browser temporary (enables again on the server restart).<br />
> also get query parameter `all: Boolean`. 

<br />

### GET /admin/remoteBrowsers/checkSource/[sourceName]/[url]
> check source works on all remote browsers.

<br />

### PUT /admin/configs/update
> update configs of the server

> editable configs: [safeFieldsToEdit_array](../src/config/configsDb.js).

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