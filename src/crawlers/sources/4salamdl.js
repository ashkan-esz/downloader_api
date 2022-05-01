import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {getTitleAndYear, validateYear, getType, removeDuplicateLinks} from "../utils.js";
import {
    purgeEncoderText,
    purgeSizeText,
    fixLinkInfo,
    purgeQualityText,
    fixLinkInfoOrder,
    linkInfoRegex,
    releaseRegex,
    encodersRegex
} from "../linkInfoUtils.js";
import save from "../save_changes_db.js";
import * as persianRex from "persian-rex";
import {saveError} from "../../error/saveError.js";

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
            if (
                title.includes('ایران') ||
                title.includes('ماجرای نیمروز') ||
                title.includes('سهیلا') ||
                title.includes('رسوایی')
            ) {
                return;
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
                    downloadLinks = removeDuplicateLinks(downloadLinks, true);

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
        if (type.includes('serial')) {
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
        saveError(error2);
        return "";
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
        text_array = $(link).parent().prev().text().split(' ');
    }

    let info = [...text_array, bit10].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(value => value).join(' - ');
}

function getSerialFileInfoFromLink(linkHref) {
    linkHref = linkHref.replace(/[/_\s]/g, '.').replace('.-.', '.');
    let link_href_array = linkHref.split('.');
    let seasonEpisode_match = linkHref.match(/s\d+e\d+(-?e\d+)*/gi);
    if (!seasonEpisode_match) {
        return '';
    }

    let seasonEpisode = seasonEpisode_match.pop();
    let index = link_href_array.indexOf(seasonEpisode);
    let array = link_href_array.slice(index + 1);
    array.pop();
    let info = purgeQualityText(array.join('.'));

    info = info
        .replace(/repack\.\d\d\d\d?p/i, (res) => res.split('.').reverse().join('.'))
        .replace(/\.(nf|2ch|co)(?=(\.|$))/gi, '')
        .replace(/PaHe\.SalamDL/i, 'PaHe')
        .replace('amzn.', '')
        .replace(/^new\./i, '')
        .replace(/\.tehmovies\.com/i, '');

    if (!info.match(/\d\d\d\d?p/i)) {
        let splitInfo = info.split('.');
        let resIndex = splitInfo.findIndex(item => item.match(/\d\d\d\d?p/));
        if (resIndex === -1) {
            resIndex = splitInfo.findIndex(item => item.match(releaseRegex));
        }
        info = resIndex !== -1 ? splitInfo.slice(resIndex).join('.') : '';
    }

    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    info = info.replace(/(.+\.)\d\d\d\d?p+/, (res) => res.split('.').reverse().join('.'));
    return info;

}

function getFileData_movie(text_array, dubbed, linkHref) {
    if (text_array[0].includes('تریلر') || text_array[0].includes('تیزر')) {
        return 'trailer';
    }

    let encoder = '';
    let encoder_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('انکدر') || text_array[1].includes('انکودر')) ? 1
            : (text_array[2] && text_array[2].includes('انکودر:')) ? 2 : '';
    if (encoder_index) {
        encoder = purgeEncoderText(text_array[encoder_index])
    } else {
        let temp = text_array[0].match(/MkvCage|ShAaNiG|Ganool|YIFY|nItRo/i);
        if (temp) {
            encoder = temp[0];
            text_array[0] = text_array[0].replace(new RegExp(`${temp[0]}\\s*-\\s`), '');
        }
    }

    let size_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('حجم')) ? 1 :
            (text_array[2]) ? 2 : '';
    let size = size_index ? purgeSizeText(text_array[size_index]) : '';

    let quality = purgeQualityText(text_array[0]);
    if (quality.includes('دانلود نسخه سه بعد')) {
        let info = ['3D', dubbed].filter(value => value).join('.')
        return [info, size].filter(value => value).join(' - ');
    }

    quality = quality.split(' ');
    if (quality.length === 1 && quality[0] === '--') {
        quality = [];
    }

    let moviePartMatch = linkHref.match(/part[\s.]*\d(?=\.)/i);
    let moviePart = moviePartMatch ? moviePartMatch.pop().replace(/part/i, 'Part') : '';
    let info = [...quality, moviePart, encoder, dubbed].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(value => value).join(' - ');
}

function getFileData_extraLink($, link) {
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let quality_match = link_href.match(/\d\d\d\d?p/gi);
    if (quality_match) {
        let quality = quality_match.pop();
        let quality_index = link_href_array.indexOf(quality);
        let text_array = link_href_array.slice(quality_index, quality_index + 4);
        let info = purgeQualityText(text_array.join('.'));
        info = fixLinkInfoOrder(info);
        return info;
    } else {
        let year_match = link_href.match(/\d\d\d\d/g);
        if (year_match) {
            let year = year_match.pop();
            let year_index = link_href_array.indexOf(year);
            let info = link_href_array[year_index + 1];
            info = fixLinkInfo(info, link_href);
            info = fixLinkInfoOrder(info);
            return info;
        } else {
            return '';
        }
    }
}

function printLinksWithBadInfo(downloadLinks) {
    const badLinks = downloadLinks.filter(item =>
        !item.info.match(linkInfoRegex) &&
        !item.info.match(new RegExp(`^\\d\\d\\d\\d?p\\.(${encodersRegex.source})$`)) &&
        !item.info.match(/^\d\d\d\d?p\.(3D|(Part\.\d))(\.dubbed)?$/) &&
        !item.info.match(/^\d\d\d\d?p(\.x265)?(\.Episode\(\d\d?\d?-\d\d?\d?\))?(\.dubbed)?$/) &&
        !item.link.match(/\.s\d\de\d\d(\.REPACK)?(.*)\.\d\d\d\d?p(\.x265)?(\.hevc)?(\.Farsi\.Dubbed)?\.mkv/i)
    );

    const badSeasonEpisode = downloadLinks.filter(item => item.season > 40 || item.episode > 400);

    console.log([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}
