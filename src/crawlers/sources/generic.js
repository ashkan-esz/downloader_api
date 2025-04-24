import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import * as utils from "../utils/utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {
    fixLinkInfo,
    fixLinkInfoOrder,
    purgeQualityText,
    purgeSizeText,
    encodersRegex,
    releaseRegex,
    specialWords,
} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {getWatchOnlineLinksModel} from "../../models/watchOnlineLinks.js";
import {getSubtitleModel} from "../../models/subtitle.js";
import {subtitleFormatsRegex} from "../subtitle.js";
import {saveError} from "../../error/saveError.js";
import * as persianRex from "persian-rex";
import * as axiosUtils from "../utils/axiosUtils.js";
import * as jikanApi from "../3rdPartyApi/jikanApi.js";


export default async function generic(sourceConfig, pageCount, extraConfigs = {}) {
    let p1 = 0, p2 = 0, p3 = 0;
    let count1 = 0, count2 = 0, count3 = 0;

    if (sourceConfig.movie_url) {
        let {
            lastPage,
            linksCount
        } = await wrapper_module(sourceConfig, sourceConfig.movie_url, pageCount, search_title, extraConfigs);
        p1 = lastPage;
        count1 = linksCount;
    }

    if (sourceConfig.serial_url) {
        let {
            lastPage,
            linksCount
        } = await wrapper_module(sourceConfig, sourceConfig.serial_url, pageCount, search_title, extraConfigs);
        p2 = lastPage;
        count2 = linksCount;
    }

    if (sourceConfig.anime_url) {
        let {
            lastPage,
            linksCount
        } = await wrapper_module(sourceConfig, sourceConfig.anime_url, pageCount, search_title, extraConfigs);
        p3 = lastPage;
        count3 = linksCount;
    }

    let count = (count1 || 0) + (count2 || 0) + (count3 || 0);
    return [p1, p2, p3, count];
}

async function search_title(link, pageNumber, $, url, sourceConfig, extraConfigs) {
    try {

        if (sourceConfig.config.isTorrent) {
            //TODO : not implemented
            return 0;
        }

        let pageLink = link.attr('href');

        let {text, title} = getTitle($, link, pageLink, url);
        if (!text && !title) {
            return 0;
        }

        if (!pageLink.startsWith('http')) {
            //relative links
            pageLink = url.split(/(?<=([a-zA-Z\d])\/)/g)[0] + pageLink.replace(/^\//, '');
        }

        title = title.replace('download', '');
        text = text.replace('download', '');

        let year = '';
        let detectedTitle = '';
        let type = utils.getType(title || text);

        if ((title.includes('فصل') && !title.includes('فیلم فصل')) ||
            (text.includes('فصل') && !text.includes('فیلم فصل')) ||
            text.includes('سریال') ||
            utils.getDecodedLink(pageLink).includes('سریال') ||
            pageLink.includes('serie') ||
            pageLink.includes('/series/') ||
            url.includes('/series/')) {
            type = type.replace('movie', 'serial');
        } else if (type.includes('serial') && (
            title.includes('فیلم') ||
            text.includes('فیلم') ||
            url.includes('/movies/') ||
            url.includes('/film')
        )) {
            type = type.replace('serial', 'movie');
        }

        if (!type.includes('anime') && url.includes('/anime/')) {
            type = "anime_" + type;
        }

        const isCeremony = title.includes('دانلود مراسم');
        const isCollection = title.includes('کالکشن فیلم') || title.includes('کالکشن انیمیشن');

        if (text && text.length > 10 && text.length < title.length) {
            ({title: detectedTitle, year} = getTitleAndYear(text, year, type));
            if (!detectedTitle) {
                ({title: detectedTitle, year} = getTitleAndYear(title, year, type));
            }
        } else {
            ({title: detectedTitle, year} = getTitleAndYear(title, year, type));
            if (!detectedTitle) {
                ({title: detectedTitle, year} = getTitleAndYear(text, year, type));
            }
        }

        if (!detectedTitle || detectedTitle.match(/^\d+$/)) {
            return 0;
        }

        if (config.nodeEnv === 'dev') {
            console.log(`${sourceConfig.config.sourceName}/${type}/${pageNumber}/${title || text}  ========>  `);
        }

        // crawl the movie download page
        let pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber,
            getFileData, null, extra_link_checker);
        if (!pageSearchResult) {
            return 0;
        }

        let {downloadLinks, $2, cookies, pageContent, responseUrl} = pageSearchResult;

        // check type of the result
        let newType = checkResultType(type, downloadLinks);
        if (type !== newType) {
            type = newType;

            //reCrawl
            pageSearchResult = await search_in_title_page(sourceConfig, extraConfigs, title, type, pageLink, pageNumber,
                getFileData, null, extra_link_checker);
            if (!pageSearchResult) {
                return 0;
            }

            ({downloadLinks, $2, cookies, pageContent, responseUrl} = pageSearchResult);
        }

        if (utils.getDecodedLink(responseUrl).includes(`redirect_to=${pageLink.replace(/\/$/, '')}`)) {
            return 0;
        }

        if (!year) {
            year = fixYear($2);
        }
        year = fixWrongYear(title, type, year);

        title = replaceShortTitleWithFullTitle(title, type);

        downloadLinks = handleLinksExtraStuff(type, downloadLinks, sourceConfig);

        if (isCollection) {
            title += ' collection';
            addTitleNameToInfo(downloadLinks, title, year);
        } else if (isCeremony) {
            addTitleNameToInfo(downloadLinks, title, year);
        }

        let sourceData = {
            sourceConfig,
            pageLink,
            downloadLinks,
            watchOnlineLinks: sourceConfig.config.has_watch_online ? [] : [],
            torrentLinks: [],
            persianSummary: sourceConfig.config.has_summary
                ? summaryExtractor.getPersianSummary($2, title || text, year)
                : "",
            poster: sourceConfig.config.has_poster
                ? posterExtractor.getPoster($2, pageLink, sourceConfig.config.sourceName, sourceConfig.config.dontRemoveDimensions)
                : "",
            widePoster: sourceConfig.config.has_wide_poster
                ? posterExtractor.getWidePoster($2, pageLink, sourceConfig.config.sourceName)
                : "",
            trailers: sourceConfig.config.has_trailer
                ? trailerExtractor.getTrailers($2, pageLink, sourceConfig.config.sourceName, sourceConfig.config.vpnStatus.trailer)
                : [],
            subtitles: sourceConfig.config.has_subtitle ? [] : [],
            // subtitles: getSubtitles($2, type, pageLink),
            rating: getRatings($2),
            cookies
        };

        if (extraConfigs.returnAfterExtraction) {
            return downloadLinks.length;
        }

        if (sourceConfig.config.checkTrailers) {
            // check trailers are available
            sourceData.trailers = await checkTrailers(sourceData.trailers, sourceConfig);
        }

        await save(detectedTitle, type, year, sourceData, pageNumber, extraConfigs);
        return downloadLinks.length;
    } catch (error) {
        saveError(error);
    }
}

