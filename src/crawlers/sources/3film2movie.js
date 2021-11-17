import config from "../../config";
import {search_in_title_page, wrapper_module} from "../searchTools";
import {
    getTitleAndYear,
    validateYear,
    replacePersianNumbers,
    getType,
    checkHardSub,
    checkDubbed,
    purgeQualityText,
} from "../utils";
import save from "../save_changes_db";
import * as persianRex from "persian-rex";
import {saveError} from "../../error/saveError";

const sourceName = "film2movie";

export default async function film2movie({movie_url, page_count}) {
    await wrapper_module(sourceName, movie_url, page_count, search_title);
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
            ({title, year} = getTitleAndYear(title, year, type));
            if (title === 'planet earth 2' && type === 'movie') {
                type = 'serial';
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2);
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

function getPersianSummary($) {
    try {
        let div = $('div');
        for (let i = 0; i < div.length; i++) {
            let temp = $(div[i]).text();
            if (temp && temp === 'خلاصه داستان :')
                return $(div[i]).next().text().trim();
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getPoster($) {
    try {
        let $imgs = $('img');
        for (let i = 0; i < $imgs.length; i++) {
            let src = $imgs[i].attribs.src;
            let id = $($imgs[i]).attr('id');
            if (id && id === 'myimg') {
                return src;
            }
        }
        for (let i = 0; i < $imgs.length; i++) {
            let src = $imgs[i].attribs.src;
            let alt = $imgs[i].attribs.alt;
            if (src.includes('.jpg') && alt.includes('دانلود')) {
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
                    let quality = href.includes('1080p') ? '1080p'
                        : (href.includes('720p') || href.toLowerCase().includes('hd')) ? '720p' : '360p';
                    result.push({
                        link: href,
                        info: 'film2movie-' + quality
                    });
                }
            }
        }

        let unique = [];
        for (let i = 0; i < result.length; i++) {
            let exist = false;
            for (let j = 0; j < unique.length; j++) {
                if (result[i].link === unique[j].link) {
                    exist = true;
                    break;
                }
            }
            if (!exist) {
                unique.push(result[i]);
            }
        }
        return unique;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getFileData($, link, type) {
    //'1080p.HardSub'  //'720p.BluRay.F2M.dubbed.Censored'
    //'480p.BluRay.F2M.HardSub.Censored'  //'720p.BluRay.F2M.Censored'
    try {
        if (type === 'serial') {
            return purgeQualityText(getFileData_serial($, link));
        }
        let info = purgeQualityText(getFileData_movie($, link));
        return info.replace('BluRay.4K.2160p', '2160p.4K.BluRay');
    } catch (error) {
        saveError(error);
        return "";
    }
}

function getFileData_serial($, link) {
    let text = $(link).parent().text().replace(/[:_|]/g, '');
    text = replacePersianNumbers(text);
    let family = (text.includes('Family')) ? 'Censored' : '';
    let text_array = text.split(' ').filter((text) =>
        text && text !== 'Family' && !persianRex.hasLetter.test(text));
    text_array.shift();
    let link_href = $(link).attr('href').toLowerCase();
    if (text_array.length === 1 && text_array[0] === 'x265') {
        let resolution = link_href.match(/\d\d\d+p/g);
        if (resolution) {
            text_array.unshift(resolution.pop());
        }
    }
    if (!text_array.includes('BluRay') && link_href.includes('bluray')) {
        text_array.push('BluRay');
    }
    let HardSub = (checkHardSub(text) || checkHardSub(link_href)) ? 'HardSub' : '';
    let dubbed = checkDubbed(text, link_href) ? 'dubbed' : '';
    return [...text_array, HardSub, dubbed, family].filter(value => value !== '').join('.');
}

function getFileData_movie($, link) {
    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let text = $(parent).prev().text();
    text = replacePersianNumbers(text);
    let link_href = $(link).attr('href').toLowerCase();
    let HardSub = checkHardSub(link_href) ? 'HardSub' : '';
    let dubbed = checkDubbed(link_href, '') ? 'dubbed' : '';
    let Censored = ($(link).next().text().toLowerCase().includes('family') || dubbed || HardSub) ? 'Censored' : '';
    let text_array = text.replace(/[()]/g, '').split(' ')
        .filter((text) => text && !persianRex.hasLetter.test(text));
    if (text_array.length === 1) {
        if (link_href.includes('3d')) {
            return '3D';
        }
        if (link_href.includes('dvdrip')) {
            return 'DVDrip';
        }
        let case1 = link_href.match(/\d\d\d\dp|\d\d\dp/g);
        let quality = case1 ? case1[0] : null;
        if (quality === null) {
            return text_array[0];
        }
        let link_href_array = link_href.split('.');
        let index = link_href_array.indexOf(quality);
        return [link_href_array[index], link_href_array[index + 2], link_href_array[index + 1], dubbed, HardSub, Censored].filter(value => value).join('.');
    } else if (text_array.length === 2) {
        if (text_array[1].match(/\d\d\d\dp|\d\d\dp/g)) {
            return [text_array[1], text_array[0], dubbed, HardSub, Censored].filter(value => value).join('.');
        }
        return [...text_array, dubbed, HardSub, Censored].filter(value => value).join('.');
    }
    if (text_array[2].match(/\d\d\d\dp|\d\d\dp/g) && text_array[0] === 'x265') {
        return [text_array[2], text_array[0], text_array[1], ...text_array.slice(3), HardSub, dubbed, Censored].filter(value => value !== '').join('.');
    }
    if (text_array[0].match(/\d\d\d\dp|\d\d\dp/g) || text_array[0].toLowerCase() === 'mobile') {
        return [text_array[0], text_array[1], ...text_array.slice(2), HardSub, dubbed, Censored].filter(value => value !== '').join('.');
    }
    return [text_array[1], text_array[0], ...text_array.slice(2), HardSub, dubbed, Censored].filter(value => value !== '').join('.');
}
