import {comparePrevSummaryWithNewMethod} from "./summary.js";
import {comparePrevPosterWithNewMethod} from "./poster.js";
import {comparePrevTrailerWithNewMethod} from "./trailer.js";
import {comparePrevDownloadLinksWithNewMethod} from "./downloadLinks.js";

export async function validateExtractedData(sourceNames) {
    await comparePrevSummaryWithNewMethod(sourceNames);
    await comparePrevPosterWithNewMethod(sourceNames);
    await comparePrevTrailerWithNewMethod(sourceNames);
    await comparePrevDownloadLinksWithNewMethod(sourceNames, "pageContent");
    await comparePrevDownloadLinksWithNewMethod(sourceNames, "checkRegex");
}