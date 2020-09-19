import {save_error} from "../../save_logs";
const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');

let collection = '';
let save_title = '';

module.exports = async function film2media({movie_url, page_count}) {

    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    let rel = link.attr('rel');
    if (rel && rel === 'bookmark') {
        let title = link.text().toLowerCase();
        let mode = ((title.includes('فیلم') || title.includes('انیمیشن')) && !title.includes('سریال')) ? 'movie' : 'serial';
        let page_link = link.attr('href');
        // console.log(`film2media/${mode}/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, mode);
        save_title = title_array.join('.');
        collection = (page_link.includes('collection')) ? 'collection' : '';
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, mode,
                get_file_size, get_persian_plot, false);
            if (save_link.length > 0) {
                if (mode === "serial") {
                    let result = sort_links(save_link);
                    if (result.length > 0)
                        await save(title_array, page_link, result, persian_plot, 'serial');
                } else {
                    await save(title_array, page_link, save_link, persian_plot, 'movie');
                }
            }
        }
    }
}

function get_persian_plot($) {
    let divs = $('div');
    for (let i = 0; i < divs.length; i++) {
        let temp = $(divs[i]).css('text-align');
        if (temp === 'justify')
            return $(divs[i]).text().trim();
    }
}

function get_file_size($, link, mode) {
    //'480p.WEB-DL'  //'720p.x265.WEB-DL'
    //'1080p.BluRay.dubbed - 1.8GB'  //'1080p.Web-dl - 1.9GB'
    try {
        if (mode === 'serial') {
            let text_array = $(link).text().split(' ').filter((text) => !persianRex.hasLetter.test(text));
            text_array.shift();
            let quality = text_array[0].replace(/[»:«]/g, '');
            let x265 = (text_array.length > 1) ? text_array[1].replace(/[»:«]/g, '') : '';
            let href_array = $(link).attr('href').split('.');
            let release = href_array[href_array.indexOf(quality) + 1];
            let dubbed = ($(link).attr('href').toLowerCase().includes('farsi')) ? 'dubbed' : '';
            return [quality, x265, release, dubbed].filter(value => value !== '').join('.');
        }

        let link_href = $(link).attr('href').toLowerCase();
        if (link_href.includes('extras')) {
            return 'extras';
        } else if (link_href.includes('hdcam')) {
            return 'HDCam';
        }
        let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
        let text = $(parent).prev().text().trim();

        if (persianRex.hasLetter.test(text)) {
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
        }


        let text_array = text.split(' – ');
        let extra = '';
        if (text_array[1] && !text_array[1].includes('MB') && !text_array[1].includes('GB')) {
            extra = text_array[1];
            text_array[1] = "";
        }
        let dubbed = (link_href.includes('farsi') || link_href.includes('dubbed')) ? 'dubbed' : '';
        let year = link_href.replace(/_/g, '.')
            .match(/\.\d\d\d\d\./g)
            .pop().replace(/\./g, '');
        let movie_title = (collection) ? save_title + "." + year : '';
        let quality_release_array = text_array[0].split(' ');
        let release = quality_release_array.shift();
        text_array[0] = [movie_title, ...quality_release_array, release, extra, dubbed]
            .filter(value => value !== '' && !persianRex.hasLetter.test(value)).join('.');
        return text_array.filter(value => value !== '').join(' - ');
    } catch (error) {
        error.massage = "module: film2media.js >> get_file_size ";
        error.inputData = $(link).attr('href');
        error.time = new Date();
        save_error(error);
        return "";
    }
}
