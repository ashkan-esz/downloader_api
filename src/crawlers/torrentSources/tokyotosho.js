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
    checkForceStopCrawler,
} from "../status/crawlerStatus.js";


//todo : add method to crawl specific title or file
//todo : dont remove previous torrent links

export const sourceConfig = Object.freeze({
    sourceName: "tokyotosho",
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

export default async function tokyotosho({movie_url, serial_url}, pageCount, extraConfigs = {}) {
    try {
        saveLinksStatus(movie_url,"sourcePage", "fetchingStart");
        let res = await axios.get(movie_url);
        saveLinksStatus(movie_url,"sourcePage", "fetchingEnd");
        let $ = cheerio.load(res.data);
        let titles = extractLinks($);
        const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
        const promiseQueue = new PQueue({concurrency: concurrencyNumber});
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
            promiseQueue.add(() => saveCrawlData(titles[t], movie_url, extraConfigs));
        }

        await promiseQueue.onEmpty();
        await promiseQueue.onIdle();
        return [1]; //pageNumber
    } catch (error) {
        saveError(error);
        return [1];
    }
}

async function searchTitle(){
    // https://www.tokyotosho.info/search.php?terms=mushoku&type=0&searchName=true&searchComment=true&size_min=&size_max=&username=
    // https://www.tokyotosho.info/search.php?terms=mushoku&type=1&searchName=true&searchComment=false
}

async function saveCrawlData(titleData, movie_url, extraConfigs) {
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

function extractLinks($) {
    let $a = $('a');
    let titles = [];
    for (let i = 0; i < $a.length; i++) {
        try {
            let href = $($a[i]).attr('href');
            let info = fixLinkInfo($($a[i]).text());
            if (info.match(/\(\d{4}\)/)) {
                continue;
            }

            if ($($a[i]).parent().hasClass("desc-top")) {
                let title = getTitle(info);
                let se = fixSeasonEpisode(info, false);
                let size = getFixedFileSize($, $a[i]);

                let type = href.startsWith("magnet:")
                    ? "magnet"
                    : (href.includes("/torrent") || href.endsWith(".torrent")) ? "torrent" : "direct";

                if (type === "magnet") {
                    info = fixLinkInfo($($a[i]).next().text());
                    if (info.match(/\(\d{4}\)/)) {
                        continue;
                    }
                    title = getTitle(info);
                    se = fixSeasonEpisode(info, false);
                }

                let link = {
                    link: href,
                    info: info.replace(".mkv", ""),
                    season: se.season,
                    episode: se.episode,
                    sourceName: sourceConfig.sourceName,
                    type: type,
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
    return titles;
}

function fixLinkInfo(info) {
    info = info
        .replace(/^\[[a-zA-Z\-\s\d]+]\s?/i, '')
        .replace(/\s?\[[a-zA-Z\s\d]+](?=\.)/i, '')
        .replace(/s\d+\s+-\s+\d+/i, r => r.replace(/\s+-\s+/, 'E')) // S2 - 13
        .replace(/(?<!part)\s\d+\s+-\s+\d+\s/i, r => r.replace(/^\s/, ".S").replace(/\s+-\s+/, 'E')) // 12 - 13
        .replace(/\s-\s(?=s\d+e\d+)/i, '.')

    return normalizeSeasonText(info.toLowerCase());
}

function getTitle(text) {
    text = text.split(' - ')[0]
        .replace(/(\s\d\d+)?\.mkv/, '')
        .replace(/\s\(\d{4}\)/, '').trim();
    let splitArr = text.split(/\s|\./g);
    // console.log(splitArr);
    let index = splitArr.findIndex(item => item.match(/s\d+e\d+/))
    if (index !== -1) {
        return replaceSpecialCharacters(splitArr.slice(0, index).join(" "));
    }
    return replaceSpecialCharacters(text);
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
    let sizeText = $($(link).parent().parent().next().children()[0])?.text()?.match(/size: \d+\.?\d+(mb|gb)/i)?.[0].toLowerCase().replace(/size:\s/, '') || "";
    sizeText = purgeSizeText(sizeText);
    if (sizeText.endsWith('MB')) {
        return Number(sizeText.replace("MB", ''));
    }
    return Math.floor(Number(sizeText.replace("GB", '')) * 1024);
}