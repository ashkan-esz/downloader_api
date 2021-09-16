const {search_in_title_page, wrapper_module} = require('../searchTools');
const {purgeTitle, getType, checkDubbed, purgeQualityText} = require('../utils');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../saveError");

let collection = '';
let save_title = '';

module.exports = async function film2media({movie_url, page_count}) {
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let rel = link.attr('rel');
        if (rel && rel === 'bookmark') {
            let title = link.text().toLowerCase();
            let type = getType(title);
            let page_link = link.attr('href');
            if (process.env.NODE_ENV === 'dev') {
                console.log(`film2media/${type}/${i}/${title}  ========>  `);
            }
            if (type === 'serial' && !title.includes('فیلم') && !title.includes('سریال')) {
                type = 'movie';
            }
            title = purgeTitle(title, type);
            save_title = title.replace(/\s/g, '.');
            collection = (page_link.includes('collection')) ? 'collection' : '';
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2, subtitles, cookies} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    await save(title, page_link, save_link, persian_summary, poster, [], [], subtitles, cookies, type);
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

function get_file_size($, link, type) {
    //'480p.WEB-DL'  //'720p.x265.WEB-DL'
    //'1080p.BluRay.dubbed - 1.8GB'  //'1080p.WEB-DL - 1.9GB'
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link);
    } catch (error) {
        saveError(error);
        return "";
    }
}

function get_file_size_serial($, link) {
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

function get_file_size_movie($, link) {
    let link_href = $(link).attr('href').toLowerCase();
    if (link_href.includes('extras')) {
        return 'extras';
    } else if (link_href.includes('hdcam')) {
        return 'HDCam';
    }

    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let text = purgeQualityText($(parent).prev().text());

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
    let dubbed = checkDubbed(link_href) ? 'dubbed' : '';
    let match_year = link_href.replace(/_/g, '.').match(/\.\d\d\d\d\./g);
    let year = match_year ? match_year.pop().replace(/\./g, '') : '';
    let movie_title = (collection) ? save_title + "." + year : '';
    let quality_release_array = text_array[0].split(' ');
    let release = quality_release_array.shift();
    return {dubbed, movie_title, quality_release_array, release};
}
