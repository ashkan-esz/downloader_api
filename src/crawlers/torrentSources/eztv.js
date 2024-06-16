import axios from "axios";
import * as cheerio from 'cheerio';
import {saveError} from "../../error/saveError.js";
import {replaceSpecialCharacters} from "../utils/utils.js";
import {saveLinksStatus} from "../searchTools.js";
import save from "../save_changes_db.js";
import {addPageLinkToCrawlerStatus} from "../status/crawlerStatus.js";
import {CookieJar} from "tough-cookie";
import {wrapper} from "axios-cookiejar-support";
import {
    fixSeasonEpisode,
    getFixedFileSize, handleCrawledTitles, handleSearchedCrawledTitles,
    mergeTitleLinks,
    normalizeSeasonText,
    removeSeasonText
} from "./torrentUtils.js";


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
                title = removeSeasonText(title);

                let se = fixSeasonEpisode(info, false);
                let sizeText = $($($a[i]).parent().next())?.text() || "";
                let size = getFixedFileSize($, sizeText);

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

    titles = mergeTitleLinks(titles);
    return titles;
}

function fixLinkInfo(info) {
    info = info
        .trim()
        .replace(/^\[[a-zA-Z\-\s\d]+]\s?/i, '')
        .replace(/\s?\[[a-zA-Z\s\d]+](?=\.)/i, '')
        .replace(/s\d+\s+-\s+\d+/i, r => r.replace(/\s+-\s+/, 'E')) // S2 - 13
        .replace(/(?<!(part|\.))\s\d+\s+-\s+\d+\s/i, r => r.replace(/^\s/, ".S").replace(/\s+-\s+/, 'E')) // 12 - 13
        .replace(/\s-\s(?=s\d+e\d+)/i, '.')
        .replace(/\.\s?(mkv|mp4)/g, "")
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
        .replace(/(\s\d\d+)?\.\s?(mkv|mp4)/, '')
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
