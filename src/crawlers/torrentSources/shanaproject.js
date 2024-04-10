import axios from "axios";
import * as cheerio from 'cheerio';
import {saveError} from "../../error/saveError.js";
import {getSeasonEpisode, replaceSpecialCharacters} from "../utils/utils.js";
import {purgeSizeText} from "../linkInfoUtils.js";
import PQueue from "p-queue";
import {getConcurrencyNumber, saveLinksStatus} from "../searchTools.js";
import {pauseCrawler} from "../status/crawlerController.js";
import save from "../save_changes_db.js";
import {
    addPageLinkToCrawlerStatus,
    checkForceStopCrawler, updatePageNumberCrawlerStatus,
} from "../status/crawlerStatus.js";


export const sourceConfig = Object.freeze({
    sourceName: "shanaproject",
    needHeadlessBrowser: false,
    sourceAuthStatus: 'ok',
    vpnStatus: Object.freeze({
        poster: 'vpnOnly',
        trailer: 'vpnOnly',
        downloadLink: 'vpnOnly',
    }),
    isTorrent: true,
    replaceInfoOnDuplicate: true,
});

export default async function shanaproject({movie_url, serial_url}, pageCount, extraConfigs = {}) {
    try {
        saveLinksStatus(movie_url, "sourcePage", "fetchingStart");
        let res = await axios.get(movie_url);
        saveLinksStatus(movie_url, "sourcePage", "fetchingEnd");
        let $ = cheerio.load(res.data);
        let titles = extractLinks($, movie_url);

        const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
        const promiseQueue = new PQueue({concurrency: concurrencyNumber});
        updatePageNumberCrawlerStatus(1, pageCount, concurrencyNumber, extraConfigs);
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
            promiseQueue.add(() => saveCrawlData(titles[t], extraConfigs));
        }

        await promiseQueue.onEmpty();
        await promiseQueue.onIdle();
        return [1]; //pageNumber
    } catch (error) {
        saveError(error);
        return [1];
    }
}

export async function searchByTitle(sourceUrl, title, extraConfigs = {}) {
    try {
        let searchTitle = title.replace(/\s+/g, '+');
        let searchUrl = `${sourceUrl.split('/?')[0].replace(/\/$/, '')}/search/?title=${searchTitle}&subber=`;
        saveLinksStatus(searchUrl, "sourcePage", "fetchingStart");
        let res = await axios.get(searchUrl);
        saveLinksStatus(searchUrl, "sourcePage", "fetchingEnd");

        let $ = cheerio.load(res.data);
        let titles = extractLinks($, sourceUrl);
        titles = titles.slice(0, 5);

        const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
        const promiseQueue = new PQueue({concurrency: concurrencyNumber});
        updatePageNumberCrawlerStatus(1, 1, concurrencyNumber, extraConfigs);
        for (let i = 0; i < titles.length; i++) {
            await promiseQueue.onSizeLessThan(concurrencyNumber);
            const t = i;
            promiseQueue.add(() => saveCrawlData(titles[t], extraConfigs));
        }

        await promiseQueue.onEmpty();
        await promiseQueue.onIdle();
        return [1]; //pageNumber
    } catch (error) {
        saveError(error);
        return [1];
    }
}

async function saveCrawlData(titleData, extraConfigs) {
    addPageLinkToCrawlerStatus("#" + titleData.title.replace(/\s+/g, '-'), 1);
    let sourceData = {
        sourceConfig,
        pageLink: "#" + titleData.title.replace(/\s+/g, '-'),
        downloadLinks: [],
        watchOnlineLinks: [],
        torrentLinks: titleData.links,
        persianSummary: "",
        poster: "",
        trailers: [],
        subtitles: [],
        cookies: [],
    };
    await save(titleData.title, "anime_serial", "", sourceData, 1, extraConfigs);
}

