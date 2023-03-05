import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    validateYear,
    replacePersianNumbers,
    getType,
    checkHardSub,
    checkDubbed,
    getDecodedLink,
    removeDuplicateLinks
} from "../utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {fixLinkInfo, fixLinkInfoOrder, linkInfoRegex, purgeQualityText} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {getWatchOnlineLinksModel} from "../../models/watchOnlineLinks.js";
import {getSubtitleModel} from "../../models/subtitle.js";
import {subtitleFormatsRegex} from "../subtitle.js";
import {saveError} from "../../error/saveError.js";

const sourceName = "film2movie";
const needHeadlessBrowser = true;
const sourceAuthStatus = 'ok';
export const sourceVpnStatus = Object.freeze({
    poster: 'allOk',
    trailer: 'allOk',
    downloadLink: 'allOk',
});
let prevTitles = [];

export default async function film2movie({movie_url, page_count}) {
    prevTitles = [];
    let p1 = await wrapper_module(sourceName, needHeadlessBrowser, sourceAuthStatus, movie_url, page_count, search_title);
    return [p1];
}

async function search_title(link, i) {
    try {
        let rel = link.attr('rel');
        if (rel && rel === 'bookmark') {
            let title = link.text().toLowerCase();
            let year;
            let type = getType(title);
            let pageLink = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`film2movie/${type}/${i}/${title}  ========>  `);
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
                let pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus, title, pageLink, type, getFileData);
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
                        pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus, title, pageLink, type, getFileData);
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
                    downloadLinks = removeDuplicateLinks(downloadLinks);
                    downloadLinks = fixSeasonNumber(downloadLinks);

                    let sourceData = {
                        sourceName,
                        sourceVpnStatus,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: summaryExtractor.getPersianSummary($2, title, year),
                        poster: posterExtractor.getPoster($2, sourceName),
                        trailers: trailerExtractor.getTrailers($2, sourceName, sourceVpnStatus),
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

function fixYear($) {
    try {
        let postInfo = $('.postinfo');
        if (postInfo) {
            let temp = $($(postInfo).children()[1]).text().toLowerCase();
            let yearArray = temp.split(',').filter(item => item && !isNaN(item.trim()));
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
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let infoNode = type.includes('serial')
                ? $($a[i]).parent()
                : $($a[i]).parent().parent().prev();
            let infoText = $(infoNode).text();
            if (infoText && infoText.includes('پخش آنلاین')) {
                let linkHref = $($a[i]).attr('href');
                if (linkHref.includes('.upera.')) {
                    let info = getFileData($, $a[i], type);
                    let watchOnlineLink = getWatchOnlineLinksModel(linkHref, info, type, sourceName, pageLink);
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
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let linkHref = $($a[i]).attr('href');
            if (linkHref && linkHref.match(subtitleFormatsRegex)) {
                let subtitle = getSubtitleModel(linkHref, '', type, sourceName, pageLink);
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

function getFileData($, link, type) {
    //'1080p.HardSub'  //'720p.BluRay.F2M.dubbed.Censored'
    //'480p.BluRay.F2M.HardSub.Censored'  //'720p.BluRay.F2M.Censored'
    try {
        return type.includes('serial')
            ? getFileData_serial($, link)
            : getFileData_movie($, link);
    } catch (error) {
        saveError(error);
        return "";
    }
}

function getFileData_serial($, link) {
    let text = $(link).parent().text().replace(/[:_|]/g, '');
    text = replacePersianNumbers(text);
    let linkHref = $(link).attr('href');
    let HardSub = (checkHardSub(text) || checkHardSub(linkHref)) ? 'HardSub' : '';
    let dubbed = checkDubbed(text, linkHref) ? 'dubbed' : '';
    let Censored = (text.toLowerCase().includes('family') || dubbed || HardSub) ? 'Censored' : '';
    let quality = purgeQualityText(text).replace(/\s/g, '.').replace('.Family', '');
    let roundMatch = linkHref.match(/\.Round\d\d?\./i);
    let round = roundMatch ? roundMatch.pop().replace(/\./g, '').replace(/\d\d?/, (res) => '_' + res) : '';
    let info = [quality, round, HardSub, dubbed, Censored].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    info = fixSpecialCases(info);
    info = info
        .replace(/FULL-HD\.Round_\d\d?/, (res) => res.split('.').reverse().join('.'))
        .replace(/(\d\d?\.)?\d\d?\.Day/, (res) => res.split('.').reverse().join('.').replace(/\./g, '_'))
        .replace(/((Day_\d\d?(_\d\d?)?)|(Preview)|(ReWatch))\.Round_\d\d?/, (res) => res.split('.').reverse().join('.'));
    return info;
}

function getFileData_movie($, link) {
    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let textNode = $(parent).prev();
    let text = textNode.text();
    while (
        text.includes('بخش اول') ||
        text.includes('بخش دوم') ||
        text.includes('قسمت اول') ||
        text.includes('قسمت دوم') ||
        text.includes('دانلود صوت دوبله فارسی') ||
        text.match(/^[-=]+$/)
        ) {
        textNode = textNode.prev();
        text = textNode.text();
    }
    text = replacePersianNumbers(text);
    let linkHref = $(link).attr('href');
    let HardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let Censored = ($(link).next().text().toLowerCase().includes('family') || dubbed || HardSub) ? 'Censored' : '';
    let quality = purgeQualityText(text.replace(/[()]/g, ' ')).replace(/\s/g, '.');
    let moviePartMatch = linkHref.match(/part[\s.]*\d/i);
    let moviePart = moviePartMatch ? moviePartMatch.pop().replace(/part/i, 'Part') : '';
    let info = [quality, moviePart, HardSub, dubbed, Censored].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    info = fixSpecialCases(info);
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

function fixSeasonNumber(downloadLinks) {
    for (let i = 0; i < downloadLinks.length; i++) {
        if (downloadLinks[i].info.includes('OVA') && downloadLinks[i].season === 1) {
            downloadLinks[i].season = 0;
        }
    }
    return downloadLinks;
}

function printLinksWithBadInfo(downloadLinks, type) {
    const film2movieLinkRegex = new RegExp([
        /(?<!(\.OVA))[-.](((S\d\d(\.)?)|(E\d\d-))?E\d\d([-E]+\d\d)?)/,
        /([-_.]\d\d\d\d?pl?)?/,
        /(\.x265(\.10bit)?)?/,
        /(\.Farsi\.Dubbed)?/,
        /([.-]Film2Movie_(Asia|li|US|INFO|ORG))?/,
        /\.(mkv|mp4|avi|wmv)$/,
    ].map(item => item.source).join(''), 'gi');

    const film2movieLinkInfoRegex = new RegExp([
        /^\d\d\d\d?p/,
        /(\.(2K|4K|FULL-HD))?/,
        /(\.V\d)?/,
        /(\.x265(\.10bit)?)?/,
        /(\.3D)?/,
        /(\.\d\d\d\d\.\d\d\.\d\d)?/,
        /(\.Episode\(\d\d?\d?-\d\d?\d?\))?/,
        /(\.(Special|OVA|NCED|NCOP)(_\d)?)?/,
        /(\.Censored)?/,
        /(\.(HardSub(\.dubbed)?|dubbed))?$/,
    ].map(item => item.source).join(''), 'g');

    const countries = [
        'St-Louis', 'Anaheim', 'Oakland', 'Glendale',
        'San-Diego', 'Tampa', 'Arlington', 'Atlanta',
        'Daytona', 'Valenciana', 'Europa', 'Teruel',
        'Aragon', 'Lenovo-San-Marino', 'Czech-Republic',
        'Jerez', 'Abu-Dhabi', 'Sakhir', 'Turkish',
        'Eifel', 'Russian', 'Tuscan', 'Andalucia', 'Belgium',
        'Grand-Prix', 'British', 'Hungarian', 'Styria',
        'Austrian', 'Azerbaijan', 'Emilia-Romagna', 'Monaco',
        'Spanish', 'Bahrain', 'Germany', 'Catalunya',
        'Italy', 'France', 'Portugal', 'Doha', 'Gatar'
    ];

    const countryRegex = new RegExp([
        /^\d\d\d\d?p/,
        /(\.\d)?/,
        new RegExp(`\\.(${countries.join('|')})`, 'i'),
        /(\.FULL-HD)?$/,
    ].map(item => item.source).join(''), 'i');

    const badLinks = downloadLinks.filter(item => !item.info.match(linkInfoRegex) &&
        (
            (
                type.includes('movie') &&
                !item.info.match(film2movieLinkInfoRegex) &&
                !item.info.match(/^\d\d\d\d?p\.\d\d\d\d\.\d\d\.\d\d$/) &&
                !item.info.match(countryRegex) &&
                !item.info.match(/^\d\d\d\d?p\.x265\.Censored\.dubbed$/) &&
                !item.info.match(/^\d\d\d\d?p(\.Round_\d\d?)?\.((Day_\d\d?(_\d\d?)?)|(Preview)|(ReWatch))(\.FULL-HD)?$/)
            ) || (
                type.includes('serial') &&
                !item.info.match(film2movieLinkInfoRegex) &&
                !getDecodedLink(item.link).replace(/\s/g, '.').match(film2movieLinkRegex)
            )
        )
    )

    const badSeasonEpisode = downloadLinks.filter(item => item.season > 46 || item.episode > 400);

    console.log([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}
