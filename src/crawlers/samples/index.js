import * as titlesSample from "./titles/titlesSample.js";
import * as sourcePagesSample from "./sourcePages/sourcePagesSample.js";
import * as downloadLinksSample from "./downloadLinks/downloadLinksSample.js";
import * as posterAndTrailerAndSummarySample from "./posterAndTrailerAndSummary/posterAndTrailerAndSummarySample.js";


async function saveCrawlData(pageContent, sourceData, title, type, year, replace) {
    await Promise.all([
        sourcePagesSample.saveSourcePageSample(pageContent, sourceData, title, type, year, replace),
        posterAndTrailerAndSummarySample.savePosterAndTrailerAndSummarySample(sourceData, "all", replace),
        downloadLinksSample.saveLinksSample(sourceData, "all", replace),
    ]);
}

export {
    titlesSample,
    sourcePagesSample,
    downloadLinksSample,
    posterAndTrailerAndSummarySample,
    saveCrawlData,
}
