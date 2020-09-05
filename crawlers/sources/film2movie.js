const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');

module.exports = async function film2movie({movie_url, page_count}) {

    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    let rel = link.attr('rel');
    if (rel && rel === 'bookmark') {
        let title = link.text().toLowerCase();
        let mode = ((title.includes('فیلم') || title.includes('انیمیشن')) && !title.includes('سریال')) ? 'movie' : 'serial';
        let page_link = link.attr('href');
        console.log(`film2movie/${mode}/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, mode);
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
    let div = $('div');
    for (let i = 0; i < div.length; i++) {
        let temp = $(div[i]).text();
        if (temp && temp === 'خلاصه داستان :')
            return $(div[i]).next().text().trim();
    }
}

function get_file_size($, link, mode) {
    //'۱۰۸۰p.HardSub'
    //'۷۲۰p.dubbed.Family'
    //'720p.BluRay.F2M.dubbed.Family'
    //'720p.BluRay.F2M.Family'
    //'480p.BluRay.F2M.HardSub.Family'
    //'1080p.BluRay.F2M'
    //'480p.BluRay.F2M.HardSub'
    if (mode === 'serial') {
        let text = $(link).parent().text().replace(/[:_|]/g, '');
        let family = (text.includes('Family')) ? 'Family' : '';
        let text_array = text.split(' ').filter((text) =>
            !persianRex.hasLetter.test(text) && text !== '' && text !== 'Family');
        text_array.shift();
        let HardSub = (text.includes('هاردساب فارسی') || $(link).attr('href').includes('SUBFA')) ? 'HardSub' : '';
        let dubbed = (text.includes('دوبله فارسی') || $(link).attr('href').includes('Farsi.Dubbed')) ? 'dubbed' : '';
        return [...text_array, HardSub, dubbed, family].filter(value => value !== '').join('.')
    }

    let text = $(link).parent().parent().prev().text();
    let HardSub = ($(link).attr('href').includes('SUBFA')) ? 'HardSub' : '';
    let dubbed = ($(link).attr('href').includes('Farsi.Dubbed')) ? 'dubbed' : '';
    let family = $(link).next().text();
    let text_array = text.split(' ').filter((text) =>
        !persianRex.hasLetter.test(text) && text !== '');
    return [text_array[1], text_array[0], ...text_array.slice(2), HardSub, dubbed, family].filter(value => value !== '').join('.')
}
