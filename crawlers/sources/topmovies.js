const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes');

module.exports = async function topmovies({movie_url, serial_url, page_count, serial_page_count}) {

    await wrapper_module(serial_url, serial_page_count, search_title);
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    let title = link.attr('title');
    if (title && title.includes('دانلود') && link.children().length === 0 &&
        title.toLowerCase().replace(/\s/g, '') === link.text().toLowerCase().replace(/\s/g, '')) {
        let mode = ((title.includes('فیلم') || title.includes('انیمیشن')) && !title.includes('سریال')) ? 'movie' : 'serial';
        let page_link = link.attr('href');
        console.log(`topmovie/${mode}/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title.toLowerCase(), mode);
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
    let divs = $('div');
    for (let i = 0; i < divs.length; i++) {
        if ($(divs[i]).hasClass('summary_text'))
            return $(divs[i]).text().trim();
    }
}

function get_file_size($, link, mode) {
    //'480p.WEBRip.HardSub - 180MB'
    //'720p.HEVC.x265.WEBRip.HardSub - 240MB'
    //'1080p.BluRay.YTS.HardSub - 1.65G'
    //'720p.WEB-DL.HardSub - 802.3M'
    //'1080p.BluRay.YIFY - 1.68G'
    //'720p.WEB-DL.dubbed - 911.9M'
    let HardSub = '';
    let divs = $('div');
    for (let i = 0; i < divs.length; i++) {
        if ($(divs[i]).hasClass('item_dl_title') ||
            $(divs[i]).hasClass('btn_tab_series_dl')) {
            let text = $(divs[i]).text();
            if (text.includes('زیرنویس فارسی چسبیده')) {
                HardSub = 'HardSub';
                break;
            }
        }
    }
    let href = $(link).attr('href');
    let dubbed = (href.includes('Farsi.Dubbed') || href.includes('DUBLE')) ? 'dubbed' : HardSub;
    if (mode === 'serial') {
        let prevNodeChildren = $(link).parent().parent().parent().parent().prev().children();
        let size = $($(prevNodeChildren[1]).children()[0]).text();
        let text_array = $(prevNodeChildren[0]).text()
            .replace('WEB.DL', 'WEB-DL')
            .replace(/\./g, ' ')
            .split(' ').filter(value => value !== '');
        return [text_array[0], ...text_array.slice(2), text_array[1], dubbed].filter(value => value !== '').join('.')
            + ' - ' +
            size.replace(/\s/g, '').replace('میانگینحجم:', '')
    }
    let prevNodeChildren = $(link).parent().parent().prev().children();
    let size = $(prevNodeChildren[0]).text();
    let text_childs = $(prevNodeChildren[1]).children();
    let quality = $(text_childs[0]).text().split(' ');
    let encoder = $(text_childs[2]).text().replace('Encoder:', '').replace(/\s/g, '');
    return [quality[0], ...quality.slice(2), quality[1], encoder, dubbed].filter(value => value !== '').join('.')
        + ' - ' +
        size.replace(/\s/g, '').replace('حجم:', '')
}
