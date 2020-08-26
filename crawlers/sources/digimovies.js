const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes');
const persianRex = require('persian-rex');

module.exports = async function digimovies({movie_url, serial_url, page_count, serial_page_count}) {

    await wrapper_module(serial_url, serial_page_count, search_title_serial);
    await wrapper_module(movie_url, page_count, search_title_movie);
}

async function search_title_serial(link, i) {
    let title = link.attr('title');
    if (title && title.includes('دانلود') && link.children()[0].name !== 'img') {
        let page_link = link.attr('href');
        console.log(`digimovies/serial/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title.toLowerCase(), 'serial');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'serial',
                get_file_size, get_persian_plot);
            if (save_link.length > 0) {
                let result = sort_links(save_link);
                if (result.length > 0)
                    save(title_array, page_link, result, persian_plot, 'serial')
            }
        }
    }
}

async function search_title_movie(link, i) {
    let text = link.text();
    if (text && text === 'ادامه مطلب') {
        let title = link.attr('title').toLowerCase();
        let page_link = link.attr('href');
        console.log(`digimovies/movie/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, 'movie');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'movie',
                get_file_size, get_persian_plot);
            if (save_link.length > 0) {
                save(title_array, page_link, save_link, persian_plot, 'movie')
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
    //'1080p.HDTV.dubbed - 550MB'
    //'1080p.WEB-DL.SoftSub - 600MB'
    //'720p.x265.WEB-DL.SoftSub - 250MB'
    //'1080p.WEB-DL.SoftSub - 1.82GB'
    //'720p.WEB-DL.HardSub - 882MB'
    try {
        if (mode === 'serial') {
            let text_array = $(link).parent().parent().parent().parent().prev().text().split('|');
            let dubbed, size, quality;
            if (text_array.length === 1) {
                text_array = text_array[0].split(' ').filter((text) => !persianRex.hasLetter.test(text));
                text_array.shift();
                text_array.shift();
                return text_array.join('.').trim();
            } else if (text_array.length === 3) {
                dubbed = (text_array[2].includes('زبان : فارسی')) ? 'dubbed' : '';
                let temp = text_array[2].replace(/:/g, '').split(' ')
                size = temp.filter((text) => !persianRex.hasLetter.test(text) && !isNaN(text)).pop() + 'MB';
                quality = temp.filter((text) => !persianRex.hasLetter.test(text) && isNaN(text)).join('.')
            } else {
                dubbed = (text_array[3].includes('زبان : فارسی')) ? 'dubbed' : '';
                size = (text_array[3].includes('زبان : فارسی')) ? text_array[4] : text_array[3];
                quality = text_array[2].replace(' کیفیت: ', '').trim().replace(/\s/g, '.')
            }

            return [quality, dubbed].filter(value => value !== '').join('.')
                + ' - ' +
                size.replace(' میانگین حجم: ', '')
                    .replace('مشاهده لینک ها', '')
                    .replace(' مگابایت', 'MB')
                    .trim();
        }
        let dubbed = ($(link).attr('href').toLowerCase().includes(('Farsi.Dubbed').toLowerCase())) ? '.dubbed' : '';
        let prevNodeChildren = $(link).parent().parent().prev().children();
        return $(prevNodeChildren[0]).text().replace('کیفیت :', '').replace(/\s/g, '.')
            + dubbed +
            ' - ' +
            $(prevNodeChildren[1]).text().replace('حجم :', '').replace(' ', '');
    } catch (error) {
        return '';
    }
}