function extractLinks($, sourceUrl) {
    let $a = $('a');
    let titles = [];
    for (let i = 0; i < $a.length; i++) {
        try {
            if ($($a[i]).children().hasClass("release_download")) {
                let href = $($a[i]).attr('href');
                let info = $($($($a[i]).parent().next().children()[1]).children()[2]).text();
                info = fixLinkInfo(info);
                if (info.match(/\(\d{4}\)/)) {
                    continue;
                }

                let year = new Date().getFullYear();
                let title = $($($a[i]).prev().prev().prev().children().children()[0]).text().toLowerCase();
                title = replaceSpecialCharacters(title).replace(" " + year, "").replace(" " + (year - 1), "");

                let se = fixSeasonEpisode(info, false);
                let size = getFixedFileSize($, $a[i]);

                if (se.episode === 0) {
                    let temp = $($($a[i]).prev().prev().prev().prev()).text();
                    if (!isNaN(temp)) {
                        se.episode = Number(temp);
                    } else if (temp.match(/\d+v\d/)) {
                        se.episode = Number(temp.toLowerCase().split('v')[0]);
                    }
                }

                let link = {
                    link: sourceUrl.replace(/\/$/, '') + href,
                    info: info,
                    season: se.season,
                    episode: se.episode,
                    sourceName: sourceConfig.sourceName,
                    type: "torrent",
                    size: size, //in mb
                    localLink: "",
                }

                let findResult = titles.find(item => item.title === title);
                if (findResult) {
                    findResult.links.push(link);
                } else {
                    titles.push({
                        title: title,
                        links: [link],
                    })
                }
            }
        } catch (error) {
            saveError(error);
        }
    }

    for (let i = 0; i < titles.length; i++) {
        let seasonMatch = titles[i].title.match(/\ss\d+$/gi);
        if (seasonMatch) {
            titles[i].title = titles[i].title.replace(seasonMatch[0], '');
            let season = Number(seasonMatch[0].replace(' s', ''));
            for (let j = 0; j < titles[i].links.length; j++) {
                titles[i].links[j].season = season;
            }
        }
    }

    return titles;
}

function fixLinkInfo(info) {
    info = info
        .replace(/^\[[a-zA-Z\-\s\d]+]\s?/i, '')
        .replace(/\s?\[[a-zA-Z\s\d]+](?=\.)/i, '')
        .replace(/s\d+\s+-\s+\d+/i, r => r.replace(/\s+-\s+/, 'E')) // S2 - 13
        .replace(/(?<!part)\s\d+\s+-\s+\d+\s/i, r => r.replace(/^\s/, ".S").replace(/\s+-\s+/, 'E')) // 12 - 13
        .replace(/\s-\s(?=s\d+e\d+)/i, '.')
        .replace(".mkv", "")
        .trim();

    info = normalizeSeasonText(info.toLowerCase());

    let quality = info.match(/\s[\[(](web\s)?\d\d\d\d?p[\])]/gi);
    if (quality) {
        let temp = quality[0].match(/\d\d\d\d?p/i)[0];
        info = temp + '.' + info.replace(quality[0], '');
    }

    return info;
}

function normalizeSeasonText(text) {
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

function fixSeasonEpisode(text, isLinkInput) {
    let se = getSeasonEpisode(text, isLinkInput);
    if (se.season === 1 && se.episode === 0) {
        let temp = text.match(/\s\d+(\s\((web\s)?\d{3,4}p\))?(\.mkv)$/);
        if (temp) {
            se.episode = Number(temp[0].match(/\d+/g)[0]);
        }
    }

    return se;
}

function getFixedFileSize($, link) {
    let sizeText = $($(link).prev())?.text()?.toLowerCase().replace(/size:\s/, '') || "";
    sizeText = purgeSizeText(sizeText);
    if (sizeText.endsWith('MB')) {
        return Number(sizeText.replace("MB", ''));
    }
    return Math.floor(Number(sizeText.replace("GB", '')) * 1024);
}