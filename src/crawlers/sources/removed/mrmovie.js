const config = require('../../../config');
const {search_in_title_page, wrapper_module} = require('../../searchTools');
const {purgeTitle, getType} = require('../../utils');
const save = require('../../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../../error/saveError");


module.exports = async function mrmovie({movie_url, serial_url, page_count, serial_page_count}) {
    await Promise.all([
        wrapper_module(serial_url, serial_page_count, search_title),
        wrapper_module(movie_url, page_count, search_title)
    ]);
}

async function search_title(link, i) {
    try {
        if (link.hasClass('reade_more')) {
            let title = link.parent().parent().prev().prev().text().toLowerCase();
            let type = getType(title);
            let page_link = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`mrmovie/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title, type);
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    if (save_link.length > 0) {
                        if (type === "serial") {
                            await save(title, page_link, save_link, persian_summary, poster, [], 'serial');
                        } else {
                            save_link = remove_duplicate(save_link);
                            if (save_link.length > 0) {
                                await save(title, page_link, save_link, persian_summary, poster, [], 'movie');
                            }
                        }
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
        let paragraphs = $('p');
        for (let i = 0; i < paragraphs.length; i++) {
            let temp = $(paragraphs[i]).text();
            if (temp && temp.includes('ستارگان:'))
                return $(paragraphs[i]).next().text().trim();
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
            let src = imgs[i].attribs['data-src'];
            let parent = imgs[i].parent.name;
            if (parent === 'p' && $(imgs[i]).hasClass('size-full')) {
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
    //'480p.WEB-DL.RMT - 80MB'  //'720p.x265.WEB-DL.RMT - 129MB'
    //'1080p.x265.WEB-DL.10bit.RARBG - 1.43GB' //'1080p.WEB-DL.RARBG - 1.76GB'
    try {
        let text_array, dolby_vision = '', fps60 = '', uhd = '';
        let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
        if (parent[0].name !== 'p') {
            parent = $(parent).parent();
        }
        if (type === 'serial') {
            text_array = get_serial_textArray($, link, parent);
            if (text_array === 'ignore') {
                return text_array;
            }
        } else {
            let text = $(parent).prev().text().split(' ').filter((t) => t && !persianRex.hasLetter.test(t)).join(' ');
            if (text.length === 0) {
                return 'ignore';
            }
            const __ret = get_movie_textArray(text, dolby_vision, $, parent, fps60);
            dolby_vision = __ret.dolby_vision;
            text_array = __ret.text_array;
            fps60 = __ret.fps60;
            uhd = text_array.filter(value => value.toLowerCase() === 'uhd') ? 'UHD' : '';
        }
        if (text_array.length === 1)
            return '';
        let {quality, x265, bit10, bit12, size, encoder} = extracted(text_array);
        let info = [quality, x265, bit10, bit12, dolby_vision, fps60, uhd, text_array[1], encoder].filter(value => value !== '').join('.');
        return [info, size].filter(value => value !== '').join(' - ');
    } catch (error) {
        saveError(error);
        return "";
    }
}

function get_serial_textArray($, link, parent) {
    let episode = $(link).text().split(' ').filter((text) => text && text !== '|' && !persianRex.hasLetter.test(text));
    if (episode.length === 0) {
        return 'ignore';
    }

    let prev = $(parent).prev();
    for (let i = 1; i < 11; i++) {
        let text = $(prev).text();
        if (text.includes('/')) {
            return text.replace(/\s/g, '').split('/');
        }
        prev = $(prev).prev();
    }
    return [''];
}

function get_movie_textArray(text, dolby_vision, $, parent, fps60) {
    let text_array;
    if (text.toLowerCase().includes('dolby vision')) {
        dolby_vision = 'dolby_vision';
        text_array = $(parent).prev().prev().text().replace(/\s/g, '').split('/');
    } else if (text.toLowerCase().replace(/\s/g, '').includes('fps:60')) {
        fps60 = 'FPS:60';
        text_array = $(parent).prev().prev().text().replace(/\s/g, '').split('/');
    } else {
        text_array = (text === '')
            ? $(parent).prev().prev().text().replace(/\s/g, '').split('/')
            : text.replace(/\s/g, '').split('/');
    }
    return {dolby_vision, text_array, fps60};
}

function extracted(text_array) {
    let quality = text_array[0].toLowerCase().replace('fullhd1080p', '1080p.full.hd');
    let x265 = (text_array[3] === 'x265') ? 'x265' : '';
    let bit10 = (text_array[4] === '10bit') ? '10bit' : '';
    let bit12 = (text_array[4] === '12bit') ? '12bit' : '';
    let size = text_array.pop();
    let encoder = text_array.pop();
    return {quality, x265, bit10, bit12, size, encoder};
}

function remove_duplicate(input) {
    let result = [];
    let indexes = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < input.length; j++) {
            if (input[i].link === input[j].link && i !== j) {
                exist = true;
                if (!indexes.includes(i) && !indexes.includes(j)) {
                    if (input[i].info !== '') {
                        result.push(input[i]);
                        indexes.push(i);
                    } else {
                        result.push(input[j]);
                        indexes.push(j);
                    }
                }
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}
