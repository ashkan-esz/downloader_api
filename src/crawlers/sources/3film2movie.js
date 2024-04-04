import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    validateYear,
    replacePersianNumbers,
    getType,
    checkHardSub,
    checkDubbed,
    removeDuplicateLinks
} from "../utils/utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {fixLinkInfo, fixLinkInfoOrder, purgeQualityText} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {getWatchOnlineLinksModel} from "../../models/watchOnlineLinks.js";
import {getSubtitleModel} from "../../models/subtitle.js";
import {subtitleFormatsRegex} from "../subtitle.js";
import {saveError} from "../../error/saveError.js";

export const sourceConfig = Object.freeze({
    sourceName: "film2movie",
    needHeadlessBrowser: true,
    sourceAuthStatus: "ok",
    vpnStatus: Object.freeze({
        poster: 'allOk',
        trailer: 'allOk',
        downloadLink: 'allOk',
    }),
    replaceInfoOnDuplicate: true,
});
let prevTitles = [];

export default async function film2movie({movie_url}, pageCount, extraConfigs) {
    prevTitles = [];
    let p1 = await wrapper_module(sourceConfig, movie_url, pageCount, search_title, extraConfigs);
    return [p1];
}

async function search_title(link, pageNumber, $, url, extraConfigs) {
    try {
        let rel = link.attr('rel');
        if (rel && rel === 'bookmark') {
            let title = link.text().toLowerCase();
            let year;
            let type = getType(title);
            let pageLink = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`film2movie/${type}/${pageNumber}/${title}  ========>  `);
            }
            if (
                title.includes('تلویزیونی ماه عسل') ||
                title.includes('ایران') ||
                title.includes('دانلود سریال پهلوانان') ||
                title.includes('دانلود سریال شکرستان') ||
                title.includes('کلاه قرمزی') ||
                title.includes('دانلود فصل')
            ) {
                return;
            }
            let typeFix = '';
            if ((title.includes('دانلود برنامه') || title.includes('دانلود مسابقات')) && !title.includes('سریال')) {
                typeFix = type.replace('serial', 'movie');
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (!prevTitles.find(item => (item.title === title && item.year === year && item.type === type))) {
                prevTitles.push({title, type, year});
                if (prevTitles.length > 50) {
                    prevTitles = prevTitles.slice(prevTitles.length - 30);
                }
            } else {
                return;
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
                    if ($2('.category')?.text().includes('انیمه') && !type.includes('anime')) {
                        type = 'anime_' + type;
                    }
                    if (!year) {
                        year = fixYear($2);
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && (
                        downloadLinks[0].link.match(/\.s\d+e\d+\./i) ||
                        downloadLinks[0].link.match(/\.E\d\d\d?\..*\d\d\d\d?p\./i))) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
                    }
                    if (type.includes('serial') && downloadLinks.length > 0 && downloadLinks.every(item => item.season === 1 && item.episode === 0)) {
                        type = type.replace('serial', 'movie');
                        pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
                    }
                    if (typeFix && (downloadLinks.length === 0 || !downloadLinks[0].link.match(/\.s\d+e\d+\./i))) {
                        type = typeFix; //convert type serial to movie
                        downloadLinks = downloadLinks.map(item => {
                            item.season = 0;
                            item.episode = 0;
                            return item;
                        })
                    }
                    downloadLinks = removeDuplicateLinks(downloadLinks, sourceConfig.replaceInfoOnDuplicate);
                    downloadLinks = handleLinksExtraStuff(downloadLinks);

                    let sourceData = {
                        sourceConfig,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: summaryExtractor.getPersianSummary($2, title, year),
                        poster: posterExtractor.getPoster($2, sourceConfig.sourceName),
                        trailers: trailerExtractor.getTrailers($2, sourceConfig.sourceName, sourceConfig.vpnStatus),
                        subtitles: getSubtitles($2, type, pageLink),
                        cookies
                    };
                    await save(title, type, year, sourceData, pageNumber, extraConfigs);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

export async function handlePageCrawler(pageLink, title, type, pageNumber = 0, extraConfigs) {
    try {
        title = title.toLowerCase();
        let year;
        ({title, year} = getTitleAndYear(title, year, type));

        let pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber, getFileData);
        if (pageSearchResult) {
            let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
            if ($2('.category')?.text().includes('انیمه') && !type.includes('anime')) {
                type = 'anime_' + type;
            }
            if (!year) {
                year = fixYear($2);
            }
            if (type.includes('movie') && downloadLinks.length > 0 && (
                downloadLinks[0].link.match(/\.s\d+e\d+\./i) ||
                downloadLinks[0].link.match(/\.E\d\d\d?\..*\d\d\d\d?p\./i))) {
                type = type.replace('movie', 'serial');
                pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber, getFileData);
                if (!pageSearchResult) {
                    return;
                }
                ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
            }
            if (type.includes('serial') && downloadLinks.length > 0 && downloadLinks.every(item => item.season === 1 && item.episode === 0)) {
                type = type.replace('serial', 'movie');
                pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber, getFileData);
                if (!pageSearchResult) {
                    return;
                }
                ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
            }

            downloadLinks = removeDuplicateLinks(downloadLinks, sourceConfig.replaceInfoOnDuplicate);
            downloadLinks = handleLinksExtraStuff(downloadLinks);

            let sourceData = {
                sourceConfig,
                pageLink,
                downloadLinks,
                watchOnlineLinks: [],
                persianSummary: summaryExtractor.getPersianSummary($2, title, year),
                poster: posterExtractor.getPoster($2, sourceConfig.sourceName),
                trailers: trailerExtractor.getTrailers($2, sourceConfig.sourceName, sourceConfig.vpnStatus),
                subtitles: getSubtitles($2, type, pageLink),
                cookies
            };
            await save(title, type, year, sourceData, pageNumber, extraConfigs);
            return downloadLinks.length;
        }
        return 0;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

function fixYear($) {
    try {
        const postInfo = $('.postinfo');
        if (postInfo) {
            const temp = $($(postInfo).children()[1]).text().toLowerCase();
            const yearArray = temp.split(',').filter(item => item && !isNaN(item.trim()));
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
    //NOTE: links from film2movie.upera.tv
    //NOTE: cannot extract season/episode from link
    try {
        let result = [];
        const $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            const infoNode = type.includes('serial')
                ? $($a[i]).parent()
                : $($a[i]).parent().parent().prev();
            const infoText = $(infoNode).text();
            if (infoText && infoText.includes('پخش آنلاین')) {
                const linkHref = $($a[i]).attr('href');
                if (linkHref.includes('.upera.')) {
                    const info = getFileData($, $a[i], type);
                    const watchOnlineLink = getWatchOnlineLinksModel(linkHref, info, type, sourceConfig.sourceName);
                    result.push(watchOnlineLink);
                }
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
        const $a = $('a');
        for (let i = 0, _length = $a.length; i < _length; i++) {
            const linkHref = $($a[i]).attr('href');
            if (linkHref && linkHref.match(subtitleFormatsRegex)) {
                const subtitle = getSubtitleModel(linkHref, '', type, sourceConfig.sourceName);
                result.push(subtitle);
            }
        }

        result = removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

export function getFileData($, link, type) {
    try {
        return type.includes('serial')
            ? getFileData_serial($, link, type)
            : getFileData_movie($, link, type);
    } catch (error) {
        saveError(error);
        return "";
    }
}

function getFileData_serial($, link, type) {
    if ($(link).hasClass("wp-embedded-video")) {
        return "ignore";
    }
    let textNode = $(link).parent();
    let text = textNode.text();
    while (
        text.includes('بخش اول') ||
        text.includes('بخش دوم') ||
        text.includes('قسمت اول') ||
        text.includes('قسمت دوم') ||
        text.includes('فصل ') ||
        text.includes('دانلود صوت دوبله فارسی') ||
        text.match(/^[-=]+$/)
        ) {
        textNode = textNode.prev();
        text = textNode.text();
    }
    text = replacePersianNumbers(text.replace(/[:_|]/g, ''));
    const linkHref = $(link).attr('href');
    const Censored = (text.toLowerCase().includes('family') || checkDubbed(text, linkHref) || checkHardSub(text) || checkHardSub(linkHref)) ? 'Censored' : '';
    const quality = purgeQualityText(text).replace(/\s/g, '.').replace('.Family', '');
    const roundMatch = linkHref.match(/\.Round\d\d?\./i);
    const round = roundMatch?.pop().replace(/\./g, '').replace(/\d\d?/, (res) => '_' + res) || '';
    let info = [quality, round, Censored].filter(Boolean).join('.');
    info = fixSpecialCases(info);
    info = fixLinkInfo(info, linkHref, type);
    info = fixLinkInfoOrder(info);
    return info;
}

function getFileData_movie($, link, type) {
    const parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let textNode = $(parent).prev();
    let text = textNode.text();
    while (
        text.includes('بخش اول') ||
        text.includes('بخش دوم') ||
        text.includes('قسمت اول') ||
        text.includes('قسمت دوم') ||
        text.includes('فصل ') ||
        text.includes('دانلود صوت دوبله فارسی') ||
        text.match(/^[-=]+$/)
        ) {
        textNode = textNode.prev();
        text = textNode.text();
    }
    text = replacePersianNumbers(text);
    const linkHref = $(link).attr('href');
    const Censored = ($(link).next().text().toLowerCase().includes('family') || checkDubbed(linkHref, '') || checkHardSub(linkHref)) ? 'Censored' : '';
    const quality = purgeQualityText(text.replace(/[()]/g, ' ')).replace(/\s/g, '.');
    let info = [quality, Censored].filter(Boolean).join('.');
    info = fixSpecialCases(info);
    info = fixLinkInfo(info, linkHref, type);
    info = fixLinkInfoOrder(info);
    return info;
}

function fixSpecialCases(info) {
    info = info
        .replace('قطر', 'Gatar')
        .replace('دحه', 'Doha')
        .replace('پرتغال', 'Portugal')
        .replace('فرانسه', 'France')
        .replace('ایتالیا', 'Italy')
        .replace('کاتالنیا', 'Catalunya')
        .replace('آلمان', 'Germany')
        .replace('بحرین', 'Bahrain')
        .replace('امیلیا-رمانیا', 'Emilia-Romagna')
        .replace('امیلیارمانیا', 'Emilia-Romagna')
        .replace('اسپانیا', 'Spanish')
        .replace('مناک', 'Monaco')
        .replace('جمهری.آذریجان', 'Azerbaijan')
        .replace('اتریش', 'Austrian')
        .replace('استیریا', 'Styria')
        .replace('مجارستان', 'Hungarian')
        .replace('بریتانیا', 'British')
        .replace('گرند.پری', 'Grand-Prix')
        .replace('بلژیک', 'Belgium')
        .replace('تسکانی', 'Tuscan')
        .replace('رسیه', 'Russian')
        .replace('آیفل', 'Eifel')
        .replace('ترکیه', 'Turkish')
        .replace('صخیر', 'Sakhir')
        .replace('ابظبی', 'Abu-Dhabi')
        .replace('خرز', 'Jerez')
        .replace('اندلس', 'Andalucia')
        .replace('جمهری.چک', 'Czech-Republic')
        .replace('سن.مارین', 'Lenovo-San-Marino')
        .replace('آراگن', 'Aragon')
        .replace('ترئل', 'Teruel')
        .replace('ارپا', 'Europa')
        .replace('النسیا', 'Valenciana')
        .replace('دیتنا', 'Daytona')
        .replace('آتلانتا', 'Atlanta')
        .replace('آرلینگتن', 'Arlington')
        .replace('تمپا', 'Tampa')
        .replace('سن.دیگ', 'San-Diego')
        .replace('گلندیل', 'Glendale')
        .replace('اکلند', 'Oakland')
        .replace('آناهایم', 'Anaheim')
        .replace('سنت.لئیس', 'St-Louis');

    return info.replace(/.+\.\d\d\d\d?p/, (res) => res.split('.').reverse().join('.'));
}

export function handleLinksExtraStuff(downloadLinks) {
    for (let i = 0; i < downloadLinks.length; i++) {
        if (downloadLinks[i].info.includes('OVA') && downloadLinks[i].season === 1) {
            downloadLinks[i].season = 0;
        }
    }
    return downloadLinks;
}
