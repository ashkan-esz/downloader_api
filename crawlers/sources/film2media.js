const {search_in_title_page, wrapper_module} = require('../search_tools');
const {remove_persian_words, getMode} = require('../utils');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../saveError");

let collection = '';
let save_title = '';
let RECRAWL;

module.exports = async function film2media({movie_url, page_count}, reCrawl = false) {
    RECRAWL = reCrawl;
    await wrapper_module(movie_url, page_count, search_title, RECRAWL);


    // for local test
    // await wrapper_module('https://www.film2media.website/page/', 10, search_title);
}

async function search_title(link, i) {
    let rel = link.attr('rel');
    if (rel && rel === 'bookmark') {
        let title = link.text().toLowerCase();
        let mode = getMode(title);
        let page_link = link.attr('href');
        if (process.env.NODE_ENV === 'dev') {
            console.log(`film2media/${mode}/${i}/${title}  ========>  `);
        }
        let title_array = remove_persian_words(title, mode);
        save_title = title_array.join('.');
        collection = (page_link.includes('collection')) ? 'collection' : '';
        if (title_array.length > 0) {
            let {save_link, $2} = await search_in_title_page(title_array, page_link, mode, get_file_size);
            let persian_summary = get_persian_summary($2);
            let poster = get_poster($2);
            if (save_link.length > 0) {
                await save(title_array, page_link, save_link, persian_summary, poster, [], mode, RECRAWL);
            }
        }
    }
}

function get_persian_summary($) {
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

function get_poster($) {
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

function get_file_size($, link, mode) {
    //'480p.WEB-DL'  //'720p.x265.WEB-DL'
    //'1080p.BluRay.dubbed - 1.8GB'  //'1080p.WEB-DL - 1.9GB'
    try {
        if (mode === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link);
    } catch (error) {
        saveError(error);
        return "";
    }
}

function get_file_size_serial($, link) {
    let text_array = $(link).text()
        .split(' ')
        .filter((text) => !persianRex.hasLetter.test(text));
    text_array.shift();
    let quality = text_array[0].replace(/[»:«]/g, '');
    let x265 = (text_array.length > 1) ? text_array[1].replace(/[»:«]/g, '') : '';
    let href_array = $(link).attr('href').split('.');
    let release = href_array[href_array.indexOf(quality) + 1];
    let linkHref = $(link).attr('href').toLowerCase();
    let dubbed = (linkHref.includes('farsi') || linkHref.includes('dubbed')) ? 'dubbed' : '';
    return [quality, x265, release, dubbed]
        .filter(value => value !== '')
        .join('.')
        .replace(/Web-dl|web-dl/g, 'WEB-DL');
}

function get_file_size_movie($, link) {
    let link_href = $(link).attr('href').toLowerCase();
    if (link_href.includes('extras')) {
        return 'extras';
    } else if (link_href.includes('hdcam')) {
        return 'HDCam';
    }

    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let text = $(parent).prev().text().replace('Web-dl', 'WEB-DL').trim();

    if (persianRex.hasLetter.test(text)) {
        text = remove_persian_from_info(text, $, parent);
    }

    let text_array = text.split(' – ');
    let extra = '';
    if (text_array[1] && !text_array[1].includes('MB') && !text_array[1].includes('GB')) {
        extra = text_array[1];
        text_array[1] = "";
    }

    let {dubbed, movie_title, quality_release_array, release} = extract_info(link_href, text_array);
    text_array[0] = [movie_title, ...quality_release_array, release, extra, dubbed]
        .filter(value => value !== '' && !persianRex.hasLetter.test(value)).join('.');
    return text_array.filter(value => value !== '').join(' - ');
}

function remove_persian_from_info(text, $, parent) {
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

function extract_info(link_href, text_array) {
    let dubbed = (link_href.includes('farsi') || link_href.includes('dubbed')) ? 'dubbed' : '';
    let match_year = link_href.replace(/_/g, '.').match(/\.\d\d\d\d\./g);
    let year = match_year ? match_year
        .pop().replace(/\./g, '') : '';
    let movie_title = (collection) ? save_title + "." + year : '';
    let quality_release_array = text_array[0].split(' ');
    let release = quality_release_array.shift();
    return {dubbed, movie_title, quality_release_array, release};
}
