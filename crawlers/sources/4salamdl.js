const {search_in_title_page, wrapper_module} = require('../searchTools');
const {purgeTitle, getType, purgeQualityText, purgeSizeText} = require('../utils');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../saveError");


module.exports = async function salamdl({movie_url, page_count}) {
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let rel = link.attr('rel');
        if (rel && rel === 'bookmark') {
            let title = link.text().toLowerCase();
            let type = getType(title);
            let page_link = link.attr('href');
            if (process.env.NODE_ENV === 'dev') {
                console.log(`salamdl/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title, type);
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2, subtitles} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    await save(title, page_link, save_link, persian_summary, poster, trailers, [], subtitles, type);
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
            if (temp && temp.includes('خلاصه داستان'))
                return temp.replace('خلاصه داستان :', '').trim();
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
            let src = imgs[i].attribs.src;
            let parent = imgs[i].parent.name;
            if (parent === 'a') {
                return src;
            }
        }
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let parent = imgs[i].parent.name;
            if (parent === 'p') {
                return src;
            }
        }
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let parent = imgs[i].parent.name;
            if (parent === 'div') {
                return src;
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getTrailers($) {
    try {
        let result = [];
        let a = $('a');
        for (let i = 0; i < a.length; i++) {
            let href = $(a[i]).attr('href');
            if (href && href.toLowerCase().includes('trailer')) {
                if (href.includes('.mp4') || href.includes('.mkv')) {
                    let quality = href.includes('360p') ? '360p' : '720p';
                    result.push({
                        link: href,
                        info: 'salamdl-' + quality
                    });
                }
            }
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function get_file_size($, link, type) {
    //'720p.x265.WEB-DL - 200MB'    //'480p.WEB-DL - 150MB'
    //'720p.WEB-DL.YTS - 848.85MB'  //'1080p.x265.10bit.WEB-DL.PSA - 1.98GB'
    let text_array = [];
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }

        let text = $(link).text();
        let dubbed = '';
        if (text.includes('(دوبله فارسی)') ||
            text.includes('(دو زبانه)') ||
            $(link).attr('href').toLowerCase().includes('farsi')) {
            dubbed = 'dubbed';
            text = text.replace('(دوبله فارسی)', '').replace('(دو زبانه)', '');
        }
        text_array = text.split('|');

        if (text.includes('لینک مستقیم')) {
            return get_file_size_extraLink($, link);
        }
        return get_movie_size_info(text_array, dubbed);
    } catch (error) {
        try {
            return checkTrailer_year($, link, text_array);
        } catch (error2) {
            saveError(error2);
            return "";
        }
    }
}

function get_file_size_serial($, link) {
    let prevNodeChildren = $(link).parent().parent().parent().prev().children();
    let text_array = purgeQualityText($(prevNodeChildren[3]).text()).split(' ');
    let bit10 = $(link).attr('href').toLowerCase().includes('10bit') ? '10bit' : '';
    let size = purgeSizeText($(prevNodeChildren[5]).text());
    let filtered_text_array = text_array.filter(value => value && !persianRex.hasLetter.test(value));
    if (filtered_text_array.length === 0) {
        let link_href = $(link).attr('href').toLowerCase().replace(/[/_\s]/g, '.');
        let link_href_array = link_href.split('.');
        let seasonEpisode_match = link_href.match(/s\d\de\d\d/g);
        if (seasonEpisode_match) {
            let seasonEpisode = seasonEpisode_match.pop();
            let index = link_href_array.indexOf(seasonEpisode);
            let array = link_href_array.slice(index + 1);
            array.pop();
            return purgeQualityText(array.join('.'));
        } else {
            return '';
        }
    }
    if (text_array.length === 1 && text_array[0] === '') {
        text_array = $(link).parent().prev().text().replace('Web-DL', 'WEB-DL').split(' ');
        if ($(link).parent().text().includes('|') ||
            (text_array.length === 1 && text_array[0] === '')) {
            let text = $(link).text();
            size = '';
            if (text.includes('دانلود قسمت')) {
                text_array = ['480p'];
            } else {
                text_array = ['720p'];
            }
        }
    }
    let info = [text_array[1], ...text_array.slice(2), bit10, text_array[0]].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_movie_size_info(text_array, dubbed) {
    let encoder = '';
    let encoder_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('انکدر') || text_array[1].includes('انکودر')) ? 1 : '';
    if (encoder_index) {
        encoder = text_array[encoder_index]
            .replace('انکدر', '')
            .replace('انکودر', '')
            .split(' ')
            .filter(value =>
                value && !persianRex.hasLetter.test(value) &&
                isNaN(value) && value !== 'GB' && value !== 'MB')
            .join('')
            .replace(/[\s:]/g, '');
    }

    let size = '';
    let size_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('حجم')) ? 1 :
            (text_array[2]) ? 2 : '';
    if (size_index) {
        size = text_array[size_index].replace('حجم', '')
            .replace('مگابایت', 'MB')
            .replace('گیگابایت', 'GB')
            .replace(/:/g, '')
            .split(' ')
            .filter(value => value && !persianRex.hasLetter.test(value))
            .join('')
            .replace(encoder, '')
            .replace(/\s/g, '');
    }


    let quality = purgeQualityText(text_array[0]);
    if (quality.includes('دانلود نسخه سه بعد')) {
        let info = ['3D', dubbed].filter(value => value).join('.')
        return [info, size].filter(value => value).join(' - ');
    }
    quality = quality.split(' ').filter(value => value && !persianRex.hasLetter.test(value));
    if (quality.length === 1 && quality[0] === '--') {
        quality[0] = 'unknown';
    }

    let info = (quality[0].match(/\d\d\d+p/g)) ?
        [quality[0], ...quality.slice(2), quality[1], encoder, dubbed].filter(value => value).join('.') :
        [quality[1], ...quality.slice(2), quality[0], encoder, dubbed].filter(value => value).join('.');

    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_extraLink($, link) {
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let quality_match = link_href.match(/\d\d\d+p/g);
    if (quality_match) {
        let quality = quality_match.pop();
        let quality_index = link_href_array.indexOf(quality);
        let text_array = link_href_array.slice(quality_index, quality_index + 4);
        if (text_array[2] === 'x265') {
            text_array = [text_array[0], text_array[2], text_array[1], text_array[3]]
        }
        return purgeQualityText(text_array.join('.'));
    } else {
        let year_match = link_href.match(/\d\d\d\d/g);
        if (year_match) {
            let year = year_match.pop();
            let year_index = link_href_array.indexOf(year);
            return link_href_array[year_index + 1];
        } else {
            return '';
        }
    }
}

function checkTrailer_year($, link, text_array) {
    if (text_array[0].includes('دانلود تریلر') || text_array[0].includes('دانلود تیزر')) {
        return 'trailer';
    }
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let year_match = link_href.match(/\d\d\d\d/g);
    if (year_match) {
        let year = year_match.pop();
        let year_index = link_href_array.indexOf(year);
        let result = link_href_array.slice(year_index + 1);
        result.pop();
        return purgeQualityText(result.join('.'));
    } else {
        return '';
    }
}
