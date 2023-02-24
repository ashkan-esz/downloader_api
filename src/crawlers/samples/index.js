import * as titlesSample from "./titles/titlesSample.js";
import * as sourcePagesSample from "./sourcePages/sourcePagesSample.js";


async function saveCrawlData(pageContent, sourceData, title, type, year, replace) {
    await Promise.all([
        sourcePagesSample.saveSourcePageSample(pageContent, sourceData, title, type, year, [], replace),
    ]);
}

export {
    titlesSample,
    sourcePagesSample,
    saveCrawlData,
}
