import config from "../../config";
import {search_in_title_page, wrapper_module} from "../searchTools";
import {
    getTitleAndYear,
    validateYear,
    getType,
    purgeQualityText,
    purgeSizeText,
    purgeEncoderText,
    fixLinkInfo
} from "../utils";
import save from "../save_changes_db";
import * as persianRex from "persian-rex";
import {saveError} from "../../error/saveError";

const sourceName = "salamdl";
const needHeadlessBrowser = false;

export default async function salamdl({movie_url, page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, movie_url, page_count, search_title);
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
                console.log(`salamdl/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2);
                    }
                    if (type.includes('serial') && downloadLinks.length > 0 && downloadLinks[0].info === '') {
                        type = type.replace('serial', 'movie');
                        pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies} = pageSearchResult);
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && downloadLinks[0].link.match(/s\d+e\d+/gi)) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies} = pageSearchResult);
                    }

                    let sourceData = {
                        sourceName,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: getPersianSummary($2),
                        poster: getPoster($2),
                        trailers: getTrailers($2),
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

function fixYear($) {
    try {
        let postInfo = $('p:contains("تاریخ انتشار")');
        if (postInfo.length === 1) {
            let yearMatch = $(postInfo).text().match(/\d\d\d\d/g);
            if (!yearMatch) {
                return '';
            }
            yearMatch = yearMatch.sort((a, b) => Number(a) - Number(b));
            return validateYear(yearMatch[0]);
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getPersianSummary($) {
    try {
        let paragraphs = $('p');
        for (let i = 0; i < paragraphs.length; i++) {
            let temp = $(paragraphs[i]).text();
            if (temp && temp.includes('خلاصه داستان'))
                return temp.replace('خلاصه داستان :', '').trim();
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getPoster($) {
    try {
        let badPoster = 'https://image.salamdl.shop/t/p/w440_and_h660_bestv2/';
        let $img = $('img');
        for (let i = 0; i < $img.length; i++) {
            let src = $img[i].attribs.src;
            let parent = $img[i].parent.name;
            if (parent === 'a') {
                return src.includes(badPoster) ? '' : src;
            }
        }
        for (let i = 0; i < $img.length; i++) {
            let src = $img[i].attribs.src;
            let parent = $img[i].parent.name;
            if (parent === 'p') {
                return src;
            }
        }
        for (let i = 0; i < $img.length; i++) {
            let src = $img[i].attribs.src;
            let parent = $img[i].parent.name;
            if (parent === 'div') {
                return src;
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getTrailers($) {
    try {
        let result = [];
        let a = $('a');
        for (let i = 0; i < a.length; i++) {
            let href = $(a[i]).attr('href');
            if (href && href.toLowerCase().includes('trailer')) {
                if (href.includes('.mp4') || href.includes('.mkv')) {
                    let quality = href.includes('360p') ? '360p' : '720p';
                    result.push({
                        url: href,
                        info: 'salamdl-' + quality
                    });
                }
            }
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getFileData($, link, type) {
    //'720p.x265.WEB-DL - 200MB'    //'480p.WEB-DL - 150MB'
    //'720p.WEB-DL.YTS - 848.85MB'  //'1080p.x265.10bit.WEB-DL.PSA - 1.98GB'
    let text_array = [];
    try {
        if (type === 'serial') {
            return getFileData_serial($, link);
        }

        let text = $(link).text();
        let linkHref = $(link).attr('href');
        let dubbed = '';
        if (text.includes('(دوبله فارسی)') ||
            text.includes('(دو زبانه)') ||
            linkHref.toLowerCase().includes('farsi')) {
            dubbed = 'dubbed';
            text = text.replace('(دوبله فارسی)', '').replace('(دو زبانه)', '');
        }
        text_array = text.split('|');

        if (text.includes('لینک مستقیم')) {
            return getFileData_extraLink($, link);
        }
        return getFileData_movie(text_array, dubbed, linkHref);
    } catch (error) {
        try {
            return checkTrailer_year($, link, text_array);
        } catch (error2) {
            saveError(error2);
            return "";
        }
    }
}

function getFileData_serial($, link) {
    let linkHref = $(link).attr('href');
    let prevNodeChildren = $(link).parent().parent().parent().prev().children();
    let text_array = purgeQualityText($(prevNodeChildren[3]).text()).split(' ');
    let bit10 = linkHref.toLowerCase().includes('10bit') ? '10bit' : '';
    let size = purgeSizeText($(prevNodeChildren[5]).text());
    let filtered_text_array = text_array.filter(value => value && !persianRex.hasLetter.test(value));
    if (filtered_text_array.length === 0) {
        return getSerialFileInfoFromLink(linkHref);
    }
    if (text_array.length === 1 && text_array[0] === '') {
        text_array = $(link).parent().prev().text().replace('Web-DL', 'WEB-DL').split(' ');
        if ($(link).parent().text().includes('|') ||
            (text_array.length === 1 && text_array[0] === '')) {
            let text = $(link).text();
            size = '';
            if (text.includes('دانلود قسمت')) {
                text_array = ['480p'];
            } else {
                text_array = ['720p'];
            }
        }
    }

    let info = text_array[0].match(/\d\d\d\d?p/gi)
        ? [...text_array, bit10].filter(value => value).join('.')
        : [text_array[1], ...text_array.slice(2), bit10, text_array[0]].filter(value => value).join('.');

    info = fixLinkInfo(info, linkHref);

    info = info
        .replace(/^720\./g, '720p.')
        .replace(/^\d\d\d\d?\./g, (res) => res.replace('.', 'p.'))
        .replace(/\.265\./, '.x265.')
        .replace('WEB-DL1080p', '1080p.WEB-DL')
        .replace('WEB-DL.x265', 'x265.WEB-DL')
        .replace('BluRay.x265', 'x265.BluRay')
        .replace('HDTV.x265', 'x265.HDTV')
        .replace('WEB-DL.10bit', '10bit.WEB-DL')
        .replace('x265.WEB-DL.PSA.10bit', 'x265.10bit.WEB-DL.PSA')
        .replace('2160p.x265.10bit.WEB-DL.4K', '2160p.4K.x265.10bit.WEB-DL')
        .replace('WEB-DL.2160p.x265.10bit.4K', '2160p.4K.x265.10bit.WEB-DL')
        .replace('2160p.x265.WEB-DL.4K', '2160p.4K.x265.WEB-DL')
        .replace('WEB-DL.2160p.4K.x265', '2160p.4K.x265.WEB-DL')
        .replace('2160p.x265.10bit.4K', '2160p.4K.x265.10bit')
        .replace('HDTV.WEB-DL', 'WEB-DL')
    return [info, size].filter(value => value).join(' - ');
}

function getSerialFileInfoFromLink(linkHref) {
    let link_href = linkHref.toLowerCase().replace(/[/_\s]/g, '.').replace('.-.', '.');
    let link_href_array = link_href.split('.');
    let seasonEpisode_match = link_href.match(/s\d+e\d+(-?e\d+)?/g);
    if (seasonEpisode_match) {
        let seasonEpisode = seasonEpisode_match.pop();
        let index = link_href_array.indexOf(seasonEpisode);
        let array = link_href_array.slice(index + 1);
        array.pop();
        let info = purgeQualityText(array.join('.'));
        info = info
            .replace('repack.', '')
            .replace(/\.(nf|2ch)\./g, '.')
            .replace('.x264', '')
            .replace('WEB-DL.x265', 'x265.WEB-DL')
            .replace('10bit.x265', 'x265.10bit')
            .replace('.farsi', '')
            .replace('dubbed.x265.hevc', 'x265.hevc.dubbed')
            .replace('bluray.x265.10bit', 'x265.10bit.bluray')
            .replace('bluray', 'BluRay')
            .replace('brrip', 'BrRip')
            .replace('amzn.WEB-DL', 'WEB-DL')
            .replace('10bit.WEB-DL.6ch.x265', 'x265.10bit.WEB-DL.6ch')
            .replace('10bit.BluRay.x265', 'x265.10bit.BluRay')
            .replace('WEB-RIP.x265', 'x265.WEB-RIP')
            .replace(/BluRay\.\d\d\d\d?p/gi, (res) => res.split('.').reverse().join('.'))
            .replace('.tehmovies.com', '');

        if (!info.match(/^\d\d\d\d?p/)) {
            let splitInfo = info.split('.');
            let resIndex = splitInfo.findIndex(item => item.match(/\d\d\d\d?p/));
            if (resIndex === -1) {
                resIndex = splitInfo.findIndex(item => item.match(/WEB-DL/));
            }
            info = resIndex !== -1 ? splitInfo.slice(resIndex).join('.') : '';
            info = fixLinkInfo(info, link_href);
        }
        return info;
    } else {
        return '';
    }
}

function getFileData_movie(text_array, dubbed, linkHref) {
    if (text_array[0].includes('تریلر') || text_array[0].includes('تیزر')) {
        return 'trailer';
    }

    let encoder = '';
    let encoder_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('انکدر') || text_array[1].includes('انکودر')) ? 1 : '';
    if (encoder_index) {
        encoder = purgeEncoderText(text_array[encoder_index])
            .split(' ')
            .filter(value =>
                value && !persianRex.hasLetter.test(value) &&
                isNaN(value) && value !== 'GB' && value !== 'MB')
            .join('')
            .replace(/[\s:]/g, '');
    } else {
        let temp = text_array[0].match(/MkvCage|ShAaNiG|Ganool|YIFY|nItRo/);
        if (temp) {
            encoder = temp[0];
            text_array[0] = text_array[0].replace(temp[0] + ' - ', '');
        }
    }

    let size_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('حجم')) ? 1 :
            (text_array[2]) ? 2 : '';
    let size = size_index ? purgeSizeText(text_array[size_index]).replace('MKVCAGEMB', '') : '';

    let quality = purgeQualityText(text_array[0]);
    if (quality.includes('دانلود نسخه سه بعد')) {
        let info = ['3D', dubbed].filter(value => value).join('.')
        return [info, size].filter(value => value).join(' - ');
    }
    quality = quality.split(' ').filter(value => value && !persianRex.hasLetter.test(value));
    if (quality.length === 1 && quality[0] === '--') {
        let resolution = linkHref.match(/[_.]\d\d\d\dp[_.]/gi);
        if (resolution) {
            quality[0] = resolution.pop().replace(/[_.]/g, '');
        } else {
            quality[0] = 'unknown';
        }
    }

    if (!quality.join('.').match(/\d\d\d\d?p/gi)) {
        let resolution = linkHref.match(/[_.]\d\d\d\d?p[_.]/gi);
        if (resolution) {
            quality.unshift(resolution.pop().replace(/[_.]/g, ''));
        }
    }

    let info = (quality[0].match(/\d\d\d+p/g)) ?
        [quality[0], ...quality.slice(2), quality[1], encoder, dubbed].filter(value => value).join('.') :
        [quality[1], ...quality.slice(2), quality[0], encoder, dubbed].filter(value => value).join('.');

    info = fixLinkInfo(info, linkHref);

    info = info
        .replace('4K.Ultra.HD.2160p.x265', '2160p.4K.x265')
        .replace('Ultra.HD.2160p.4K', '2160p.4K')
        .replace('2160p.x265.4K', '2160p.4K.x265')
        .replace('3D.HSBS.1080p', '1080p.3D.HSBS')
        .replace('dubbed.bluray', 'BluRay.dubbed')
        .replace('3D.HSBS.x265', 'x265.3D.HSBS')
        .replace('10bit.x265', 'x265.10bit')
        .replace('HD-TV', 'HDTV')
        .replace('DVD-Rip', 'DVDRip')
        .replace('WEBRip', 'WEB-RIP')
        .replace('Web-DL', 'WEB-DL')
        .replace('dubbed.Bluray', 'Bluray.dubbed')
        .replace('dubbed.WEB-DL', 'WEB-DL.dubbed')
        .replace(/REMUX\.\d\d\d\d?p/gi, (res) => res.split('.').reverse().join('.'))
        .replace(/(MkvCage|ShAaNiG|Ganool|YIFY|nItRo)\.(Bluray|WEB-DL)/gi, (res) => res.split('.').reverse().join('.'));

    return [info, size].filter(value => value).join(' - ');
}

function getFileData_extraLink($, link) {
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let quality_match = link_href.match(/\d\d\d+p/g);
    if (quality_match) {
        let quality = quality_match.pop();
        let quality_index = link_href_array.indexOf(quality);
        let text_array = link_href_array.slice(quality_index, quality_index + 4);
        if (text_array[2] === 'x265') {
            text_array = [text_array[0], text_array[2], text_array[1], text_array[3]]
        }
        return purgeQualityText(text_array.join('.'));
    } else {
        let year_match = link_href.match(/\d\d\d\d/g);
        if (year_match) {
            let year = year_match.pop();
            let year_index = link_href_array.indexOf(year);
            let info = link_href_array[year_index + 1];
            info = fixLinkInfo(info, link_href);
            return info;
        } else {
            return '';
        }
    }
}

function checkTrailer_year($, link, text_array) {
    if (text_array[0].includes('دانلود تریلر') || text_array[0].includes('دانلود تیزر')) {
        return 'trailer';
    }
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let year_match = link_href.match(/\d\d\d\d/g);
    if (year_match) {
        let year = year_match.pop();
        let year_index = link_href_array.indexOf(year);
        let result = link_href_array.slice(year_index + 1);
        result.pop();
        let info = purgeQualityText(result.join('.'));
        info = fixLinkInfo(info, link_href);
        info = info.replace('.Farsi', '');
        return info;
    } else {
        return '';
    }
}
