const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');

module.exports = async function valamovie({movie_url, serial_url, page_count, serial_page_count}) {

    await wrapper_module(serial_url, serial_page_count, search_title_serial);
    await wrapper_module(movie_url, page_count, search_title_movie);
}

async function search_title_serial(link, i) {
    if (link.hasClass('product-title')) {
        let title = link.text();
        let page_link = link.attr('href');
        console.log(`valamovie/serial/${i}/${title}  ========>  `);
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
    let title = link.attr('title');
    if (title && title.includes('دانلود') && title.toLowerCase() === link.text().toLowerCase()) {
        let page_link = link.attr('href');
        console.log(`valamovie/movie/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title.toLowerCase(), 'movie');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'movie',
                get_file_size, get_persian_plot);
            if (save_link.length > 0) {
                await save(title_array, page_link, save_link, persian_plot, 'movie');
            }
        }
    }
}

function get_persian_plot($) {
    let paragraphs = $('p');
    for (let i = 0; i < paragraphs.length; i++) {
        if ($(paragraphs[i]).text().includes('خلاصه داستان:')) {
            let temp = $($(paragraphs[i]).children()[0]).text();
            return $(paragraphs[i]).text().replace(temp, '').trim();
        }
    }
}

function get_file_size($, link, mode) {
    //'1080p.WEB-DL - 750MB' //'720p.x265.WEB-DL - 230MB'
    //'1080p.BluRay.RARBG - 2.01GB' //'1080p.x265.BluRay.RMTeam - 1.17GB'
    //'1080p.BluRay.dubbed - 1.77GB'
    try {
        if (mode === 'serial') {
            let text_array = $(link).parent().parent().parent().parent().prev().text().trim().split('/');
            let quality, dubbed, temp;
            if (text_array.length === 1) {
                quality = $(link).text().split(/[\s-]/g).filter((text) => !persianRex.hasLetter.test(text) && text !== '' && isNaN(text));
                if (quality[0] === 'X265')
                    quality[0] = '720p.x265';
                return quality.join('.');
            } else if (text_array.length === 2) {
                return serial_text_length_2(text_array, $, link);
            } else if (text_array.length === 3) {
                let result = serial_length_3(text_array, $, link, 1, 2);
                quality = result.quality;
                dubbed = result.dubbed;
                temp = result.temp;
            } else {
                let result = serial_length_3(text_array, $, link, 2, 3);
                quality = result.quality;
                dubbed = result.dubbed;
                temp = result.temp;
            }
            let size = (dubbed) ? '' : ' - ' + temp.replace(/\s/g, '');
            return [quality[1], ...quality.slice(2), quality[0], dubbed].filter(value => value !== '').join('.') + size;
        }

        let prevNodeChildren = $(link).parent().parent().parent().prev().children().children();
        let dubbed = ($(link).attr('href').toLowerCase().includes('farsi.dub')) ? 'dubbed' : '';
        let quality = $(prevNodeChildren[0]).text().trim().split(' ');
        let encoder = (!dubbed) ? $(prevNodeChildren[1]).text()
            .replace('انکودر: ', '').replace('Encoder: ', '').trim() : '';
        let text = [quality[1], ...quality.slice(2), quality[0], encoder, dubbed].filter(value => value !== '').join('.');
        let size_text = (!dubbed) ? $(prevNodeChildren[2]).text() : $(prevNodeChildren[1]).text();
        let size = size_text.replace('Size:', '').replace(/\s/g, '');
        return [text, size].filter(value => value !== '').join(' - ');

    } catch (error) {
        console.error(error);
        return "";
    }
}

function serial_text_length_2(text_array, $, link) {
    let quality = text_array[1].replace('کیفیت :', '').trim().split(' ');
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split(/[_.]/g);
    let x265 = link_href_array.filter(value => value.toLowerCase() === 'x265');
    x265 = (x265.length > 0) ? x265[0] : '';
    if (quality.length === 1) {
        let season_episode = link_href.match(/S\d\dE\d\d/g)[0];
        let index = link_href_array.indexOf(season_episode);
        return [link_href_array[index + 1], x265, quality[0]].filter(value => value !== '').join('.');
    } else {
        return [quality[1], x265, ...quality.slice(2), quality[0]].filter(value => value !== '').join('.')
    }
}

function serial_length_3(text_array, $, link,qualityIndex,dubbedIndex) {
    let quality = text_array[qualityIndex].replace('کیفیت :', '').trim().split(' ');
    let dubbed = (text_array[dubbedIndex].includes('دوبله فارسی') || $(link).attr('href').toLowerCase().includes('farsi.dub')) ? 'dubbed' : '';
    let temp = text_array[dubbedIndex].replace('میانگین حجم:', '').replace('مگابایت', 'MB');
    return {quality, dubbed, temp};
}