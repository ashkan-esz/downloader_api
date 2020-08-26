const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes');
const persianRex = require('persian-rex');

module.exports = async function hiva({movie_url, serial_url, page_count, serial_page_count}) {

    await wrapper_module(serial_url, serial_page_count, search_title);
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    if (link.hasClass('reade_more')) {
        let title = link.parent().parent().prev().prev().text().toLowerCase();
        let mode = ((title.includes('فیلم') || title.includes('انیمیشن')) && !title.includes('سریال')) ? 'movie' : 'serial';
        let page_link = link.attr('href');
        console.log(`mrmovie/${mode}/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, mode);
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, mode,
                get_file_size, get_persian_plot, false);
            if (save_link.length > 0) {
                if (mode === "serial") {
                    let result = sort_links(save_link);
                    if (result.length > 0)
                        save(title_array, page_link, result, persian_plot, 'serial')
                } else {
                    save(title_array, page_link, save_link, persian_plot, 'movie')
                }
            }
        }
    }
}

function get_persian_plot($) {
    let paragraphs = $('p');
    for (let i = 0; i < paragraphs.length; i++) {
        let temp = $(paragraphs[i]).text();
        if (temp && temp.includes('ستارگان:'))
            return $(paragraphs[i]).next().text().trim();
    }
}

function get_file_size($, link, mode) {
    //'480p.WEB-DL.RMT - 80MB'
    //'720p.x265.WEB-DL.RMT - 129MB'
    //'720p.x265.WEBRip.10bit.PSA - 240MB'
    //'1080p.WEB-DL.RARBG - 1.76GB'
    //'1080p.x265.WEB-DL.10bit.RARBG - 1.43GB'
    //'720p.x265.WEB-DL.PSA - 632MB'
    let text_array;
    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    if (mode === 'serial') {
        let episode = $(link).text().split(' ').filter((text) => !persianRex.hasLetter.test(text) && text !== '');
        let number = Math.floor((Number(episode) - 1) / 3) + 1;
        let prev = $(parent).prev();
        for (let i = 1; i < number; i++) {
            prev = $(prev).prev();
        }
        text_array = $(prev).text().replace(/\s/g, '').split('/');
    } else text_array = $(parent).prev().text().replace(/\s/g, '').split('/');


    if (text_array.length === 1)
        return '';
    let x265 = (text_array[3] === 'x265') ? 'x265' : '';
    let bit10 = (text_array[4] === '10bit') ? '10bit' : '';
    let size = text_array.pop();
    let encoder = text_array.pop();
    return [text_array[0], x265, text_array[1], bit10, encoder].filter(value => value !== '').join('.') + ' - ' + size;
}
