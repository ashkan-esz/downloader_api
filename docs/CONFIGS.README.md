## Configs Read From DB


```javascript
dbConfigs = {
    corsAllowedOrigins: Array(String), //default value: []
    disableTestUserRequests: Boolean, //default value: false
    disableCrawlerForDuration: Int, //default value: 0
    disableCrawlerStart: Date, //default value: 0
    crawlerDisabled: Boolean, //default value: false
    disableCrawler: Boolean, //default value: false
    developmentFaze: Boolean, //default value: false
    developmentFazeStart: Date, //default value: 0
    mediaFileSizeLimit: Int, //default value: 100
    profileFileSizeLimit: Int, //default value: 2
    profileImageCountLimit: Int, //default value: 5
    mediaFileExtensionLimit: String, //default value: 'jpg, jpeg, png, webp, mp4, avi, flv, m4v, mkv, mov, mpeg, wmv',
    profileImageExtensionLimit: String, //default value: 'jpg, jpeg, png, webp',
    torrentDownloadMaxFileSize: Int, //default value: 800,
    torrentDownloadMaxSpaceSize: Int, //default value: 10000,
    torrentDownloadSpaceThresholdSize: Int, //default value: 1000,
    torrentFilesExpireHour: Int, //default value: 36,
    torrentFilesServingConcurrencyLimit: Int, //default value: 20,
    torrentDownloadTimeoutMin: Int, //default value: 30,
    torrentDownloadConcurrencyLimit: Int, //default value: 3,
    torrentFileExpireDelayFactor: Float, //default value: 1.5,
    torrentFileExpireExtendHour: Int, //default value: 4,
    torrentUserEnqueueLimit: Int, //default value: 2,
    disableBotsNotifications: Boolean, //default value: false,
    torrentDownloadDisabled: Boolean, //default value: false,
    torrentFilesServingDisabled: Boolean, //default value: false,
    torrentSendResultToBot: Boolean, //default value: false,
    defaultTorrentDownloaderConfig: Object,
}
```



<br />
<br />

# API

- Open [sources schema](SOURCES.README.md).