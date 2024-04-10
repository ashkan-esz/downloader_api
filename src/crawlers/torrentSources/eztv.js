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
import {CookieJar} from "tough-cookie";
import {wrapper} from "axios-cookiejar-support";


export const sourceConfig = Object.freeze({
    sourceName: "eztv",
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

export default async function eztv({movie_url, serial_url}, pageCount, extraConfigs = {}) {
    try {
        saveLinksStatus(movie_url, "sourcePage", "fetchingStart");
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let res = await client.get(movie_url, {
            headers: {
                Cookie: "layout=def_wlinks;",
            }
        });
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
        let searchUrl = sourceUrl.split('/home')[0] + '/search/' + searchTitle;
        saveLinksStatus(searchUrl, "sourcePage", "fetchingStart");
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let res = await client.get(searchUrl, {
            headers: {
                Cookie: "layout=def_wlinks;",
            }
        });
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
    await save(titleData.title, "serial", titleData.year, sourceData, 1, extraConfigs);
}

function extractLinks($, sourceUrl) {
    let $a = $('a');
    let titles = [];
    for (let i = 0; i < $a.length; i++) {
        try {
            let href = $($a[i]).attr('href');
            if (href?.match(/\.torrent$/i)) {
                let info = $($($a[i]).parent().prev()).text();
                info = fixLinkInfo(info);
                if (info.match(/\(\d{4}\)/)) {
                    continue;
                }

                let title = getTitle(info);
                let yearMatch = title.match(/\s\d\d\d\d/i);
                let year = "";
                if (yearMatch?.[0] && Number(yearMatch[0]) > 2010) {
                    title = title.replace(yearMatch[0], '').trim();
                    year = Number(yearMatch[0]);
                }
                let se = fixSeasonEpisode(info, false);
                let size = getFixedFileSize($, $a[i]);

                if ((se.season === 1 && se.episode === 0) || href.includes(".COMPLETE.")) {
                    continue;
                }

                let link = {
                    link: href,
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
                        year: year,
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
        .trim()
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

function getTitle(text) {
    text = text.split(' - ')[0]
        .replace(/^\d\d\d\d?p\./, '')
        .replace(/(\s\d\d+)?\.mkv/, '')
        .replace(/\s\(\d{4}\)/, '')
        .split(/[\[？]/g)[0]
        .trim();
    let splitArr = text.split(/\s|\./g);
    let index = splitArr.findIndex(item => item.match(/s\d+e\d+/));
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
        let temp = text.match(/\s\d+(\s\((web\s)?\d{3,4}p\))?(\.mkv)?$/);
        if (temp) {
            se.episode = Number(temp[0].match(/\d+/g)[0]);
        }
    }

    return se;
}

function getFixedFileSize($, link) {
    let sizeText = $($(link).parent().next())?.text()?.toLowerCase().replace(/size:\s/, '') || "";
    sizeText = sizeText.replace('mib', 'mb').replace('gib', 'gb');
    sizeText = purgeSizeText(sizeText);
    if (sizeText.endsWith('MB')) {
        return Number(sizeText.replace("MB", ''));
    }
    return Math.floor(Number(sizeText.replace("GB", '')) * 1024);
}