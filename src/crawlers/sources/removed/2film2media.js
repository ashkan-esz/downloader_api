import config from "../../../config/index.js";
import {search_in_title_page, wrapper_module} from "../../searchTools.js";
import {getType, checkDubbed} from "../../utils.js";
import {getTitleAndYear} from "../../movieTitle.js";
import {purgeQualityText} from "../../linkInfoUtils.js";
import save from "../../save_changes_db.js";
import * as persianRex from "persian-rex";
import {saveError} from "../../../error/saveError.js";

let collection = '';
let save_title = '';

const sourceName = "film2media";
const needHeadlessBrowser = false;
const sourceAuthStatus = 'ok';

export default async function film2media({movie_url, page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, sourceAuthStatus, movie_url, page_count, search_title);
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
                console.log(`film2media/${type}/${i}/${title}  ========>  `);
            }
            if (type === 'serial' && !title.includes('فیلم') && !title.includes('سریال')) {
                type = 'movie';
            }
            ({title, year} = getTitleAndYear(title, year, type));
            save_title = title.replace(/\s/g, '.');
            collection = (pageLink.includes('collection')) ? 'collection' : '';

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, sourceAuthStatus, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    let sourceData = {
                        sourceName,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: getPersianSummary($2),
                        poster: getPoster($2),
                        trailers: [],
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

function getPersianSummary($) {
    try {
        let divs = $('div');
        for (let i = 0; i < divs.length; i++) {
            let temp = $(divs[i]).css('text-align');
            if (temp === 'justify')
                return $(divs[i]).text().trim();
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getPoster($) {
    try {
        let imgs = $('img');
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let id = $(imgs[i]).attr('id');
            if (id && id === 'myimg') {
                return src;
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getFileData($, link, type) {
    //'480p.WEB-DL'  //'720p.x265.WEB-DL'
    //'1080p.BluRay.dubbed - 1.8GB'  //'1080p.WEB-DL - 1.9GB'
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
    if ($(link).text().includes('قسمت ویژه')) {
        return 'ignore';
    }
    let text_array = $(link).text()
        .split(' ')
        .filter((text) => !persianRex.hasLetter.test(text));
    if (text_array.length > 1) {
        text_array.shift();
    }

    let quality = text_array[0].replace(/[»:«]/g, '');
    let x265 = (text_array.length > 1) ? text_array[1].replace(/[»:«]/g, '') : '';
    let linkHref = $(link).attr('href');
    let href_array = linkHref.split('.');
    let qualityIndex = href_array.indexOf(quality);
    let release = qualityIndex !== -1 ? href_array[qualityIndex + 1] : '';
    let dubbed = checkDubbed(linkHref.toLowerCase(), '') ? 'dubbed' : '';
    let info = [quality, x265, release, dubbed].filter(value => value).join('.');
    return purgeQualityText(info);
}

function getFileData_movie($, link) {
    let link_href = $(link).attr('href').toLowerCase();
    if (link_href.includes('extras')) {
        return 'extras';
    } else if (link_href.includes('hdcam')) {
        return 'HDCam';
    }

    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let text = purgeQualityText($(parent).prev().text());

    if (persianRex.hasLetter.test(text)) {
        text = removePersianWordsFromInfo(text, $, parent);
    }

    let text_array = text.split(' – ');
    let extra = '';
    if (text_array[1] && !text_array[1].includes('MB') && !text_array[1].includes('GB')) {
        extra = text_array[1];
        text_array[1] = "";
    }

    let {dubbed, movie_title, quality_release_array, release} = extractInfo(link_href, text_array);
    text_array[0] = [movie_title, ...quality_release_array, release, extra, dubbed]
        .filter(value => value !== '' && !persianRex.hasLetter.test(value)).join('.');
    return text_array.filter(value => value !== '').join(' - ');
}

function removePersianWordsFromInfo(text, $, parent) {
    let temp = text.replace(/[()]/g, '')
        .split(' ').filter((value) => value && !persianRex.hasText.test(value));
    if (temp.length === 0) {
        text = $(parent).prev().prev().text().trim();
    } else {
        let prev2 = $(parent).prev().prev().text().trim();
        if (prev2.includes('(') && prev2.includes(')')) {
            text = $(parent).prev().prev().prev().text().trim();
        }
    }
    return text;
}

function extractInfo(link_href, text_array) {
    let dubbed = checkDubbed(link_href) ? 'dubbed' : '';
    let match_year = link_href.replace(/_/g, '.').match(/\.\d\d\d\d\./g);
    let year = match_year ? match_year.pop().replace(/\./g, '') : '';
    let movie_title = (collection) ? save_title + "." + year : '';
    let quality_release_array = text_array[0].split(' ');
    let release = quality_release_array.shift();
    return {dubbed, movie_title, quality_release_array, release};
}
