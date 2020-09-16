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
    let div = $('div');
    for (let i = 0; i < div.length; i++) {
        let temp = $(div[i]).text();
        if (temp && temp === 'خلاصه داستان :')
            return $(div[i]).next().text().trim();
    }
}

function get_file_size($, link, mode) {
    //'۱۰۸۰p.HardSub'  //'۷۲۰p.dubbed.Family'
    //'720p.BluRay.F2M.dubbed.Family' //'720p.BluRay.F2M.Family'
    //'480p.BluRay.F2M.HardSub.Family' //'1080p.BluRay.F2M'
    try {
        if (mode === 'serial') {
            let text = $(link).parent().text().replace(/[:_|]/g, '');
            let family = (text.includes('Family')) ? 'Family' : '';
            let text_array = text.split(' ').filter((text) =>
                !persianRex.hasLetter.test(text) && text !== '' && text !== 'Family');
            text_array.shift();
            let link_href = $(link).attr('href').toLowerCase();
            let HardSub = (text.includes('هاردساب فارسی') || link_href.includes('subfa')) ? 'HardSub' : '';
            let dubbed = (text.includes('دوبله فارسی') || link_href.includes('farsi.dub')) ? 'dubbed' : '';
            return [...text_array, HardSub, dubbed, family].filter(value => value !== '').join('.');
        }
        let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
        let text = $(parent).prev().text();
        let link_href = $(link).attr('href').toLowerCase();
        let HardSub = (link_href.includes('subfa')) ? 'HardSub' : '';
        let dubbed = (link_href.includes('farsi.dub')) ? 'dubbed' : '';
        let family = $(link).next().text();
        family = family.toLowerCase().includes('family') ? family : '';
        let text_array = text.split(' ').filter((text) => !persianRex.hasLetter.test(text) && text !== '');

        if (text_array.length === 1) {
            if (link_href.includes('3d')) {
                return '3D';
            }
            if (link_href.includes('dvdrip')) {
                return 'DVDrip';
            }
            let case1 = link_href.match(/\d\d\d\dp/g);
            let case2 = link_href.match(/\d\d\dp/g);
            let quality = case1 ? case1[0] : (case2 ? case2[0] : "");
            let link_href_array = link_href.split('.');
            let index = link_href_array.indexOf(quality);
            return [link_href_array[index], link_href_array[index + 2], link_href_array[index + 1]].join('.');
        }

        if (text_array[0].match(/\d\d\dp/g) || text_array[0].match(/\d\d\d\dp/g) ||
            persianRex.hasNumber.test(text_array[0]) || text_array[0].toLowerCase() === 'mobile') {
            return [text_array[0], text_array[1], ...text_array.slice(2), HardSub, dubbed, family].filter(value => value !== '').join('.');
        }
        return [text_array[1], text_array[0], ...text_array.slice(2), HardSub, dubbed, family].filter(value => value !== '').join('.');

    } catch (error) {
        console.error(error);
        return "";
    }
}
