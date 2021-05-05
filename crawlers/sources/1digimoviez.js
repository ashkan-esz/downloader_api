const {search_in_title_page, wrapper_module} = require('../searchTools');
const {remove_persian_words} = require('../utils');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../saveError");

//todo : add quality sample

module.exports = async function digimovies({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(serial_url, serial_page_count, search_title_serial);
    await wrapper_module(movie_url, page_count, search_title_movie);
}

async function search_title_serial(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.children()[0].name !== 'img') {
            let page_link = link.attr('href');
            if (process.env.NODE_ENV === 'dev') {
                console.log(`digimovies/serial/${i}/${title}  ========>  `);
            }
            let title_array = remove_persian_words(title.toLowerCase(), 'serial');
            if (title_array.length > 0) {
                let pageSearchResult = await search_in_title_page(title_array, page_link, 'serial', get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    let watchOnlineLinks = getWatchOnlineLinks($2);
                    if (save_link.length > 0) {
                        await save(title_array, page_link, save_link, persian_summary, poster, trailers, watchOnlineLinks, 'serial');
                    }
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

async function search_title_movie(link, i, $) {
    try {
        let text = link.text();
        if (text && text === 'ادامه مطلب') {
            let title = link.attr('title').toLowerCase();
            let page_link = link.attr('href');
            if (process.env.NODE_ENV === 'dev') {
                console.log(`digimovies/movie/${i}/${title}  ========>  `);
            }
            let title_array = remove_persian_words(title, 'movie');
            if (title_array.length > 0 && !isPersianMovies($, link)) {
                let pageSearchResult = await search_in_title_page(title_array, page_link, 'movie', get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    let watchOnlineLinks = getWatchOnlineLinks($2);
                    save_link = remove_duplicate(save_link);
                    if (save_link.length > 0) {
                        await save(title_array, page_link, save_link, persian_summary, poster, trailers, watchOnlineLinks, 'movie');
                    }
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function get_persian_summary($) {
    try {
        let divs = $('div');
        for (let i = 0; i < divs.length; i++) {
            if ($(divs[i]).hasClass('panel'))
                return $(divs[i]).text().trim();
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_poster($) {
    try {
        let imgs = $('img');
        for (let i = 0; i < imgs.length; i++) {
            let parent = imgs[i].parent;
            if (parent.name === 'a') {
                let href = parent.attribs.href;
                if (href.includes('uploads')) {
                    return href;
                }
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
            let title = $(a[i]).attr('title');
            if (title && title.toLowerCase().includes('پخش تریلر')) {
                let href = $(a[i]).attr('href');
                result.push({
                    link: href,
                    info: 'digimoviez-720p'
                });
            }
        }

        result = remove_duplicate(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getWatchOnlineLinks($) {
    try {
        let result = [];
        let a = $('a');
        for (let i = 0; i < a.length; i++) {
            let title = $(a[i]).attr('title');
            if (title && title.toLowerCase().includes('پخش آنلاین')) {
                let href = $(a[i]).attr('href');
                let info = $(a[i]).parent().parent().prev().text();
                let quality = info.includes('1080') ? '1080p' : info.includes('720') ? '720p' : '480p';
                result.push({
                    link: href,
                    info: 'digimoviez-' + quality,
                });
            }
        }

        result = remove_duplicate(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function isPersianMovies($, link) {
    try {
        let prevNodeChildren = $(link).parent().parent().parent().parent().parent().prev().children()[0];
        return $(prevNodeChildren).text().includes('فیلم ایرانی');
    } catch (e) {
        return false;
    }
}

function get_file_size($, link, type) {
    //'1080p.HDTV.dubbed - 550MB'  //'1080p.WEB-DL.SoftSub - 600MB'
    //'720p.x265.WEB-DL.SoftSub - 250MB' //'2160p.x265.BluRay.10bit.IMAX.SoftSub - 4.42GB'
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_file_size_serial($, link) {
    let text_array = $(link).parent().parent().parent().parent().prev().text().split('|');
    let dubbed, size, quality;
    if (text_array.length === 1 || (text_array.length === 2 && text_array[1].toLowerCase().includes('repack'))) {
        let {info, size} = get_serial_text_len1(text_array);
        return [info, size].filter(value => value).join(' - ');
    } else if (text_array.length === 3) {
        dubbed = (text_array[2].includes('زبان : فارسی')) ? 'dubbed' : '';
        let temp = text_array[2].replace(/:/g, '').split(' ');
        size = temp.filter((text) => !persianRex.hasLetter.test(text) && !isNaN(text)).pop() + 'MB';
        quality = temp.filter((text) => !persianRex.hasLetter.test(text) && isNaN(text)).join('.');
    } else {
        quality = text_array[2].replace(/:/g, '')
            .replace('کیفیت', '')
            .trim().replace(/\s/g, '.');
        quality = sortQualityInfo(quality);
        dubbed = (text_array[3].includes('زبان : فارسی') || text_array[3].includes('زبان: دوبله فارسی')) ? 'dubbed' : '';
        size = dubbed ? text_array[4] : text_array[3];
    }
    let info = [quality, dubbed].filter(value => value !== '').join('.');
    let MB_GB = size.includes('مگابایت') ? 'MB' : size.includes('گیگابایت') ? 'GB' : '';
    let size_match = size.match(/[+-]?\d+(\.\d+)?/g);
    size = size_match ? size_match[0]
        : size.includes('یک') ? '1'
            : size.includes('دو') ? '2' : '';
    size += MB_GB;
    return [info, size].filter(value => value !== '').join(' - ');
}

function get_file_size_movie($, link) {
    let prevNodeChildren = $(link).parent().parent().prev().children();
    let dubbed = ($(link).attr('href').toLowerCase().includes('farsi.dub')) ? 'dubbed' : '';
    let quality_text = $(prevNodeChildren[0]).text();
    if (quality_text.includes('کیفیت')) {
        let quality = quality_text.replace('کیفیت :', '').trim().replace(/\s/g, '.');
        quality = sortQualityInfo(quality);
        let info = [quality, dubbed].filter(value => value !== '').join('.');
        let size_text = $(prevNodeChildren[1]).text();
        let size = (size_text.includes('حجم')) ?
            size_text.replace('حجم :', '').replace(' ', '') : '';
        return [info, size].filter(value => value !== '').join(' - ');
    } else {
        let quality = get_movie_quality($, link);
        let info = [quality, dubbed].filter(value => value !== '').join('.');
        let size_text = $(prevNodeChildren[0]).text();
        let size = (size_text.includes('حجم')) ?
            size_text.replace('حجم :', '').replace(' ', '') : '';
        return [info, size].filter(value => value !== '').join(' - ');
    }
}

function get_serial_text_len1(text_array) {
    let size;
    if (text_array.length === 1 && !text_array[0].includes('حجم')) {
        size = '';
    }
    let MB_GB = text_array[0].includes('مگابایت') ? 'MB' : text_array[0].includes('گیگابایت') ? 'GB' : '';
    text_array = text_array[0].split(/\s|:/g).filter((text) => !persianRex.hasLetter.test(text) && text !== '');
    text_array.shift();
    if (!isNaN(text_array[0])) {
        text_array.shift();
    }
    if (size !== '') {
        size = text_array.pop() + MB_GB;
    }
    let info = (text_array.length === 2 && text_array[1].match(/|\d\d\d\dp\d\d\dp/g))
        ? [text_array[1], text_array[0]].join('.')
        : text_array.join('.').trim();
    return {info, size};
}

function sortQualityInfo(quality) {
    let spited_quality = quality.split('.');
    if (spited_quality.length > 1 && !spited_quality[1].includes('x265') && spited_quality[1].match(/\d\d\d\dp|\d\d\dp/g)) {
        if (spited_quality.length > 2 && spited_quality[2].includes('x265')) {
            quality = [spited_quality[1], spited_quality[2], spited_quality[0], ...spited_quality.slice(3)].filter(value => value).join('.');
        } else {
            quality = [spited_quality[1], spited_quality[0], ...spited_quality.slice(2)].filter(value => value).join('.');
        }
    } else if (spited_quality.length > 2) {
        if (spited_quality[2].match(/\d\d\d\dp|\d\d\dp/g) && spited_quality[1] === 'x265') {
            quality = [spited_quality[2], spited_quality[1], spited_quality[0], ...spited_quality.slice(3)].filter(value => value).join('.');
        } else if (
            (spited_quality[1].includes('WEB-DL') ||
                spited_quality[1].includes('BluRay') ||
                spited_quality[1].includes('HDTV')) && spited_quality[2] === 'x265') {
            quality = [spited_quality[0], spited_quality[2], spited_quality[1], ...spited_quality.slice(3)].filter(value => value).join('.');
        }
    } else if (spited_quality.length > 3 && spited_quality[1].includes('10bit') && spited_quality[3] === 'x265') {
        quality = [spited_quality[0], spited_quality[3], spited_quality[1], spited_quality[0], ...spited_quality.slice(4)].filter(value => value).join('.');
    }
    return quality;
}

function get_movie_quality($, link) {
    let link_href = $(link).attr('href').toLowerCase();
    let link_href_array = link_href.split(/[._]/g);
    let case1 = link_href.match(/\d\d\d\dp|\d\d\dp/g);
    let link_quality = case1 ? case1.pop() : '';
    let index = link_href_array.indexOf(link_quality);
    return link_href_array.slice(index, index + 2).join('.');
}

function remove_duplicate(input) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (input[i].link === result[j].link) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}
