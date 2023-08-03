import {getCrawlerWarningMessages} from "./crawlerWarnings.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";

const changesStatus = {
    sourceName: '',
    badDownloadLinks: [],
    badPosters: [],
    badPersianSummary: [],
}

export function checkCrawledDataForChanges(sourceName, pageLink, downloadLinks, badLinks, poster, persianSummary) {
    if (changesStatus.sourceName !== sourceName) {
        changesStatus.sourceName = sourceName;
        changesStatus.badDownloadLinks = [];
        changesStatus.badPosters = [];
        changesStatus.badPersianSummary = [];
    }

    if (badLinks.length > 0) {
        changesStatus.badDownloadLinks.push(pageLink);
    }
    if (!poster) {
        changesStatus.badPosters.push(pageLink);
    }
    if (!persianSummary) {
        changesStatus.badPersianSummary.push(pageLink);
    }
}

export async function checkAndHandleSourceChange() {
    let isBadStatus = false;
    if (changesStatus.badDownloadLinks.length >= 20) {
        const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, changesStatus.badDownloadLinks.length);
        await saveCrawlerWarning(warningMessages.sourceStatus.badDownloadLinks);
        isBadStatus = true;
    }
    if (changesStatus.badPosters.length >= 20) {
        const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, changesStatus.badPosters.length);
        await saveCrawlerWarning(warningMessages.sourceStatus.badPosters);
        isBadStatus = true;
    }
    if (changesStatus.badPersianSummary.length >= 20) {
        const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, changesStatus.badPersianSummary.length);
        await saveCrawlerWarning(warningMessages.sourceStatus.badPersianSummary);
        isBadStatus = true;
    }

    if (isBadStatus) {

    }


    //reset
    changesStatus.sourceName = '';
    changesStatus.badDownloadLinks = [];
    changesStatus.badPosters = [];
    changesStatus.badPersianSummary = [];
}