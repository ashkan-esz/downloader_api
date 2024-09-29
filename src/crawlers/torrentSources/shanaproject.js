import axios from "axios";
import * as cheerio from 'cheerio';
import {saveError} from "../../error/saveError.js";
import {replaceSpecialCharacters} from "../utils/utils.js";
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
    removeScriptAndStyleFromHtml: false,
});

export default async function shanaproject({movie_url, serial_url}, pageCount, extraConfigs = {}) {
    try {
        saveLinksStatus(movie_url, "sourcePage", "fetchingStart");
        let res = await axios.get(movie_url);
        saveLinksStatus(movie_url, "sourcePage", "fetchingEnd");
        let $ = cheerio.load(res.data);
        let titles = extractLinks($, movie_url);

        await handleCrawledTitles(titles, 1, pageCount, saveCrawlData, sourceConfig, extraConfigs);

        return [1]; //pageNumber
    } catch (error) {
        if (error.code === "EAI_AGAIN") {
            if (extraConfigs.retryCounter === undefined) {
                extraConfigs.retryCounter = 0;
            }
            if (extraConfigs.retryCounter < 2) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                extraConfigs.retryCounter++;
                return await shanaproject({movie_url, serial_url}, pageCount, extraConfigs);
            }
            return [1];
        }
        if (error.response?.status !== 521 && error.response?.status !== 522) {
            saveError(error);
        }
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

function extractLinks($, sourceUrl) {
    let $a = $('a');
    let titles = [];
    for (let i = 0; i < $a.length; i++) {
        try {
            if ($($a[i]).children().hasClass("release_download")) {
                let href = $($a[i]).attr('href');
                let info = $($($($a[i]).parent().next().children()[1]).children()[2]).text();
                info = fixLinkInfo(info);
                if (info.match(/\(\d{4}\)/) || info.match(/\s\d+ ~/) || info.includes('~hr-gz')) {
                    continue;
                }

                let year = new Date().getFullYear();
                let title = $($($a[i]).prev().prev().prev().children().children()[0]).text().toLowerCase();
                title = title.split(' - ')[0];
                title = replaceSpecialCharacters(title).replace(" " + year, "").replace(" " + (year - 1), "");
                title = title.split(/(\s|\.|_)s\d+e\d+/gi)[0];
                title = removeSeasonText(title);

                let se = fixSeasonEpisode(info, false);
                let sizeText = $($($a[i]).prev())?.text() || "";
                let size = getFixedFileSize($, sizeText);

                if (size > 10 * 1024) {
                    //size > 10gb
                    continue;
                }

                if (se.episode === 0) {
                    let temp = $($($a[i]).prev().prev().prev().prev()).text();
                    if (!isNaN(temp)) {
                        se.episode = Number(temp);
                    } else if (temp.match(/\d+v\d/)) {
                        se.episode = Number(temp.toLowerCase().split('v')[0]);
                    } else if (temp.match(/\d+-\d+/)) {
                        continue;
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
                    localLinkExpire: 0,
                    okCount: 0,
                    badCount: 0,
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

    titles = mergeTitleLinks(titles);
    return titles;
}

function fixLinkInfo(info) {
    info = info
        .replace(/^\[[a-zA-Z\-\s\d]+]\s?/i, '')
        .replace(/\s?\[[a-zA-Z\s\d]+](?=\.)/i, '')
        .replace(/s\d+\s+-\s+\d+/i, r => r.replace(/\s+-\s+/, 'E')) // S2 - 13
        .replace(/(?<!(part|\.))\s\d+\s+-\s+\d+\s/i, r => r.replace(/^\s/, ".S").replace(/\s+-\s+/, 'E')) // 12 - 13
        .replace(/\s-\s(?=s\d+e\d+)/i, '.')
        .replace(/\.\s?(mkv|mp4|avi|wmv)/g, "")
        .trim();

    info = normalizeSeasonText(info.toLowerCase());

    let quality = info.match(/\s[\[(](web\s)?\d\d\d\d?p[\])]/gi);
    if (quality) {
        let temp = quality[0].match(/\d\d\d\d?p/i)[0];
        info = temp + '.' + info.replace(quality[0], '');
    }

    return info;
}
