import {save_error} from "../../save_logs";
const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes_db');

module.exports = async function salamdl({movie_url, page_count}) {

    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    let rel = link.attr('rel');
    if (rel && rel === 'bookmark') {
        let title = link.text().toLowerCase();
        let mode = ((title.includes('فیلم') || title.includes('انیمیشن')) && !title.includes('سریال')) ? 'movie' : 'serial';
        let page_link = link.attr('href');
        // console.log(`salamdl/${mode}/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, mode);
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, mode,
                get_file_size, get_persian_plot);
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
    let paragraphs = $('p');
    for (let i = 0; i < paragraphs.length; i++) {
        let temp = $(paragraphs[i]).text();
        if (temp && temp.includes('خلاصه داستان'))
            return temp.replace('خلاصه داستان :', '').trim();
    }
}

function get_file_size($, link, mode) {
    //'720p.x265.WEB-DL - 200MB'    //'480p.WEB-DL - 150MB'
    //'720p.WEB-DL.YTS - 848.85MB'  //'720p.WEB-DL.SalamDL - 671.52MB'
    //'1080p.x265.10bit.WEB-DL.PSA - 1.98GB'
    try {
        if (mode === 'serial') {
            let prevNodeChildren = $(link).parent().parent().parent().prev().children();
            let text_array = $(prevNodeChildren[3]).text().split(' ');
            let info = [text_array[1], ...text_array.slice(2), text_array[0]].filter(value => value !== '').join('.');
            let size = $(prevNodeChildren[5]).text().replace(' مگابایت', 'MB');
            return [info, size].filter(value => value !== '').join(' - ');
        }

        let text_array = $(link).text().split('|');
        let quality = text_array[0].replace('دانلود با کیفیت ', '').split(' ');
        let encoder = text_array[1].replace('انکودر:', '').replace(/\s/g, '');
        let size = (text_array[2]) ?
            text_array[2].replace(' حجم: ', '')
                .replace('مگابایت', 'MB')
                .replace('گیگابایت', 'GB')
                .replace(/\s/g, '') : '';
        let info = [quality[1], ...quality.slice(2), quality[0], encoder].filter(value => value !== '').join('.');
        return [info, size].filter(value => value !== '').join(' - ');
    } catch (error) {
        error.massage = "module: salamdl.js >> get_file_size ";
        error.inputData = $(link).attr('href');
        error.time = new Date();
        save_error(error);
        return "";
    }
}
