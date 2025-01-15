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
            omdb: {
                invalid: `Invalid omdb api key: ${data1}, (${data2})`,
                moreApiKeyNeeded: 'More omdb api keys are needed',
                eaiError: 'EAI_AGAIN error on omdb api call',
            },
            tvmaze: {
                lotsOfApiCall: `lots of tvmaze api call`,
            },
            jikan: {
                lotsOfApiCall: `lots of jikan api call`,
                eaiError: 'EAI_AGAIN error on jikan api call',
            },
            kitsu: {
                lotsOfApiCall: `lots of kitsu api call`,
            },
            amv: {
                lotsOfApiCall: `lots of amv api call`,
                eaiError: 'EAI_AGAIN error on amv api call',
            }
        },
        trailerUploadHighWait: `High wait for trailer upload to start (${data1})`,
        imageOperationsHighWait: `High wait for image operation to start (${data1})`,
        remoteBrowserNotWorking: `Remote Browser not working: ${data1}`,
        remoteBrowserTimeoutError: `Remote Browser timeout error (50s/70s): ${data1}`,
        crawlerCancelled: 'Crawling cancelled : sourcesObj is null',
        crawlerCycleCancelled: 'Crawler cycle cancelled : sourcesObj is null',
        axiosTimeoutError: `Axios timeout error (${data1}): ${data2}`,
        axiosAbortError: `Axios aborted error: ${data1}`,
        axiosEaiError: `Axios EAI_AGAIN error: ${data1}`,
        crawlerBadLink: `Crawler generated badLink (${data1})`,
        sourceLastPage: `Source (${data1}) lastPage: ${data2}`,
        sourceDisabled: `Source (${data1}): Disabled, reasons: ${data2}`,
        sourceErrors: {
            axios403: `Source (${data1}): 403 Error (Axios)`,
        },
        sourceStatus: {
            badDownloadLinks: `Source (${data1}): badDownloadLinks`,
            badPosters: `Source (${data1}): badPosters`,
            badPersianSummary: `Source (${data1}): badPersianSummary`,
        },
    });
}
