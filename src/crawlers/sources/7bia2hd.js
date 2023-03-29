import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks,
    replacePersianNumbers,
} from "../utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {
    purgeEncoderText,
    purgeSizeText,
    fixLinkInfoOrder,
    fixLinkInfo,
    purgeQualityText,
} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {wordsToNumbers} from "words-to-numbers";
import {getSubtitleModel} from "../../models/subtitle.js";
import {subtitleFormatsRegex} from "../subtitle.js";
import {getWatchOnlineLinksModel} from "../../models/watchOnlineLinks.js";
import {saveError} from "../../error/saveError.js";

export const sourceConfig = Object.freeze({
    sourceName: "bia2hd",
    needHeadlessBrowser: false,
    sourceAuthStatus: 'ok',
    vpnStatus: Object.freeze({
        poster: 'allOk',
        trailer: 'allOk',
        downloadLink: 'noVpn',
    }),
    replaceInfoOnDuplicate: true,
});

export default async function bia2hd({movie_url, serial_url, page_count, serial_page_count}) {
    let p1 = await wrapper_module(sourceConfig, serial_url, serial_page_count, search_title);
    let p2 = await wrapper_module(sourceConfig, movie_url, page_count, search_title);
    return [p1, p2];
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let year;
            let pageLink = link.attr('href');
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`bia2hd/${type}/${i}/${title}  ========>  `);
            }
            if (title.includes('ایران')) {
                return;
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '' && !checkPersianSerial(title)) {
                let pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2, type);
                    }
                    downloadLinks = removeDuplicateLinks(downloadLinks, sourceConfig.replaceInfoOnDuplicate);
                    downloadLinks = handleLinksExtraStuff(downloadLinks);

                    let sourceData = {
                        sourceConfig,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: getWatchOnlineLinks($2, type, pageLink),
                        persianSummary: summaryExtractor.getPersianSummary($2, title, year),
                        poster: posterExtractor.getPoster($2, sourceConfig.sourceName),
                        trailers: trailerExtractor.getTrailers($2, sourceConfig.sourceName, sourceConfig.vpnStatus),
                        subtitles: getSubtitles($2, type, pageLink),
                        cookies
                    };
                    await save(title, type, year, sourceData);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function fixYear($, type) {
    try {
        let state = 0;
        let postInfo = $('li:contains("سال انتشار")');
        if (postInfo.length === 0) {
            state = 1;
            postInfo = $('li:contains("سال های پخش")');
        }
        if (postInfo.length === 1) {
            let temp = $(postInfo).text().replace('سال های پخش', '').replace('سال انتشار', '').toLowerCase().trim();
            if (!temp && state === 0) {
                postInfo = $('li:contains("سال های پخش")');
                if (postInfo.length === 1) {
                    temp = $(postInfo).text().replace('سال های پخش', '').replace('سال انتشار', '').toLowerCase().trim();
                }
            }
            let yearArray = temp.split(/\s+|-|–/g)
                .filter(item => item && !isNaN(item.trim()))
                .sort((a, b) => Number(a) - Number(b));
            if (yearArray.length === 0) {
                return '';
            }
            return validateYear(yearArray[0]);
        }
        if (type.includes('movie')) {
            let postInfo = $('span[class=pr-item]:contains("سال انتشار")');
            let temp = $(postInfo).text().replace('سال انتشار', '').toLowerCase().trim();
            let yearArray = temp.split(/\s+|-|–/g)
                .filter(item => item && !isNaN(item.trim()))
                .sort((a, b) => Number(a) - Number(b));
            if (yearArray.length === 0) {
                return '';
            }
            return validateYear(yearArray[0]);
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getWatchOnlineLinks($, type, pageLink) {
    try {
        let result = [];
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let text = $($a[i]).text();
            if (text && text.toLowerCase().includes('پخش آنلاین') || $($a[i]).hasClass('play-online')) {
                let linkHref = $($a[i]).attr('href');
                let info = linkHref.includes('1080') ? '1080p' : linkHref.includes('480') ? '480p' : '720p';
                if ($($($a[i]).parent()[0]).hasClass('download-links')) {
                    info = getFileData($, $a[i], type);
                }
                let watchOnlineLink = getWatchOnlineLinksModel(linkHref, info, type, sourceConfig.sourceName, pageLink);
                result.push(watchOnlineLink);
            }
        }

        result = removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getSubtitles($, type, pageLink) {
    try {
        let result = [];
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let linkHref = $($a[i]).attr('href');
            if (linkHref) {
                if (linkHref.match(subtitleFormatsRegex)) {
                    let subtitle = getSubtitleModel(linkHref, '', type, sourceConfig.sourceName, pageLink, true);
                    result.push(subtitle);
                } else if (linkHref.includes('/subtitles/')) {
                    let temp = linkHref.replace(/\/farsi_persian$/i, '').split('/').pop().replace(/-/g, ' ').toLowerCase();
                    temp = temp.replace(' sconed ', ' second ');
                    temp = wordsToNumbers(temp).toString();
                    let seasonMatch = temp.match(/\s\d\d?(\sseason)?(\s\d\d\d\d)?$/gi);
                    let season = seasonMatch ? seasonMatch.pop().replace(/(season)|\d\d\d\d/gi, '').trim() : '';
                    let subtitle = getSubtitleModel(linkHref, '', type, sourceConfig.sourceName, pageLink, false);
                    if (season) {
                        let seasonNumber = Number(season);
                        subtitle.info = (subtitle.episode === 0)
                            ? subtitle.info.replace(/\(season \d\d?\)/i, `(Season ${seasonNumber})`)
                            : `AllEpisodesOf(Season ${seasonNumber})`;
                        subtitle.season = seasonNumber;
                        subtitle.episode = 0;
                    } else if (!subtitle.info && subtitle.episode !== 0) {
                        subtitle.info = 'AllEpisodesOf(Season 1)';
                        subtitle.episode = 0;
                    }
                    result.push(subtitle);
                }
            }
        }

        result = removeDuplicateLinks(result);
        if (type.includes('serial')) {
            let filterDuplicateLinksByInfo = [];
            for (let i = 0; i < result.length; i++) {
                let found = false;
                for (let j = 0; j < filterDuplicateLinksByInfo.length; j++) {
                    if (
                        result[i].info === filterDuplicateLinksByInfo[j].info &&
                        result[i].season === filterDuplicateLinksByInfo[j].season &&
                        result[i].episode === filterDuplicateLinksByInfo[j].episode
                    ) {
                        found = true;
                        filterDuplicateLinksByInfo[j].link = result[i].link;
                    }
                }
                if (!found) {
                    filterDuplicateLinksByInfo.push(result[i]);
                }
            }
            return filterDuplicateLinksByInfo;
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

export function getFileData($, link, type) {
    try {
        return type.includes('serial')
            ? getFileData_serial($, link)
            : getFileData_movie($, link);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getFileData_serial($, link) {
    let infoNodeChildren = $($(link).parent().parent().parent().parent().prev().children()[0]).children();
    let linkHref = $(link).attr('href').split('ihttp')[0];
    if (!linkHref.match(/http|www\.|s\d+/)) {
        return 'ignore';
    }
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = $(infoNodeChildren[2]).text()
    quality = replacePersianNumbers(quality);
    quality = purgeQualityText(quality).replace(/\s/g, '.');
    let hardSub = linkHref.match(/softsub|hardsub/gi);
    hardSub = hardSub ? hardSub[0] : checkHardSub(linkHref) ? 'HardSub' : '';

    let size = '';
    if ($(link).parent()[0].name === 'div') {
        let sizeInfoNodeChildren = $($(link).parent().prev().children()[0]).children();
        for (let i = 0; i < sizeInfoNodeChildren.length; i++) {
            let sizeText = $(sizeInfoNodeChildren[1]).text();
            if (sizeText.includes('حجم')) {
                size = purgeSizeText(sizeText);
                break;
            }
        }
    }
    let info = [quality, hardSub, dubbed].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(value => value).join(' - ');
}

function getFileData_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let linkHref = $(link).attr('href').split('ihttp')[0];
    if (!linkHref.match(/http|www\.|s\d+/)) {
        return 'ignore';
    }
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let qualityText = $(infoNodeChildren[1]).text();
    let sizeText = $(infoNodeChildren[2]).text();
    let encoderText = $(infoNodeChildren[3]).text();
    let quality = replacePersianNumbers(qualityText);
    if (qualityText.includes('انکودر')) {
        quality = purgeEncoderText(quality).replace(/(^\.)|(\.$)/g, '');
    }
    quality = purgeQualityText(quality).replace(/\s+/g, '.');
    let hardSub = linkHref.match(/softsub|hardsub/i)?.[0] || (checkHardSub(linkHref) ? 'HardSub' : '');
    let size = purgeSizeText(sizeText);
    let encoder = purgeEncoderText(encoderText);
    if (sizeText.includes('انکودر') && !encoderText) {
        size = '';
        encoder = purgeEncoderText(sizeText);
    }
    if (infoNodeChildren.length === 2 && qualityText.includes('انکودر')) {
        size = '';
        encoder = purgeEncoderText(quality).replace(/(^\.)|(\.$)/g, '');
        quality = '';
    }
    if (infoNodeChildren.length <= 3 && qualityText.includes('حجم') && qualityText.includes('مگابایت')) {
        size = purgeSizeText(qualityText);
        quality = '';
    }
    if (qualityText.includes('بایت') && sizeText.match(/\d\d\d\d?p/)) {
        quality = purgeQualityText(sizeText.replace('حجم', ''));
        size = purgeSizeText(qualityText.replace('کیفیت', ''));
    }

    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    let temp = linkHref.split('/').pop().split(/\.\d\d\d\d\./).pop().split(/[!.-]+/g).filter(item => item);
    let seasonEpisodeIndex = temp.findIndex((item, index) => (index !== 0 && item.match(/\d\d\d\d?p/)) || item === "MkvCage" || item === "MkvCage");
    if (seasonEpisodeIndex !== -1) {
        let temp2 = temp.slice(0, seasonEpisodeIndex).join('.')
            .replace('DIRECTORS.CUT', '')
            .replace('Encore.Edition', '')
            .replace('3D', '')
            .replace('EXTENDED', '')
            .replace('REMASTERED', '')
            .replace(/Part[._]\d/i, '');
        if (temp2) {
            info = info.replace('.' + temp2, '');
        }
    }
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(value => value).join(' - ');
}

function checkPersianSerial(title) {
    let names = [
        'bidar bash', 'dodkesh', 'bi seda faryad kon',
        'baaghe mozaffar', 'avaye baran', 'sakhteman pezeshkan',
        'kolah pahlavi', 'marde 2000 chehreh', 'zero degree turn',
        'the man with a thousand faces', 'merajiha', 'mokhtarnameh',
        'motaham gorikht', 'padari', 'roshantar az khamoshi',
        'ziba barbershop', 'ashkha va labkhandha', 'moammaye shah',
        'se dar chahar', 'breath', 'alalbadal', 'dar jostojooie aramesh',
        'legionnaire', 'hasto nist', 'divar be divar', 'gosal',
        'az yadha rafteh', 'recovery', 'zoj ya fard', 'deldadegan 1397',
        'raghs rooi e shisheh', 'baradar jaan', 'shahrzad 1394',
        'golshifte', 'alijenab', 'kargadan', 'shahgoosh', 'ashoob', 'mankan',
        'nahang abi aka blue whale', 'asheghaneh', 'salhaye door az khane',
    ];
    for (let i = 0; i < names.length; i++) {
        if (title === names[i]) {
            return true;
        }
    }
    return false;
}

export function handleLinksExtraStuff(downloadLinks) {
    if (downloadLinks.every(item => item.season === 1 && item.episode === 0 && item.link.match(/chapter(%20)?\d+/i))) {
        return downloadLinks.map(item => {
            const episodeMatch = Number(item.link.match(/(?<=(chapter(%20)?))\d+/i)[0]);
            return {...item, episode: episodeMatch};
        });
    }
    return downloadLinks;
}