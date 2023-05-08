export function getCrawlerWarningMessages(sourceName = "", newUrl = "") {
    return ({
        expireCookie: `Source (${sourceName}) has expired cookie(s)`,
        expireCookieSkip: `source (${sourceName}) cookies expired (crawler skipped).`,
        expireCookieSkip_domainChange: `source (${sourceName}) cookies expired (crawler skipped --domainChangeHandler).`,
        disabledSource: `source (${sourceName}) is disabled.`,
        disabledSourceSkip: `source (${sourceName}) is disabled (crawler skipped).`,
        disabledSourceSkip_domainChange: `source (${sourceName}) is disabled (crawler skipped --domainChangeHandler).`,
        notWorking: `Source (${sourceName}) url not working`,
        domainChange: `Source (${sourceName}) domain changed to (${newUrl})`,
        crawlerPauseLimit: `Maximum allowed duration for crawler pause exceeded (${sourceName}min) (crawler need more resource)`,
        invalidImdb: `Invalid imdb api key: ${sourceName}`,
        maxUsageImdb: `Reached imdb api maximum daily usage: ${sourceName}`,
        lotsOfApiCallImdb: `lots of imdb api call: ${sourceName}`,
        trailerUploadHighWait: `High wait for trailer upload to start (${sourceName})`,
        imageOperationsHighWait: `High wait for trailer upload to start (${sourceName})`,
        remoteBrowserNotWorking: `Remote Browser not working: ${sourceName}`,
        remoteBrowserTimeoutError: `Remote Browser timeout error (50s/70s): ${sourceName}`,
    });
}
