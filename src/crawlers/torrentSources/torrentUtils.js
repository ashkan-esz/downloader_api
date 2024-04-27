import {getSeasonEpisode} from "../utils/utils.js";
import {purgeSizeText} from "../linkInfoUtils.js";
import {getConcurrencyNumber} from "../searchTools.js";
import PQueue from "p-queue";
import {checkForceStopCrawler, updatePageNumberCrawlerStatus} from "../status/crawlerStatus.js";
import {pauseCrawler} from "../status/crawlerController.js";


export async function handleCrawledTitles(titles, pageNumber, pageCount, saveCrawlDataFunc, sourceConfig, extraConfigs) {
    const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
    const promiseQueue = new PQueue({concurrency: concurrencyNumber});
    updatePageNumberCrawlerStatus(pageNumber, pageCount, concurrencyNumber, extraConfigs);
    for (let i = 0; i < titles.length; i++) {
        if (checkForceStopCrawler()) {
            break;
        }
        await pauseCrawler();
        await promiseQueue.onSizeLessThan(3 * concurrencyNumber);
        if (checkForceStopCrawler()) {
            break;
        }
        const t = i;
        promiseQueue.add(() => saveCrawlDataFunc(titles[t], extraConfigs));
    }

    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

export async function handleSearchedCrawledTitles(titles, pageNumber, pageCount, saveCrawlDataFunc, sourceConfig, extraConfigs) {
    const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
    const promiseQueue = new PQueue({concurrency: concurrencyNumber});
    updatePageNumberCrawlerStatus(pageNumber, pageCount, concurrencyNumber, extraConfigs);
    for (let i = 0; i < titles.length; i++) {
        await promiseQueue.onSizeLessThan(concurrencyNumber);
        const t = i;
        promiseQueue.add(() => saveCrawlDataFunc(titles[t], extraConfigs));
    }

    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

//------------------------------------------
//------------------------------------------

export function normalizeSeasonText(text) {
    return text
        .replace(/2nd season - \d+/, r => 's2e' + r.match(/\d+$/).pop())
        .replace('2nd season', '2')
        .replace('2nd attack', '2')
        .replace('zoku hen', 'season 2')
        .replace(/3rd season - \d+/, r => 's3e' + r.match(/\d+$/).pop())
        .replace('3rd season', '3')
        .replace('season 3', '3')
        .replace(/\dth season/, r => r.replace('th season', ''))
        .replace(/season \d/, r => r.replace('season ', ''));
}

export function removeSeasonText(text) {
    return text
        .replace(/2nd season( - \d+)?/, "")
        .replace('2nd attack', "")
        .replace('zoku hen', "")
        .replace(/3rd season( - \d+)?/, "")
        .replace(/\dth season/, "")
        .replace(/season \d/, "")
        .trim();
}

export function fixSeasonEpisode(text, isLinkInput) {
    // console.log(text)
    let se = getSeasonEpisode(text, isLinkInput);
    if (se.season === 1 && se.episode === 0) {
        let temp = text.replace(/\s[(\[][a-zA-Z\d\sx]+[)\]]/g, '').match(/\s\d+(-\d+)?(v\d)?(\s(end|raw))?(\.\s*(mkv|mp4))?$/);
        if (temp) {
            se.episode = Number(temp[0].match(/\d+/g)[0]);
        }
    }

    return se;
}

export function getFixedFileSize($, link) {
    // let sizeText = link.match(/size: \d+\.?\d+(mb|gb)/i)?.[0].toLowerCase() || "";
    let sizeText = link.toLowerCase();
    sizeText = sizeText
        .replace(/size:\s/, '')
        .replace('mib', 'mb')
        .replace('gib', 'gb');
    sizeText = purgeSizeText(sizeText);
    if (sizeText.endsWith('MB')) {
        return Number(sizeText.replace("MB", ''));
    }
    return Math.floor(Number(sizeText.replace("GB", '')) * 1024);
}

export function mergeTitleLinks(titles) {
    let uniqueTitles = [];
    for (let i = 0; i < titles.length; i++) {
        let findResult = uniqueTitles.find(item => item.title === titles[i].title);
        if (findResult) {
            findResult.links = [...findResult.links, ...titles[i].links];
        } else {
            uniqueTitles.push(titles[i]);
        }
    }

    uniqueTitles = uniqueTitles.filter(item => item.links.length > 0);

    return uniqueTitles;
}