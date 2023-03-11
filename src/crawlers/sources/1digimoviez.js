import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    getType,
    removeDuplicateLinks,
    checkDubbed,
    getYear,
    getSeasonEpisode
} from "../utils.js";
import {getTitleAndYear, purgeTitle} from "../movieTitle.js";
import {
    purgeEncoderText,
    purgeSizeText,
    purgeQualityText,
    fixLinkInfo,
    fixLinkInfoOrder,
    releaseRegex,
} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {getWatchOnlineLinksModel} from "../../models/watchOnlineLinks.js";
import {saveError} from "../../error/saveError.js";

export const sourceConfig = Object.freeze({
    sourceName: "digimoviez",
    needHeadlessBrowser: true,
    sourceAuthStatus: 'login-cookie',
    vpnStatus: {
        poster: 'allOk',
        trailer: 'noVpn',
        downloadLink: 'noVpn',
    },
    replaceInfoOnDuplicate: false,
});

export default async function digimoviez({movie_url, serial_url, page_count, serial_page_count}) {
    let p1 = await wrapper_module(sourceConfig, serial_url, serial_page_count, search_title);
    let p2 = await wrapper_module(sourceConfig, movie_url, page_count, search_title);
    return [p1, p2];
}

export function digimovie_checkTitle(text, title, url) {
    return (
        (text && text.includes('دانلود') && text.includes('ادامه')) ||
        (url.includes('/serie') && title && title.includes('دانلود') && title !== 'دانلود فیلم' && title !== 'دانلود سریال')
    );
}

