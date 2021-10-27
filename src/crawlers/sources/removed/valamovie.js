const config = require('../../../config');
const {search_in_title_page, wrapper_module} = require('../../searchTools');
const {
    purgeTitle,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks,
    purgeQualityText,
    purgeEncoderText,
    purgeSizeText
} = require('../../utils');
const save = require('../../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../../error/saveError");

let valaMovieTrailerUrl = '';

module.exports = async function valamovie({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(serial_url, serial_page_count, search_title_serial);
    await wrapper_module(movie_url, page_count, search_title_movie);
    return valaMovieTrailerUrl;
}

async function search_title_serial(link, i) {
    try {
        if (link.hasClass('product-title')) {
            let title = link.text();
            let page_link = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`valamovie/serial/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title.toLowerCase(), 'serial');
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, 'serial', get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2, subtitles, cookies} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);

                    if (!valaMovieTrailerUrl && trailers.length > 0) {
                        valaMovieTrailerUrl = trailers[0].link.replace(/www\.|https:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '').split('/')[0];
                    }

                    await save(title, page_link, save_link, persian_summary, poster, trailers, [], subtitles, cookies, 'serial');
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

async function search_title_movie(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && title.toLowerCase() === link.text().toLowerCase()) {
            let page_link = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`valamovie/movie/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title.toLowerCase(), 'movie');
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, 'movie', get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2, subtitles, cookies} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);

                    if (!valaMovieTrailerUrl && trailers.length > 0) {
                        valaMovieTrailerUrl = trailers[0].link.replace(/www\.|https:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '').split('/')[0];
                    }

                    save_link = removeDuplicateLinks(save_link);
                    await save(title, page_link, save_link, persian_summary, poster, trailers, [], subtitles, cookies, 'movie');
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function get_persian_summary($) {
    try {
        let paragraphs = $('p');
        for (let i = 0; i < paragraphs.length; i++) {
            if ($(paragraphs[i]).text().includes('خلاصه داستان:')) {
                let temp = $($(paragraphs[i]).children()[0]).text();
                return $(paragraphs[i]).text().replace(temp, '').trim();
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_poster($) {
    try {
        let links = $('a');
        for (let i = 0; i < links.length; i++) {
            if ($(links[i]).hasClass('mfp-image')) {
                let src = links[i].attribs.href;
                if (src.includes('.jpg')) {
                    return src;
                }
            }
        }
        let divs = $('div');
        for (let i = 0; i < divs.length; i++) {
            if ($(divs[i]).hasClass('container')) {
                let style = $(divs[i]).attr('style');
                if (style) {
                    return style.replace('background:url(\'', '')
                        .replace('\');', '');
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
        let a = $('video');
        for (let i = 0; i < a.length; i++) {
            let src = $(a[i]).children()[0].attribs.src;
            if (src && (src.includes('.mp4') || src.includes('.mkv'))) {
                result.push({
                    link: src,
                    info: 'valamovie-720p'
                });
            }
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function get_file_size($, link, type) {
    //'1080p.WEB-DL.SoftSub - 750MB' //'720p.x265.WEB-DL - 230MB'
    //'1080p.BluRay.dubbed - 1.77GB' //'1080p.x265.BluRay.RMTeam - 1.17GB'
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link)
    } catch (error) {
        saveError(error);
        return "";
    }
}

function get_file_size_serial($, link) {
    let text_array = $(link).parent().parent().parent().parent().prev().text().trim().split('/');
    let bit10 = $(link).attr('href').includes('10bit') ? '10bit' : '';
    let quality, dubbed, size, link_quality;
    let sub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    if (text_array.length === 1) {
        quality = $(link).text().split(/[\s-]/g).filter((text) => !persianRex.hasLetter.test(text) && text !== '' && isNaN(text));
        if (quality[0] === 'X265') {
            quality[0] = '720p.x265';
        }
        return [...quality, bit10].filter(value => value).join('.');
    } else if (text_array.length === 2) {
        return serial_text_length_2(text_array, $, link, bit10);
    } else if (text_array.length === 3) {
        let result = serial_text_length_3(text_array, $, link, 1, 2);
        quality = result.quality;
        dubbed = result.dubbed;
        size = result.size;
        let link_href = $(link).attr('href').toLowerCase();
        let case1 = link_href.match(/\d\d\d\dp|\d\d\dp/g);
        link_quality = case1 ? case1[0] : '';
    } else {
        let result = serial_text_length_3(text_array, $, link, 2, 3);
        quality = result.quality;
        dubbed = result.dubbed;
        size = result.size;
    }
    let info = [link_quality, quality[1], ...quality.slice(2), bit10, quality[0], dubbed, sub].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let bit10 = $(link).attr('href').includes('10bit') ? '10bit' : '';
    let prevNode = $(link).parent().parent().parent().prev();
    if ($(prevNode)[0].name === 'br') {
        prevNode = $(prevNode).prev();
    }
    let link_href = $(link).attr('href').toLowerCase();
    let dubbed = checkDubbed(link_href, '') ? 'dubbed' : '';

    let text = $(prevNode).text().replace(/مدت زمان: \d+:\d+:\d+/g, '').replace(/[()]/g, '').trim();
    let text_array = text.replace(/:\s\s/g, ': ').split('  ').filter(value => value);

    let quality = purgeQualityText(text_array[0]).split(' ');
    let size = '', encoder = '';

    if (text_array[0].includes('کیفیت : انکودر :')) {
        let resolution = link_href.match(/\d\d\d+p|dvdrip/gi);
        if (resolution) {
            quality = [resolution.pop()];
        } else {
            quality = [];
        }
        encoder = purgeEncoderText(purgeQualityText(text_array[0]));
        size = '';
    } else if (text_array.length === 2) {
        if (text_array[1].toLowerCase().includes('حجم') ||
            text_array[1].toLowerCase().includes('mb') ||
            text_array[1].toLowerCase().includes('gb') ||
            text_array[1].toLowerCase().includes('گیگابایت') ||
            text_array[1].toLowerCase().includes('مگابایت')) {
            encoder = '';
            size = purgeSizeText(text_array[1]);
        } else {
            encoder = purgeEncoderText(text_array[1]);
            size = '';
        }
    } else if (text_array.length === 3) {
        encoder = purgeEncoderText(text_array[1]);
        size = purgeSizeText(text_array[2]);
    }

    let info = (quality[2] === '10bit')
        ? [quality[1], ...quality.slice(3), quality[0], quality[2], encoder, dubbed].filter(value => value).join('.')
        : [quality[1], ...quality.slice(2), quality[0], bit10, encoder, dubbed].filter(value => value).join('.');
    info = info
        .replace('4K.WEB-DL.10bit', '10bit.4K.WEB-DL')
        .replace('WEB-ًRIP.10bit', '10bit.WEB-RIP')
        .replace('WEB-DL.10bit', '10bit.WEB-DL')
        .replace('BluRay.10bit', '10bit.BluRay');
    return [info, size].filter(value => value !== '').join(' - ');
}

function serial_text_length_2(text_array, $, link, bit10) {
    let quality = purgeQualityText(text_array[1]).split(' ');
    let link_href = $(link).attr('href').toLowerCase();
    let x265 = (link_href.includes('x265')) ? 'x265' : '';
    let case1 = link_href.match(/\d\d\d\dp|\d\d\dp/g);
    let link_quality = case1 ? case1[0] : 'DVDrip';
    if (quality.length === 2) {
        if (quality.includes('فارسی')) {
            quality.pop();
            quality[0] = 'dubbed';
        }
    }
    return [link_quality, quality[1], x265, ...quality.slice(2), bit10, quality[0]].filter(value => value).join('.')
}

function serial_text_length_3(text_array, $, link, qualityIndex, dubbedIndex) {
    let quality = purgeQualityText(text_array[qualityIndex]).split(' ');
    let link_href = $(link).attr('href').toLowerCase();
    let dubbed = (text_array[dubbedIndex].includes('دوبله فارسی') || checkDubbed(link_href, '')) ? 'dubbed' : '';
    let size = (!dubbed) ? purgeSizeText(text_array[dubbedIndex]) : '';
    if (quality.length === 2 && quality[0].match(/\d\d\d\dp|\d\d\dp/g)) {
        quality = quality.reverse();
    }
    if (!quality.includes('x265') && link_href.includes('x265')) {
        quality.push('x265');
    }
    return {quality, dubbed, size};
}
