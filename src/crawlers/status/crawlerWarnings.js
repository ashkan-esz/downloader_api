export function getCrawlerWarningMessages(data1 = "", data2 = "") {
    return ({
        expireCookie: `Source (${data1}) has expired cookie(s)`,
        expireCookieSkip: `source (${data1}) cookies expired (crawler skipped).`,
        expireCookieSkip_domainChange: `source (${data1}) cookies expired (crawler skipped --domainChangeHandler).`,
        disabledSource: `source (${data1}) is disabled.`,
        disabledSourceSkip: `source (${data1}) is disabled (crawler skipped).`,
        disabledSourceSkip_domainChange: `source (${data1}) is disabled (crawler skipped --domainChangeHandler).`,
        notWorking: `Source (${data1}) url not working`,
        domainChange: `Source (${data1}) domain changed to (${data2})`,
        crawlerPauseLimit: `Maximum allowed duration for crawler pause exceeded (${data1}min) (crawler need more resource)`,
        apiCalls: {
            imdb: {
                invalid: `Invalid imdb api key: ${data1}`,
                maxUsage: `Reached imdb api maximum daily usage: ${data1}`,
                lotsOfApiCall: `lots of imdb api call`,
            },
            omdb: {
                invalid: `Invalid omdb api key: ${data1}, (${data2})`,
                moreApiKeyNeeded: 'More omdb api keys are needed',
            },
            tvmaze: {
                lotsOfApiCall: `lots of tvmaze api call`,
            },
            jikan: {
                lotsOfApiCall: `lots of jikan api call`,
            }
        },
        trailerUploadHighWait: `High wait for trailer upload to start (${data1})`,
        imageOperationsHighWait: `High wait for trailer upload to start (${data1})`,
        remoteBrowserNotWorking: `Remote Browser not working: ${data1}`,
        remoteBrowserTimeoutError: `Remote Browser timeout error (50s/70s): ${data1}`,
        crawlerCancelled: 'Crawling cancelled : sourcesObj is null',
        crawlerCycleCancelled: 'Crawler cycle cancelled : sourcesObj is null',
        axiosTimeoutError: `Axios timeout error (${data1}): ${data2}`,
        crawlerBadLink: `Crawler generated badLink (${data1})`,
    });
}
