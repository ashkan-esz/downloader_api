import {getCrawlerWarningMessages} from "./crawlerWarnings.js";
import {saveCrawlerWarning} from "../../data/db/serverAnalysisDbMethods.js";
import {disableSource} from "../../data/db/admin/adminCrawlerDbMethods.js";

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
    let reasons = [];
    if (changesStatus.badDownloadLinks.length >= 20) {
        const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, changesStatus.badDownloadLinks.length);
        await saveCrawlerWarning(warningMessages.sourceStatus.badDownloadLinks);
        reasons.push('downloadLinks');
    }
    if (changesStatus.badPosters.length >= 20) {
        const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, changesStatus.badPosters.length);
        await saveCrawlerWarning(warningMessages.sourceStatus.badPosters);
        reasons.push('poster');
    }
    if (changesStatus.badPersianSummary.length >= 20) {
        const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, changesStatus.badPersianSummary.length);
        await saveCrawlerWarning(warningMessages.sourceStatus.badPersianSummary);
        reasons.push('trailers');
    }

    if (Math.max(changesStatus.badDownloadLinks.length, changesStatus.badPosters.length, changesStatus.badPersianSummary.length) >= 30) {
        let disableResult = await disableSource(changesStatus.sourceName);
        if (disableResult !== 'notfound' && disableResult !== "error") {
            const warningMessages = getCrawlerWarningMessages(changesStatus.sourceName, `bad ${reasons.join(',')}`);
            await saveCrawlerWarning(warningMessages.sourceDisabled);
        }
    }


    //reset
    changesStatus.sourceName = '';
    changesStatus.badDownloadLinks = [];
    changesStatus.badPosters = [];
    changesStatus.badPersianSummary = [];
}