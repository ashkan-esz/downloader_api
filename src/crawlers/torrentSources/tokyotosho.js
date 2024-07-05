import axios from "axios";
import * as cheerio from 'cheerio';
import {saveError} from "../../error/saveError.js";
import {replaceSpecialCharacters} from "../utils/utils.js";
import {releaseRegex, releaseRegex2} from "../linkInfoUtils.js";
import {saveLinksStatus} from "../searchTools.js";
import save from "../save_changes_db.js";
import {addPageLinkToCrawlerStatus} from "../status/crawlerStatus.js";
import {
    fixSeasonEpisode,
    getFixedFileSize, handleCrawledTitles, handleSearchedCrawledTitles,
    mergeTitleLinks,
    normalizeSeasonText,
    removeSeasonText
} from "./torrentUtils.js";


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
        saveLinksStatus(movie_url, "sourcePage", "fetchingStart");
        let res = await axios.get(movie_url);
        saveLinksStatus(movie_url, "sourcePage", "fetchingEnd");
        let $ = cheerio.load(res.data);
        let titles = extractLinks($);

        await handleCrawledTitles(titles, 1, pageCount, saveCrawlData, sourceConfig, extraConfigs);

        return [1]; //pageNumber
    } catch (error) {
        saveError(error);
        return [1];
    }
}

export async function searchByTitle(sourceUrl, title, extraConfigs = {}) {
    try {
        let searchTitle = title.replace(/\s+/g, '+');
        let searchUrl = `${sourceUrl.split('/?')[0]}/search.php?terms=${searchTitle}&type=1&searchName=true`
        saveLinksStatus(searchUrl, "sourcePage", "fetchingStart");
        let res = await axios.get(searchUrl);
        saveLinksStatus(searchUrl, "sourcePage", "fetchingEnd");

        let $ = cheerio.load(res.data);
        let titles = extractLinks($);
        titles = titles.slice(0, 5);

        await handleSearchedCrawledTitles(titles, 1, 1, saveCrawlData, sourceConfig, extraConfigs);

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
        rating: null,
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
            if (ignoreLink(info)) {
                continue;
            }

            if ($($a[i]).parent().hasClass("desc-top")) {
                let title = getTitle(info);
                let se = fixSeasonEpisode(info, false);
                let sizeText = $($($a[i]).parent().parent().next().children()[0])?.text() || "";
                sizeText = sizeText.split("|").find(item => item.toLowerCase().includes("size"))?.trim() || sizeText;
                let size = getFixedFileSize($, sizeText);

                if (size > 10 * 1024) {
                    //size > 10gb
                    continue;
                }

                let type = href.startsWith("magnet:")
                    ? "magnet"
                    : (href.includes("/torrent") || href.endsWith(".torrent")) ? "torrent" : "direct";

                if (type === "magnet") {
                    info = fixLinkInfo($($a[i]).next().text());
                    if (ignoreLink(info)) {
                        continue;
                    }
                    title = getTitle(info);
                    se = fixSeasonEpisode(info, false);
                }

                if (title.match(/\ss\d+$/i) || title.match(/\svol\s\d/i)) {
                    continue;
                }

                let link = {
                    link: href,
                    info: info.replace(/\.+\s+/g, ' '),
                    season: se.season,
                    episode: se.episode,
                    sourceName: sourceConfig.sourceName,
                    type: type,
                    size: size, //in mb
                    localLink: "",
                }

                let findResult = titles.find(item => item.title.replace(/\s+/g, '') === title.replace(/\s+/g, ''));
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

    titles = mergeTitleLinks(titles);
    return titles;
}

function ignoreLink(info) {
    return info.match(/\(\d{4}\)/) ||
        info.includes('[batch]') ||
        info.includes('(batch)') ||
        info.includes('[rav]')
}

function fixLinkInfo(info) {
    info = info
        .replace(/^\[[a-zA-Z\-\s\d]+]\s?/i, '')
        .replace(/\s?\[[a-zA-Z\s\d]+](?=\.)/i, '')
        .replace(/s\d+\s+-\s+\d+/i, r => r.replace(/\s+-\s+/, 'E')) // S2 - 13
        .replace(/(?<!(part|\.))\s\d+\s+-\s+\d+\s/i, r => r.replace(/^\s/, ".S").replace(/\s+-\s+/, 'E')) // 12 - 13
        .replace(/\s-\s(?=s\d+e\d+)/i, '.')
        .replace(/\.\s?(mkv|mp4)/g, "")

    return normalizeSeasonText(info.toLowerCase());
}

function getTitle(text) {
    text = text.split(' - ')[0]
        .split(new RegExp(`[\(\\[](${releaseRegex.source}|BD)`, 'i'))[0]
        .split(new RegExp(`[\(\\[](${releaseRegex2.source}|BD)`, 'i'))[0]
        .replace(/\.+\s+/g, ' ')
        .replace(/\d+v\d/i, r => r.split(/v/i)[0])
        .replace(/(\s\d\d+\s)\[[a-zA-Z\d]+]$/, '')
        .replace(/\s\d\d+$/, '')
        .replace(/\s\(([a-zA-Z]{3,4}\s)?\d{4}\)/, '')
        .split('[')[0]
        .trim();

    let year = new Date().getFullYear();
    text = text.split(new RegExp(`\\s${year}\\s(480\|720p\|1080\|2160p)p`))[0];

    let splitArr = text.split(/\s|\./g);
    // console.log(splitArr);
    let index = splitArr.findIndex(item => item.match(/s\d+e\d+/))
    if (index !== -1) {
        let temp = splitArr.slice(0, index).join(" ").split("(")[0];
        temp = replaceSpecialCharacters(temp);
        return removeSeasonText(temp);
    }
    let temp = replaceSpecialCharacters(text);
    return removeSeasonText(temp);
}