function getTitle($, link, pageLink, url) {
    let title = link.attr('title') || '';
    let text = $($(link).children()[0] || link).text().toLowerCase() || '';
    const firstTitle = title;
    const firstText = text;
    let isPureTitle = false;

    if ($(link).children().length === 0) {
        isPureTitle = true;
    }

    if (!isInvalid(title, text, link, pageLink, url, isPureTitle)) {
        return {text, title};
    }

    if (!isPureTitle && title.match(/^[a-zA-Z\s.\d:]+$/)) {
        isPureTitle = true;
        text = "";
        if (!isInvalid(title, text, link, pageLink, url, isPureTitle)) {
            return {text, title};
        }
    }

    isPureTitle = false;

    text = $($(link).children()[1] || link).text().toLowerCase() || '';

    if ($(link).children()[1] && $($(link).children()[1]).children().length === 0) {
        isPureTitle = true;
    }

    if (!isInvalid(title, text, link, pageLink, url, isPureTitle)) {
        return {text, title};
    }

    // if ($(link).children().first()?.[0]?.name === "img") {
    //     title = $(link).children().first().attr('title') || '';
    //     text = "";
    //     if (!isInvalid(title, text, link, pageLink, url, false)) {
    //         return {text, title};
    //     }
    //
    //     return {text: '', title: ''};
    // }

    if ($(link).children().first()?.children().first()?.[0]?.name === "img") {
        title = $(link).children().first().children().first().attr('title')?.split('|')[0] || '';
        text = "";
        isPureTitle = false;

        if (title.match(/\(.+\)/)) {
            let synonym = title.match(/(?<=\().+(?=\))/)[0];
            title = title.split('(')[0].trim();

            if (!title.match(/[a-zA-Z\d]/) && synonym.match(/[a-zA-Z\d]/)) {
                let currentYear = utils.getCurrentJalaliYear();
                title = synonym
                    .replace((currentYear - 1).toString(), '')
                    .replace(currentYear, '')
                    .replace((currentYear + 1).toString(), '').trim();
                isPureTitle = true;
            }
        }

        if (!isInvalid(title, text, link, pageLink, url, isPureTitle)) {
            return {text, title};
        }

        if (firstTitle && !!firstTitle.match(/^[a-zA-Z\d\sX"∞?!',.:_-]+$/g)) {
            if (!isInvalid(firstTitle, "", link, pageLink, url, true)) {
                return {text: "", title: firstTitle};
            }
        }

        return {text: '', title: ''};
    }

    if (!!$(link).children('img').first()) {
        let img = $(link).children('img').first();
        title = (img.attr('title') || img.attr('alt'))?.split('|')[0] || '';
        text = "";
        isPureTitle = false;

        if (title.match(/\(.+\)/)) {
            let synonym = title.match(/(?<=\().+(?=\))/)[0];
            title = title.split('(')[0].trim();

            if (!title.match(/[a-zA-Z\d]/) && synonym.match(/[a-zA-Z\d]/)) {
                let currentYear = utils.getCurrentJalaliYear();
                title = synonym
                    .replace((currentYear - 1).toString(), '')
                    .replace(currentYear, '')
                    .replace((currentYear + 1).toString(), '').trim();
                isPureTitle = true;
            }

        } else if (title.match(/^[a-zA-Z\d\s:_-]+$/)) {
            isPureTitle = true;
        }

        if (!isInvalid(title, text, link, pageLink, url, isPureTitle)) {
            return {text, title};
        }

        return {text: '', title: ''};
    }

    if ($(link).children().first()?.children().eq(1)[0]?.name === "img") {
        let lastPart = pageLink.replace(/\/$/, '').split('/').pop().replace(/-/g, ' ');

        if (jikanApi.normalizeText(utils.replaceSpecialCharacters(firstText)).includes(
            jikanApi.normalizeText(utils.replaceSpecialCharacters(lastPart)))) {

            text = lastPart;
            if (!isInvalid(title, text, link, pageLink, url, true)) {
                return {text, title};
            }
        }

        return {text: '', title: ''};
    }

    return {text: '', title: ''};
}

function isInvalid(title, text, link, pageLink, url, isPureTitle) {
    if (checkIgnoreTitle(title) || checkIgnoreTitle(text)) {
        return true;
    }
    if (checkInValidTitle(title) || checkInValidTitle(text)) {
        return true;
    }

    if (!isPureTitle) {
        if (!checkValidTitle(title) && !checkValidTitle(text)) {
            return true;
        }
    } else {
        if (persianRex.hasLetter.test(text)) {
            return true;
        }
    }

    if ((!title || title === "0") && (!text || text === "0")) {
        return true;
    }

    if ((!title.replace(/(the)|(\d\d+%)/g, '').trim() || !title.replace(/(the)|(\d\d+%)/g, '').match(/[a-zA-Z\d]/)) &&
        (!text.replace(/(the)|(\d\d+%)/g, '').trim() || !text.replace(/(the)|(\d\d+%)/g, '').match(/[a-zA-Z\d]/))) {
        return true;
    }

    if ((!title || title.includes('\n')) && (!text || text.includes('\n'))) {
        return true;
    }

    // if (!title.match(/[a-zA-Z\d]/) && !text.match(/[a-zA-Z\d]/)) {
    //     return true;
    // }

    if (hasSidebarClass(link)) {
        return true;
    }

    if (pageLink.match(/^(\/)?notification/)) {
        return true;
    }

    if (pageLink.replace(/(https?:\/\/)|(\/$)/g, '') === url.split(/(?<=([a-zA-Z\d])\/)/g)[0].replace(/(https?:\/\/)|(\/$)/g, '')) {
        return true;
    }

    if (pageLink.match(/\/(movies|series|serials)\/$/)) {
        return true;
    }

    return false;
}

function checkResultType(type, downloadLinks) {
    // movie wrong detected as serial
    if (type.includes('serial') && downloadLinks.length > 0 && (
        downloadLinks[0].info === '' ||
        downloadLinks.every(item => item.season === 1 && item.episode === 0)
    )) {
        type = type.replace('serial', 'movie');
    }

    // serial wrong detected as movie
    if (
        type.includes('movie') && downloadLinks.length > 0 && (
            downloadLinks[0].season > 0 ||
            downloadLinks[0].episode > 0 ||
            downloadLinks[0].link.match(/\.e\d+\.(480|720|1080|2160)p\./i) ||
            downloadLinks[0].link.match(/s\d+e\d+/gi) ||
            downloadLinks[0].link.match(/\.E\d\d\d?\..*\d\d\d\d?p?\./i) ||
            downloadLinks[0].link.match(/\.\d\d\d?\.\d\d\d\d?p/i) ||
            downloadLinks[0].link.match(/(?<=\.)(Special|OVA|ONA|OAD|NCED|NCOP|Redial)\.\d\d\d?\.\d\d\d\d?p?/i) ||
            (type === 'anime_movie' && downloadLinks[0].link.match(/\.\d\d\d?\.\d\d\d\d?p/i))
        )) {
        type = type.replace('movie', 'serial');
    }

    return type;
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

function checkIgnoreTitle(title) {
    return title.includes('ایران') ||
        (title.includes('قسمت') && !title.includes('فیلم')) ||
        title.includes('دانلود اپلیکیشن') ||
        title.includes('دریافت اپلیکیشن') ||
        title.includes('فیلم برتر') ||
        title.includes('سریال برتر') ||
        ((title.includes('دانلود برنامه') || title.includes('دانلود مسابقات')) && !title.includes('سریال')) ||
        title.includes('فیلم های') ||
        title.includes('فیلم محبوب سال')
}

function checkInValidTitle(title) {
    return title.includes('مشاهده و دانلود') ||
        title.includes('ادامه و دانلود') ||
        title.includes('contact us') ||
        title.match(/(480|720|1080|2160)p/)
}

function checkValidTitle(title) {
    return title.includes('دانلود') ||
        title.includes('فیلم') ||
        title.includes('سریال') ||
        title.includes('انیمه') ||
        title.includes('انیمیشن')
}

export function hasSidebarClass(element, searchClasses = null) {
    searchClasses = searchClasses || [
        'sidebar', 'special indx', 'menuitem',
        'news', 'trend', 'carousel',
        'trailers', 'actors', 'details',
        'swiper', 'dropdown',
    ];

    const isInsideFooter = element.closest('footer').length > 0;
    if (isInsideFooter) {
        return true;
    }

    let current = element;
    while (current.length) {
        const classes = current.attr('class');
        if (classes) {
            for (let i = 0; i < searchClasses.length; i++) {
                if (classes.toLowerCase().includes(searchClasses[i])) {
                    return true;
                }
            }
        }

        if (current?.first()?.[0]?.name === "aside") {
            return true;
        }

        current = current.parent();
    }
    return false;
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

function fixYear($) {
    try {
        let postInfo = $('li:contains("سال های پخش")');
        if (postInfo.length === 0) {
            postInfo = $('span:contains("سال های پخش")');
        }
        if (postInfo.length === 0) {
            postInfo = $('li:contains("سال انتشار")');
        }
        if (postInfo.length === 0) {
            postInfo = $('span:contains("سال انتشار")');
        }
        if (postInfo.length === 0) {
            postInfo = $('section:contains("سال انتشار")');
        }
        if (postInfo.length === 0) {
            postInfo = $('li:contains("سال تولید")');
        }
        if (postInfo.length === 0) {
            postInfo = $('span:contains("سال تولید")');
        }
        if (postInfo.length === 1 || postInfo.length === 2) {
            const temp = $(postInfo[0]).text()
                .replace('سال های پخش', '')
                .replace('سال انتشار', '')
                .replace('سال تولید', '')
                .replace(":", "")
                .toLowerCase().trim();
            const yearArray = temp.split(/\s+|-/g)
                .filter(item => item && !isNaN(item.trim()))
                .sort((a, b) => Number(a) - Number(b));
            if (yearArray.length === 0) {
                return '';
            }
            return utils.validateYear(yearArray[0]);
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function fixWrongYear(title, type, year) {
    if (title === 'room 104' && type === 'serial') {
        return '2017'; // 2019 --> 2017
    } else if (title === 'the walking dead' && type === 'serial') {
        return '2010'; // 2019 --> 2010
    } else if (title === 'the blacklist' && type === 'serial') {
        return '2013'; // 2016 --> 2013
    } else if (title === 'i am the night' && type === 'serial') {
        return '2019'; // 2011 --> 2019
    } else if (title === 'living with yourself' && type === 'serial') {
        return '2019'; // 2010 --> 2019
    } else if (title === 'the l word generation q' && type === 'serial') {
        return '2019'; // 2021 --> 2019
    }
    return year;
}

function replaceShortTitleWithFullTitle(title, type) {
    return title;
}

function fixWrongSeasonNumber(seasonNumber, linkHref) {
    let seasonName = '';
    if (linkHref.includes('kenpuu.denki.berserk')) {
        seasonNumber = 0;
    } else if (linkHref.includes('berserk.2016')) {
        seasonNumber = 1;
    } else if (linkHref.includes('berserk.2017')) {
        seasonNumber = 2;
    } else if (linkHref.includes('tensura.nikki.tensei.shitara.slime.datta.ken')) {
        seasonNumber = 0;
    } else if (linkHref.includes('sword.art.online-alicization.war.of.underworld')) {
        seasonNumber = 2;
    } else if (linkHref.includes('kuroshitsuji.book.of.murder')) {
        seasonNumber = 0;
    } else if (linkHref.includes('minami-ke.okaeri')) {
        seasonNumber = 3;
    } else if (linkHref.includes('minami-ke.tadaima')) {
        seasonNumber = 4;
    } else if (linkHref.includes('grappler.baki')) {
        seasonName = ' (Grappler Baki)';
        seasonNumber = 0;
    } else if (linkHref.includes('fate.stay.night.ubw.s1')) {
        seasonName = ' (Unlimited Blade Works S1)';
        seasonNumber = 2;
    } else if (linkHref.includes('fate.stay.night.ubw.s2')) {
        seasonName = ' (Unlimited Blade Works S2)';
        seasonNumber = 3;
    } else if (linkHref.includes('code.geass.hangyaku.no.lelouch.r2')) {
        seasonNumber = 2;
    } else if (linkHref.includes('hachimitsu.to.clover.ii')) {
        seasonNumber = 2;
    } else if (seasonNumber === 1) {
        if (linkHref.includes('fairy.tail.zero')) {
            seasonNumber = 3;
        } else if (linkHref.includes('fairy.tail.final')) {
            seasonNumber = 4;
        }
    }
    return {seasonNumber, seasonName};
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

async function checkTrailers(trailers, sourceConfig) {
    // if (sourceConfig.vpnStatus.trailer === "noVpn") {
    //     // bypass check
    //     return trailers;
    // }

    let goodTrailers = [];
    for (let i = 0; i < trailers.length; i++) {
        let fileSize = await axiosUtils.getFileSize(trailers[i].url, {
            ignoreError: true,
            timeout: 20 * 1000,
            errorReturnValue: -1,
        });

        if (fileSize !== -1) {
            goodTrailers.push(trailers[i]);
        }
    }
    return goodTrailers;
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

function getRatings($) {
    let ratings = {
        imdb: 0,
        rottenTomatoes: 0,
        metacritic: 0,
        myAnimeList: 0
    }

    try {
        let $span = $('span');
        for (let i = 0; i < $span.length; i++) {
            let text = $($span[i]).text().toLowerCase();
            if (text && (
                text.includes('imdb') ||
                ($($span[i]).prev()).attr('href')?.startsWith('https://www.imdb.com/title/') ||
                (
                    $($span[i]).parent()?.[0]?.name === 'strong' &&
                    ($($span[i]).parent().parent().prev()).attr('href')?.startsWith('https://www.imdb.com/title/')
                )
            )) {
                let imdb = text.split("/")[0].match(/\d+(\.\d)?/g);
                if (imdb?.[0]) {
                    let number = Number(imdb[0]);
                    if (number > 0 && number < 10) {
                        ratings.imdb = number;
                        break;
                    }
                }
            }
        }

        if (ratings.imdb === 0) {
            let $a = $('a');
            for (let i = 0; i < $a.length; i++) {
                let href = $($a[i]).attr('href') || '';
                if (!href.includes('imdb.com/title/')) {
                    continue
                }

                let text = $($a[i]).text().toLowerCase();
                let imdb = text.split("/")[0].match(/\d+(\.\d)?/g);
                if (imdb?.[0]) {
                    let number = Number(imdb[0]);
                    if (number > 0 && number < 10) {
                        ratings.imdb = number;
                        break;
                    }
                } else {
                    let text = $($a[i]).parent().text().toLowerCase();
                    let imdb = text.split("/")[0].match(/\d+(\.\d)?/g);
                    if (imdb?.[0]) {
                        let number = Number(imdb[0]);
                        if (number > 0 && number < 10) {
                            ratings.imdb = number;
                            break;
                        }
                    }
                }
            }
        }

        if (ratings.imdb === 0) {
            let $div = $('div');
            for (let i = 0; i < $div.length; i++) {
                let text = $($div[i]).text().toLowerCase();
                let cls = $($div[i]).attr('class') || "";

                if (text && !hasSidebarClass($($div[i])) && (
                    text.includes('imdb') ||
                    (cls.includes('imdb') && cls.includes('rate')) ||
                    (cls.includes('imdb') && text.trim().match(/^(\d+\.?\d*)\sاز\s([\d,]+)\sرای$/))
                )) {
                    let imdb = text.split("/")[0].match(/\d+(\.\d)?/g);
                    if (imdb?.[0]) {
                        let number = Number(imdb[0]);
                        if (number > 0 && number < 10) {
                            ratings.imdb = number;
                            break;
                        }
                    }
                }
            }
        }

        if (ratings.imdb === 0) {
            let $img = $('img');
            for (let i = 0; i < $img.length; i++) {
                let alt = $($img[i]).attr('alt')?.toLowerCase() || '';
                if (alt && alt.includes('imdb') && alt.includes('امتیاز')) {
                    let text = $($($($img[i]).parent()[0]).next()).text();
                    let imdb = text.split("/")[0].match(/\d+(\.\d)?/g);
                    if (imdb?.[0]) {
                        let number = Number(imdb[0]);
                        if (number > 0 && number < 10) {
                            ratings.imdb = number;
                            break;
                        }
                    }
                }
            }
        }

        return ratings;
    } catch (error) {
        saveError(error);
        return ratings;
    }
}

function getWatchOnlineLinks($, type, pageLink, sourceConfig) {
    //TODO : implement
    try {
        let result = [];
        const $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            const infoNode = $($a[i]).parent().parent().parent().prev().children()[1];
            const infoText = $(infoNode).text();
            if (infoText && infoText.includes('پخش آنلاین')) {
                const linkHref = $($a[i]).attr('href');
                if (!linkHref.includes('/play/')) {
                    continue;
                }
                let info = purgeQualityText($($(infoNode).children()[0]).text()).replace(/\s+/g, '.');
                info = fixLinkInfo(info, linkHref, type);
                info = fixLinkInfoOrder(info);
                const sizeMatch = infoText.match(/(\d\d\d?\s*MB)|(\d\d?(\.\d\d?)?\s*GB)/gi);
                const size = sizeMatch ? purgeSizeText(sizeMatch.pop()) : '';
                info = size ? (info + ' - ' + size.replace(/\s+/, '')) : info;
                const watchOnlineLink = getWatchOnlineLinksModel($($a[i]).prev().attr('href'), info, type, sourceConfig.config.sourceName);
                watchOnlineLink.link = linkHref;
                result.push(watchOnlineLink);
            }
        }

        result = utils.removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getSubtitles($, type, pageLink, sourceConfig) {
    //TODO : implement
    try {
        let result = [];
        const $a = $('a');
        for (let i = 0, _length = $a.length; i < _length; i++) {
            const linkHref = $($a[i]).attr('href');
            if (linkHref && linkHref.match(subtitleFormatsRegex)) {
                const subtitle = getSubtitleModel(linkHref, '', type, sourceConfig.config.sourceName);
                result.push(subtitle);
            }
        }

        result = utils.removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getQualitySample($, link) {
    //TODO : implement
    try {
        const nextNode = $(link).next()[0];
        if (!nextNode || nextNode.name !== 'div') {
            return '';
        }
        const sampleUrl = nextNode.attribs['data-imgqu'];
        if (sampleUrl.endsWith('.jpg')) {
            return sampleUrl;
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

export function extra_link_checker($, link, title, type) {
    let href = $(link).attr('href') || "";
    return !type.includes('serial') &&
        href.includes('upera.tv') &&
        !href.includes('/embed/');
}

function extraSearchMatch($, link, title) {
    //TODO : implement
    try {
        const linkHref = utils.replacePersianNumbers(utils.getDecodedLink($(link).attr('href'))).toLowerCase();

        if (linkHref.includes('/sub/download/') ||
            linkHref.includes('/movie_cats/') ||
            linkHref.includes('/sound/') ||
            linkHref.includes('/audio/') ||
            linkHref.match(/mka|mkv|mp4|avi|mov|flv|wmv/) ||
            linkHref.match(/((\/sub)|(\.(mkv|zip))|([?#](v-c|comment)[=_-]\d+))$/)) {
            return false;
        }
        if (
            linkHref.match(/\/((\d\d\d+p(\s?bd)?)|(specials?))$/i) ||
            utils.replacePersianNumbers($(link).text()).match(/\d+\s*&\s*\d+/i)
        ) {
            return true;
        }

        title = title.replace(/\*/g, '\\*');
        return (
            !!linkHref.match(/\/s\d+\/(.*\/?((\d{3,4}p(\.x265)?)|(DVDRip))\/)?$/i) ||
            !!linkHref.match(new RegExp(`${title.replace(/\*/g, '\\*')}\\/\\d+p(\\.x265)?\\/`)) ||
            !!linkHref.match(new RegExp(`${title.replace(/\s+/g, '.') .replace(/\*/g, '\\*')}\\/\\d+p(\\.x265)?\\/`)) ||
            !!linkHref.match(new RegExp(`\\/serial\\/${title.replace(/\s+/g, '.').replace(/\*/g, '\\*')}\\/$`)) ||
            !!linkHref.match(/\/(duble|dubbed)\//i) ||
            !!linkHref.match(/\/(HardSub|SoftSub|dubbed|duble|(Zaban\.Asli))\/\d+-(\d+)?\/(\d\d\d\d?p(\.x265)?\/)?/i) ||
            !!linkHref.match(/\/(HardSub|SoftSub|dubbed|duble|(Zaban\.Asli))\/\d\d\d\d?p(\.x265)?\/?/i)
        );
    } catch (error) {
        saveError(error);
        return false;
    }
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

export function getFileData($, link, type, sourceLinkData, title, sourceConfig) {
    try {
        if ($(link).hasClass("wp-embedded-video")) {
            return "ignore";
        }

        const linkHref = utils.getDecodedLink($(link).attr('href')).toLowerCase();

        let quality = '';

        // let quality = getQualityFromLinkHref(linkHref, title);
        // quality = removeEpisodeNameFromQuality(quality);
        // quality = purgeQualityText(quality)
        //     .replace(/[\[\]]/g, '.')
        //     .replace(/\.(nf|ss)(?=\.)/g, '')
        //     .replace(/\.(NightMovie|AvaMovie|Sas?ber(Fun)?|ValaMovi?e|DayMovie|Bia2M(ovies)?|MrMovie|(filmb(\.in)?)|MovieBaz[.\s]?tv|Amazon|net|BWBP+|2CH)(_\d)?/gi, '')
        //     .replace(/(^|\.)(iT00NZ|BluZilla|BluDragon|264|AAC2|v2|2hd|MA|60FPS|8bit|not|(Erai\.raws)|MULVAcoded|RubixFa|0SEC|XOR|Zarfilm|proper|XviD|30nama)/gi, '')
        //     .replace(/(^|\.)((s\d+e\d+)|(episode\.\d+))/i, '')
        //     .replace('REAL.', '')
        //     .replace('DD%202.0.H.264monkee', 'monkee')
        //     .replace('[AioFilm.com]', '')
        //     .replace('.Anime.20Dubbing', '')
        //     .replace(/Galaxy\.Tv/i, 'GalaxyTv');

        const Censored = sourceConfig?.config?.is_censored || linkHref.match(/(?<!(the[._-]))family(?!([._-]\d+))/) ? 'Censored' : '';

        const roundMatch = linkHref.match(/\.Round\d\d?\./i);
        const round = roundMatch?.pop().replace(/\./g, '').replace(/\d\d?/, (res) => '_' + res) || '';

        let info = [quality, round, Censored].filter(Boolean).join('.');
        info = fixSpecialCases(info);
        info = fixLinkInfo(info, linkHref, type);
        info = fixLinkInfoOrder(info);

        return info;
    } catch (error) {
        saveError(error);
        return "";
    }
}

function fixSpecialCases(info) {
    return info.replace(/.+\.\d\d\d\d?p/, (res) => res.split('.').reverse().join('.'));
}

function getQualityFromLinkHref(linkHref, title) {
    //TODO : implement

    const splitLinkHref = linkHref
        .replace(/\s+/g, '.')
        .replace(/(\.-\.)/, '.')
        .replace(/\.+/g, '.')
        .replace(/,/g, '')
        .split('.');
    splitLinkHref.pop();

    let seasonEpisodeIndex = splitLinkHref.findIndex((value => value.match(/(?<!\/)s\d+[._-]?(e\d+)?/gi) || value.match(/Ep?\d+/i)));
    if (seasonEpisodeIndex === -1) {
        let numbers = splitLinkHref.filter(item => !isNaN(item));
        if (numbers.length === 1) {
            seasonEpisodeIndex = splitLinkHref.indexOf(numbers[0]);
        }
    }

    if (seasonEpisodeIndex === splitLinkHref.length - 1) {
        seasonEpisodeIndex--;
    }

    return splitLinkHref.slice(seasonEpisodeIndex + 1).join('.')
        .replace(/\d\d\d\d?\.p/, res => res.replace('.p', 'p.'))
        .replace(/^E?\d+\./i, '')
        .replace(/(^|\.)(SoftSub|HardSub)\d*/gi, '')
        .replace(/(^|\.)Not\.Sub(bed)?/i, '')
        .replace(/\?dubbed\d+/i, '')
        .replace(/\.dubbed\.fa(rsi)?/i, '')
        .replace('.netDUBLE', '.DUBLE')
        .replace(/\.(DUBEL?|DIBLE)/i, '.DUBLE')
        .replace('20x264', '')
        .replace(/\.Senario(?=(\.|$))/i, '')
        .replace(/\d\d\d\d?p(?!(\.|\s|$))/i, res => res.replace('p', 'p.'))
        .replace(/(^|\.)s\d+e\d+/i, '')
        .replace(new RegExp('^' + title.replace(/\s+/g, '.').replace(/\*/g, '\\*'), 'i'), '')
        .replace(new RegExp('[.\\/]' + title.replace(/\s+/g, '.').replace(/\*/g, '\\*'), 'i'), '')
        .replace(/\d\d\d\d?p_?\d/, res => res.replace(/_?\d$/, ''))
        .replace(/\.x?264-/i, '.x264.')
        .replace(/(^|\.)10bit/i, '')
        .replace(/\.HQ(?=(\.|$))/i, '')
        .replace(/\.Ohys[.\-]Raws/i, '')
        .replace('.NEW', '')
        .replace(/AC3\.6CH/i, '6CH')
        .replace(/\.5\.1ch/i, '')
        .replace(/ITALIAN|i_c|pcok|(O\.Ye\.of\.Little\.Faith\.Father\.NF\.)/i, '')
        .replace(/\.(STAN|Keyword|TagName|((ctu|real|proper|in|GMEB)(?=(\.|$))))/gi, '')
        .replace('AHDTV', 'HDTV')
        .replace(/\.[876]ch/i, res => res.toUpperCase())
        .replace(/\.Zaban\.Asli/i, '')
        .replace('.(Kor)', '')
        .replace(/(^|\.)((Fifteen\.Minutes\.of\.Shame)|(The\.Gift)|(Beyond\.the\.Aquila\.Rift))/i, '')
        .replace(/\.?\(Film2serial\.ir\)/i, '')
        .replace(/[_\-]/g, '.').replace(/\.+/g, '.').replace(/^\./, '');
}

function removeEpisodeNameFromQuality(quality) {
    const specialWordsRegex = new RegExp(`(\\d\\d\\d\\d?p)|(${releaseRegex.source})|(${encodersRegex.source})|(${specialWords.source})`);

    quality = quality.replace(/(^|\.)(silence|Joyeux|problème|loki)/gi, '');
    const tempQuality = quality.replace(/(^|\.)((DVDRip)|(Special))/gi, '');
    if (tempQuality && !tempQuality.match(specialWordsRegex)) {
        const splitTempQuality = tempQuality.split('.');
        for (let i = 0; i < splitTempQuality.length; i++) {
            quality = quality.replace(splitTempQuality[i], '');
        }
        quality = quality.replace(/\.+/g, '.').replace(/(^\.)|(\.$)/g, '');
    } else {
        const tempQuality2 = quality.split(/\.\d\d\d\d?p/)[0].replace(/(^|\.)((DVDRip)|(Special))/gi, '');
        if (tempQuality2 && !tempQuality2.match(specialWordsRegex)) {
            let splitTempQuality = tempQuality2.split('.');
            if (splitTempQuality.length > 0) {
                for (let i = 0; i < splitTempQuality.length; i++) {
                    quality = quality.replace(splitTempQuality[i], '');
                }
                quality = quality.replace(/\.+/g, '.').replace(/(^\.)|(\.$)/g, '');
            }
        }
    }
    return quality;
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

function addTitleNameToInfo(downloadLinks, title, year) {
    const names = [];
    for (let i = 0, downloadLinksLength = downloadLinks.length; i < downloadLinksLength; i++) {
        const fileName = utils.getDecodedLink(downloadLinks[i].link.split('/').pop()).split(/a\.?k\.?a/i)[0];
        const nameMatch = fileName.match(/.+\d\d\d\d?p/gi) || fileName.match(/.+(hdtv)/gi);
        const name = nameMatch ? nameMatch.pop()
            .replace(/\d\d\d\d?p|[()]|hdtv|BluRay|WEB-DL|WEBRip|BR-?rip|(hq|lq)?DvdRip|%21|!|UNRATED|Uncut|EXTENDED|REPACK|Imax|Direct[ou]rs?[.\s]?Cut/gi, '')
            .replace(/\.|_|\+|%20| |(\[.+])|\[|\s\s+/g, ' ')
            .replace(/\.|_|\+|%20| |(\[.+])|\[|\s\s+/g, ' ')
            .trim() : '';
        title = title.replace(/s/g, '');
        const temp = name.toLowerCase().replace(/-/g, ' ').replace(/s/g, '');
        if (!name || temp === (title + ' ' + year) || temp === (title + ' ' + (Number(year) - 1))) {
            continue;
        }
        names.push(name.toLowerCase());
        const splitInfo = downloadLinks[i].info.split(' - ');
        if (splitInfo.length === 1) {
            downloadLinks[i].info += '. (' + name + ')';
        } else {
            downloadLinks[i].info = splitInfo[0] + '. (' + name + ')' + ' - ' + splitInfo[1];
        }
    }
    try {
        if (names.length > 0 && names.every(item => item === names[0])) {
            const name = new RegExp(`\\. \\(${names[0].replace(/\*/g, '\\*')}\\)`, 'i');
            for (let i = 0, downloadLinksLength = downloadLinks.length; i < downloadLinksLength; i++) {
                downloadLinks[i].info = downloadLinks[i].info.replace(name, '');
            }
        }
    } catch (error) {

    }
    return downloadLinks;
}

//----------------------------------------------------------------------
//----------------------------------------------------------------------

function handleLinksExtraStuff(type, downloadLinks, sourceConfig) {
    downloadLinks = utils.removeDuplicateLinks(downloadLinks, sourceConfig.config.replaceInfoOnDuplicate);
    const qualitySampleLinks = downloadLinks.map(item => item.qualitySample).filter(item => item);
    downloadLinks = downloadLinks.filter(item => !qualitySampleLinks.includes(item.link));

    if (type.includes('anime')) {
        downloadLinks = fixWrongSeasonNumberIncrement(downloadLinks);
        downloadLinks = fixSeasonSeparation(downloadLinks);
        downloadLinks = utils.sortLinks(downloadLinks);
        downloadLinks = fixSpecialEpisodeSeason(downloadLinks);
    }

    if (downloadLinks.every(item => item.season === 1 && item.episode === 0 && (item.link.match(/part\d+/i) || item.info.match(/part_\d+/i)))) {
        return downloadLinks.map(item => {
            const partNumber = item.link.match(/(?<=(part))\d+/i) || item.info.match(/(?<=(part_))\d+/i);
            const episodeMatch = Number(partNumber[0]);
            return {...item, episode: episodeMatch};
        });
    }

    return downloadLinks;
}

function fixWrongSeasonNumberIncrement(downloadLinks) {
    let lastEpisodeFromPrevSeason = 0;
    for (let i = 0, _length = downloadLinks.length; i < _length; i++) {
        if (downloadLinks[i].season === 1) {
            if (downloadLinks[i].episode > lastEpisodeFromPrevSeason) {
                lastEpisodeFromPrevSeason = downloadLinks[i].episode;
            }
        }
    }
    if (lastEpisodeFromPrevSeason > 0) {
        let firstEpisodeOfSeason = -1;
        for (let i = 0, _length = downloadLinks.length; i < _length; i++) {
            if (downloadLinks[i].season === 2) {
                if (firstEpisodeOfSeason === -1) {
                    firstEpisodeOfSeason = downloadLinks[i].episode;
                }
                if (downloadLinks[i].episode < firstEpisodeOfSeason) {
                    firstEpisodeOfSeason = downloadLinks[i].episode;
                }
            }
        }

        for (let i = 0, _length = downloadLinks.length; i < _length; i++) {
            if (!downloadLinks[i].info.toLowerCase().includes('.part') && downloadLinks[i].season === 2) {
                if (firstEpisodeOfSeason === lastEpisodeFromPrevSeason + 1) {
                    downloadLinks[i].season = downloadLinks[i].season - 1;
                }
            }
        }
    }

    return downloadLinks;
}

function fixSeasonSeparation(downloadLinks) {
    const saveResult = [];
    for (let i = 0, _length = downloadLinks.length; i < _length; i++) {
        const partMatch = downloadLinks[i].info.match(/\.Part_\d/gi);
        if (partMatch) {
            const partNumber = Number(partMatch[0].replace(/Part|\.|_/gi, ''));
            if (partNumber === 1) {
                continue;
            }
            const seasonNumber = downloadLinks[i].season;

            const cache = saveResult.find(item => item.seasonNumber === downloadLinks[i].season && item.partNumber === partNumber);
            if (cache) {
                downloadLinks[i].episode += cache.plusEpisode;
                continue;
            }

            let lastEpisodeFromPrevPart = 0;

            for (let j = 0, _length2 = downloadLinks.length; j < _length2; j++) {
                if (
                    (partNumber === 2 &&
                        (downloadLinks[j].info.toLowerCase().includes('.part_1') || !downloadLinks[j].info.toLowerCase().includes('.part'))) ||
                    (partNumber > 2 && downloadLinks[j].info.toLowerCase().includes('.part_' + (partNumber - 1)))
                ) {
                    if (downloadLinks[j].season === seasonNumber && downloadLinks[j].episode > lastEpisodeFromPrevPart) {
                        lastEpisodeFromPrevPart = downloadLinks[j].episode;
                    }
                }
            }

            if (lastEpisodeFromPrevPart > 0) {
                saveResult.push({
                    seasonNumber: seasonNumber,
                    partNumber: partNumber,
                    plusEpisode: lastEpisodeFromPrevPart,
                });
                downloadLinks[i].episode += lastEpisodeFromPrevPart;
            }
        }
    }
    return downloadLinks;
}

function fixSpecialEpisodeSeason(downloadLinks) {
    for (let i = 0, _length = downloadLinks.length; i < _length; i++) {
        if (downloadLinks[i].info.toLowerCase().includes('special') && downloadLinks[i].season === 0) {
            downloadLinks[i].season = 1;
            if (downloadLinks[i].episode <= 1) {
                let season1LastEpisode = downloadLinks.reduce((episodeNumber, item) => {
                    if (item.season === 1) {
                        episodeNumber = Math.max(episodeNumber, item.episode);
                    }
                    return episodeNumber;
                }, 0);
                downloadLinks[i].episode += season1LastEpisode;
            }
        }
    }
    return downloadLinks;
}
