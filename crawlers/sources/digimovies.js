import {save_error} from "../../save_logs";
const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');

module.exports = async function digimovies({movie_url, serial_url, page_count, serial_page_count}) {
    await Promise.all([
        wrapper_module(serial_url, serial_page_count, search_title_serial),
        wrapper_module(movie_url, page_count, search_title_movie)
    ]);
}

async function search_title_serial(link, i) {
    let title = link.attr('title');
    if (title && title.includes('دانلود') && link.children()[0].name !== 'img') {
        let page_link = link.attr('href');
        // console.log(`digimovies/serial/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title.toLowerCase(), 'serial');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'serial',
                get_file_size, get_persian_plot);
            if (save_link.length > 0) {
                let result = sort_links(save_link);
                if (result.length > 0)
                    await save(title_array, page_link, result, persian_plot, 'serial');
            }
        }
    }
}

async function search_title_movie(link, i) {
    let text = link.text();
    if (text && text === 'ادامه مطلب') {
        let title = link.attr('title').toLowerCase();
        let page_link = link.attr('href');
        // console.log(`digimovies/movie/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, 'movie');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'movie',
                get_file_size, get_persian_plot);
            save_link = remove_duplicate(save_link);
            if (save_link.length > 0) {
                await save(title_array, page_link, save_link, persian_plot, 'movie');
            }
        }
    }
}

function get_persian_plot($) {
    let divs = $('div');
    for (let i = 0; i < divs.length; i++) {
        if ($(divs[i]).hasClass('panel'))
            return $(divs[i]).text().trim();
    }
}

function get_file_size($, link, mode) {
    //'1080p.HDTV.dubbed - 550MB'  //'1080p.WEB-DL.SoftSub - 600MB'
    //'720p.x265.WEB-DL.SoftSub - 250MB' //'1080p.WEB-DL.SoftSub - 1.82GB'
    try {
        if (mode === 'serial') {
            let text_array = $(link).parent().parent().parent().parent().prev().text().split('|');
            let dubbed, size, quality;
            if (text_array.length === 1) {
                let MB_GB = text_array[0].includes('مگابایت') ? 'MB' : text_array[0].includes('گیگابایت') ? 'GB' : '';
                text_array = text_array[0].split(/\s|:/g).filter((text) => !persianRex.hasLetter.test(text) && text !== '');
                text_array.shift();
                let size = text_array.pop() + MB_GB;
                return text_array.join('.').trim() + ' - ' + size;
            } else if (text_array.length === 3) {
                dubbed = (text_array[2].includes('زبان : فارسی')) ? 'dubbed' : '';
                let temp = text_array[2].replace(/:/g, '').split(' ')
                size = temp.filter((text) => !persianRex.hasLetter.test(text) && !isNaN(text)).pop() + 'MB';
                quality = temp.filter((text) => !persianRex.hasLetter.test(text) && isNaN(text)).join('.')
            } else {
                quality = text_array[2].replace(/:/g, '')
                    .replace('کیفیت', '')
                    .trim().replace(/\s/g, '.');
                dubbed = (text_array[3].includes('زبان : فارسی')) ? 'dubbed' : '';
                size = (text_array[3].includes('زبان : فارسی')) ? text_array[4] : text_array[3];
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

        let prevNodeChildren = $(link).parent().parent().prev().children();
        let dubbed = ($(link).attr('href').toLowerCase().includes('farsi.dub')) ? 'dubbed' : '';
        let quality_text = $(prevNodeChildren[0]).text();
        if (quality_text.includes('کیفیت')){
            let quality = quality_text.replace('کیفیت :', '').trim().replace(/\s/g, '.');
            let info = [quality, dubbed].filter(value => value !== '').join('.');
            let size_text = $(prevNodeChildren[1]).text();
            let size = (size_text.includes('حجم')) ?
                size_text.replace('حجم :', '').replace(' ', '') : '';
            return [info, size].filter(value => value !== '').join(' - ');
        } else {
            let link_href = $(link).attr('href').toLowerCase();
            let link_href_array = link_href.split(/[._]/g);
            let case1 = link_href.match(/\d\d\d\dp/g);
            let case2 = link_href.match(/\d\d\dp/g);
            let link_quality = case1 ? case1.pop() : (case2 ? case2.pop() : '');
            let index = link_href_array.indexOf(link_quality);

            let quality = link_href_array.slice(index, index + 2).join('.');
            let info = [quality, dubbed].filter(value => value !== '').join('.');
            let size_text = $(prevNodeChildren[0]).text();
            let size = (size_text.includes('حجم')) ?
                size_text.replace('حجم :', '').replace(' ', '') : '';
            return [info, size].filter(value => value !== '').join(' - ');
        }
    } catch (error) {
        error.massage = "module: digimovies.js >> get_file_size ";
        error.inputData = $(link).attr('href');
        error.time = new Date();
        save_error(error);
        return '';
    }
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
