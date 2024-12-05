import axios from "axios";
import * as cheerio from 'cheerio';
import {saveError} from "../../error/saveError.js";
import {replaceSpecialCharacters} from "../utils/utils.js";
import {releaseRegex, releaseRegex2} from "../linkInfoUtils.js";
import {saveLinksStatus} from "../searchTools.js";
import save from "../save_changes_db.js";
import {addPageLinkToCrawlerStatus} from "../status/crawlerStatus.js";
import {
    _japaneseCharactersRegex,
    fixSeasonEpisode,
    getFixedFileSize, handleCrawledTitles, handleSearchedCrawledTitles,
    mergeTitleLinks,
    normalizeSeasonText,
    removeSeasonText
} from "./torrentUtils.js";


export const sourceConfig = Object.freeze({
    sourceName: "nyaa",
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

export default async function nyaa({movie_url, serial_url}, pageCount, extraConfigs = {}) {
    try {
        saveLinksStatus(movie_url, "sourcePage", "fetchingStart");
        let res = await axios.get(movie_url);
        saveLinksStatus(movie_url, "sourcePage", "fetchingEnd");
        let $ = cheerio.load(res.data);
        let titles = extractLinks($, movie_url);

        await handleCrawledTitles(titles, 1, pageCount, saveCrawlData, sourceConfig, extraConfigs);

        return [1]; //pageNumber
    } catch (error) {
        if (extraConfigs.retryCounter === undefined) {
            extraConfigs.retryCounter = 0;
        }
        if (error.code === "EAI_AGAIN") {
            if (extraConfigs.retryCounter < 2) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                extraConfigs.retryCounter++;
                return await nyaa({movie_url, serial_url}, pageCount, extraConfigs);
            }
            return [1];
        }
        if ([500, 521, 522, 525].includes(error.response?.status) && extraConfigs.retryCounter < 2) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            extraConfigs.retryCounter++;
            return await nyaa({movie_url, serial_url}, pageCount, extraConfigs);
        }
        if (![521, 522, 525].includes(error.response?.status)) {
            saveError(error);
        }
        return [1];
    }
}

export async function searchByTitle(sourceUrl, title, extraConfigs = {}) {
    try {
        let searchTitle = title.replace(/\s+/g, '+');
        let searchUrl = sourceUrl + searchTitle;
        saveLinksStatus(searchUrl, "sourcePage", "fetchingStart");
        let res = await axios.get(searchUrl);
        saveLinksStatus(searchUrl, "sourcePage", "fetchingEnd");

        let $ = cheerio.load(res.data);
        let titles = extractLinks($, sourceUrl);

        if (extraConfigs.equalTitlesOnly) {
            titles = titles.filter(t => t.title === title);
        } else {
            titles = titles.slice(0, 5);
        }

        if (extraConfigs.returnTitlesOnly) {
            return titles;
        }

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
    const type = titleData.links.length > 0 && titleData.links.every(l => l.info.includes('- movie')) ? 'anime_movie' : 'anime_serial';
    await save(titleData.title, type, "", sourceData, 1, extraConfigs);
}

function extractLinks($, sourceUrl) {
    let $a = $('a');
    let titles = [];
    for (let i = 0; i < $a.length; i++) {
        try {
            let href = $($a[i]).attr('href');
            if (href?.match(/\d+\.torrent/i)) {
                let infoNode = $($a[i]).parent().prev().children();
                if (infoNode.length > 1) {
                    infoNode = infoNode[infoNode.length - 1];
                }
                let info = $(infoNode).text();
                info = fixLinkInfo(info);
                if (
                    info.match(/\(\d{4}\)/) ||
                    info.includes(' complete') ||
                    info.includes(' vostfr') ||
                    info.match(/\s\d+ ~ \d+/) ||
                    info.match(/-\s\d+-\d+\s/)
                ) {
                    continue;
                }

                let title = getTitle(info);
                if (title.match(/\svol\s\d/i)) {
                    continue;
                }

                let se = fixSeasonEpisode(info, false);
                let sizeText = $($($a[i]).parent().next())?.text() || "";
                let size = getFixedFileSize($, sizeText);

                let link = {
                    link: sourceUrl.split(/\/\?/)[0] + href,
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
        .replace(/\.\s?(mkv|mp4|avi|wmv)/, "")
        .trim();

    info = normalizeSeasonText(info.toLowerCase());

    let quality = info.match(/\s[\[(](web\s)?\d\d\d\d?p[\])]/gi);
    if (quality) {
        let temp = quality[0].match(/\d\d\d\d?p/i)[0];
        info = temp + '.' + info.replace(quality[0], '');
    }
    info = info.replace(/([a-zA-Z])(?<![se])(?=\d)/g, '$1 ')
    return info;
}

function getTitle(text) {
    text = text.split(' - ')[0]
        .replace(/^zip\./, '')
        .replace(/hk-?rip/gi, 'HD-RIP')
        .split(new RegExp(`[\(\\[](${releaseRegex.source}|BD)`, 'i'))[0]
        .split(new RegExp(`[\(\\[](${releaseRegex2.source}|BD)`, 'i'))[0]
        .split(_japaneseCharactersRegex)[0]
        .split(/_-_\d+/g)[0]
        .split(/_\d+-\d+_/g)[0]
        .replace(/^\d\d\d\d?p\./, '')
        .replace(/(\s\d\d+)?\.(mkv|mp4|avi|wmv)/, '')
        .replace(/\sii+$/, '')
        .replace(/\s\(\d{4}\)/, '')
        .split(/[\[？|]/g)[0]
        .split(/\s\((web|dvd|raw|vhd|ld|jpbd)/)[0]
        .split(/\s\(?(480|720|1080|2160)p/)[0]
        .split(/_\(\d+x\d+/)[0]
        .trim()
        .replace(/(?<!(movie))\s?(_\d+\s?)+_?$/, '')
        .replace(/\s\(\d+-\d+\)\s*$/, '')
        .replace(/\send$/, '')
        .replace(/\s\((ja|ca)\)$/, '')
        .replace(/\s\(((un)?censored\s)?[a-zA-Z]+\ssub\)$/, '')
        .replace(/\ss0?1$/, '')
        .replace(/\s\(?dual audio\)?/, '')
        .trim();

    let splitArr = text.split(/\s|\./g);
    let index = splitArr.findIndex(item => item.match(/s\d+e\d+/))
    if (index !== -1) {
        let temp = replaceSpecialCharacters(splitArr.slice(0, index).join(" "));
        if (index <= splitArr.length && temp.endsWith('season')) {
            temp = temp.replace(/\sseason$/, '');
        }
        return removeSeasonText(temp);
    }

    text = text.replace(/\s\d\d\d*-\d\d\d*$/, '');
    let temp = replaceSpecialCharacters(text);
    return removeSeasonText(temp);
}