async function search_title(link, i, $, url) {
    try {
        let text = link.text();
        let title = link.attr('title');
        if (digimovie_checkTitle(text, title, url)) {
            title = title.toLowerCase();
            let year;
            let type = getType(title);
            if (url.includes('serie')) {
                type = type.replace('movie', 'serial');
            }
            let pageLink = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`digimoviez/${type}/${i}/${title}  ========>  `);
            }
            if (title.includes('ایران')) {
                return;
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData,
                    getQualitySample, linkCheck, true);

                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        ({title, year} = fixTitleAndYear(title, year, type, pageLink, downloadLinks, $2));
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && (downloadLinks[0].season > 0 || downloadLinks[0].episode > 0)) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData,
                            getQualitySample, linkCheck, true);

                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies} = pageSearchResult);
                    }
                    downloadLinks = removeDuplicateLinks(downloadLinks, sourceConfig.replaceInfoOnDuplicate);
                    const qualitySampleLinks = downloadLinks.map(item => item.qualitySample).filter(item => item);
                    downloadLinks = downloadLinks.filter(item => !qualitySampleLinks.includes(item.link));

                    let sourceData = {
                        sourceConfig,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: summaryExtractor.getPersianSummary($2, title, year),
                        poster: posterExtractor.getPoster($2, sourceConfig.sourceName),
                        trailers: trailerExtractor.getTrailers($2, sourceConfig.sourceName, sourceConfig.vpnStatus),
                        subtitles: [],
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

function fixTitleAndYear(title, year, type, page_link, downloadLinks, $2) {
    try {
        let titleHeader = $2('.head_meta');
        if (titleHeader) {
            let temp = $2($2($2(titleHeader).children()[1]).children()[0]).text().toLowerCase();
            let splitTitle = purgeTitle(temp, type, true);
            year = splitTitle[splitTitle.length - 1];
            if (!isNaN(year) && Number(year) > 1900) {
                splitTitle.pop();
                title = splitTitle.join(" ");
                if (year.length === 8) {
                    let y1 = year.slice(0, 4);
                    let y2 = year.slice(4);
                    if (y1 > 2000 && y2 > 2000) {
                        year = Math.min(y1, y2);
                    } else {
                        year = y1;
                    }
                } else if (year.length > 4) {
                    year = year.slice(0, 4);
                }
            } else {
                title = splitTitle.join(" ");
                year = getYear(title, page_link, downloadLinks);
            }
            return {title, year};
        }
        return {title, year: year || ''};
    } catch (error) {
        saveError(error);
        return {title, year: year || ''};
    }
}

function getWatchOnlineLinks($, type, pageLink) {
    //NOTE: need vip account to access
    try {
        let result = [];
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let infoNode = $($a[i]).parent().parent().parent().prev().children()[1];
            let infoText = $(infoNode).text();
            if (infoText && infoText.includes('پخش آنلاین')) {
                let linkHref = $($a[i]).attr('href');
                if (!linkHref.includes('/play/')) {
                    continue;
                }
                let info = purgeQualityText($($(infoNode).children()[0]).text()).replace(/\s+/g, '.');
                info = fixLinkInfo(info, linkHref);
                info = fixLinkInfoOrder(info);
                let sizeMatch = infoText.match(/(\d\d\d?\s*MB)|(\d\d?(\.\d\d?)?\s*GB)/gi);
                let size = sizeMatch ? purgeSizeText(sizeMatch.pop()) : '';
                info = size ? (info + ' - ' + size.replace(/\s+/, '')) : info;
                let watchOnlineLink = getWatchOnlineLinksModel($($a[i]).prev().attr('href'), info, type, sourceConfig.sourceName, pageLink);
                watchOnlineLink.link = linkHref;
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

function linkCheck($, link) {
    let linkHref = $(link).attr('href');
    return (linkHref.includes('digimovie') && linkHref.endsWith('lm_action=download'));
}

export function getFileData($, link, type) {
    try {
        let linkHref = $(link).attr('href');
        let se = getSeasonEpisode(linkHref);
        let seasonEpisodeFromLink = 'S' + se.season + 'E' + se.episode;
        let seasonData = getSeasonEpisode_extra($, link, type);
        if (seasonData === 'ignore') {
            seasonData = {
                seasonName: '',
                seasonEpisode: '',
            };
        }
        if (type.includes('serial') && seasonEpisodeFromLink !== seasonData.seasonEpisode) {
            if (se.season !== 0 && se.episode !== 0) {
                seasonData.seasonEpisode = seasonEpisodeFromLink;
            }
        }

        let infoNode = (type.includes('serial') || linkHref.match(/s\d+e\d+/gi))
            ? $($(link).parent().parent().parent().prev().children()[1]).children()
            : $(link).parent().parent().next().children();
        let isOva = false;
        if (type.includes('serial') && $($(link).parent().parent().parent().prev().children()[0]).text().includes('فصل : OVA')) {
            isOva = true;
        }
        let infoNodeChildren = $(infoNode[1]).children();
        let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
        let quality = purgeQualityText($(infoNode[0]).text()).replace(/\s+/g, '.').replace('زیرنویس.چسبیده', '');
        let hardSub = quality.match(/softsub|hardsub/gi) || linkHref.match(/softsub|hardsub/gi);
        if (hardSub) {
            hardSub = hardSub[0];
            quality = quality.replace('.' + hardSub, '');
        }

        if (quality.includes('.Dual.Audio') || linkHref.includes('.Dual.Audio')) {
            quality = quality.replace('.Dual.Audio', '');
            dubbed = 'dubbed';
        }

        let encoder = (infoNodeChildren.length === 3) ? purgeEncoderText($(infoNodeChildren[0]).text()) : '';
        encoder = encoder
            .replace('DigiMoviez', '')
            .replace(/https:?\/\/.+(mkv|jpg)/, '')
            .replace('نسخه زیرنویس چسبیده فارسی', '');
        let size = (infoNodeChildren.length === 3)
            ? purgeSizeText($(infoNodeChildren[1]).text())
            : purgeSizeText($(infoNodeChildren[0]).text());
        if (size.includes('ENCODER')) {
            size = '';
        }
        let seasonStack = '';
        if (encoder.includes('تمامی قسمت ها در یک فایل قرار دارد')) {
            encoder = encoder.replace('تمامی قسمت ها در یک فایل قرار دارد', '');
            seasonStack = ' (whole season in one file)'
            size = '';
        }
        let info = [quality, encoder, hardSub, dubbed, seasonStack].filter(value => value).join('.');
        info = fixLinkInfo(info, linkHref);
        info = fixLinkInfoOrder(info);
        if (seasonData.seasonEpisode) {
            info = seasonData.seasonEpisode + '.' + info;
        }
        if (seasonData.seasonName) {
            info = info + '.' + seasonData.seasonName;
        }
        if (isOva && !info.match(/Special|OVA|NCED|NCOP/)) {
            info = info.replace(new RegExp(`\\.(${releaseRegex.source})`), (res) => '.OVA' + res);
        }
        return [info, size].filter(value => value).join(' - ');
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getSeasonEpisode_extra($, link, type) {
    try {
        let seasonEpisode = '';
        let seasonName = '';
        let linkText = $(link).text() || '';
        if (type.includes('serial') || linkText.includes('دانلود قسمت')) {
            if (!linkText) {
                return 'ignore';
            }

            linkText = linkText.replace('دانلود قسمت', '').replace(/\./g, '').trim();
            let episodeNumber;
            if (linkText === 'ویژه') {
                episodeNumber = 0;
            } else if (!isNaN(linkText)) {
                episodeNumber = Number(linkText);
            } else {
                return 'ignore';
            }
            let seasonInfo = $($($(link).parent().parent().parent().prev().children()[0]).children()[1]).text();
            seasonInfo = seasonInfo.replace(/\d+قسمت/, '').trim();
            let seasonMatch = seasonInfo.match(/فصل\s*:\s*\d+/g);
            if (seasonMatch) {
                let seasonNumber = seasonMatch.pop().match(/\d+/g).pop();
                if (!seasonNumber || Number(seasonNumber) === 0) {
                    return 'ignore';
                }
                seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber;
            } else if (!seasonInfo.match(/\d/)) {
                seasonName = seasonInfo.replace('فصل :', '').trim().replace(/\s+/g, '_');
                if (seasonName.match(/^(ova|nced|ncop|special)$/i)) {
                    seasonEpisode = 'S0E' + episodeNumber;
                } else {
                    seasonEpisode = 'S1E' + episodeNumber;
                }
            } else {
                return 'ignore';
            }
        }
        return {seasonEpisode, seasonName};
    } catch (error) {
        saveError(error);
        return 'ignore';
    }
}

function getQualitySample($, link, type) {
    try {
        if (type.includes('serial') || $(link).attr('href').match(/s\d+e\d+/gi)) {
            return '';
        }
        let nextNode = $(link).next()[0];
        let sampleUrl = nextNode ? nextNode.attribs.href : '';
        if (sampleUrl.match(/\.(jpeg|jpg|png)/) || sampleUrl.endsWith('lm_action=download')) {
            return sampleUrl;
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}
