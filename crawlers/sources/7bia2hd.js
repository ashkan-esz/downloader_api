const {search_in_title_page, wrapper_module} = require('../searchTools');
const {remove_persian_words, getType, checkDubbed, checkHardSub, removeDuplicateLinks} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function bia2hd({movie_url, serial_url, page_count, serial_page_count}) {
    await Promise.all([
        wrapper_module(serial_url, serial_page_count, search_title),
        wrapper_module(movie_url, page_count, search_title)
    ]);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let page_link = link.attr('href');
            let type = getType(title);
            if (process.env.NODE_ENV === 'dev') {
                console.log(`bia2hd/${type}/${i}/${title}  ========>  `);
            }
            let title_array = remove_persian_words(title.toLowerCase(), type);
            if (title_array.length > 0) {
                let pageSearchResult = await search_in_title_page(title_array, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    let watchOnlineLinks = getWatchOnlineLinks($2);
                    if (save_link.length > 0) {
                        await save(title_array, page_link, save_link, persian_summary, poster, trailers, watchOnlineLinks, type);
                    }
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function get_persian_summary($) {
    try {
        let $p = $('p');
        for (let i = 0; i < $p.length; i++) {
            if ($($p[i]).text().includes('خلاصه داستان')) {
                return $($p[i]).text().replace('خلاصه داستان:', '').trim();
            }
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
            let parent = imgs[i].parent;
            if (parent.name === 'a') {
                let href = parent.attribs.href;
                if (href.includes('uploads')) {
                    return href;
                }
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
        let $video = $('video');
        for (let i = 0; i < $video.length; i++) {
            let sourceChild = $($video[i]).children()[0];
            if (sourceChild) {
                let src = sourceChild.attribs.src;
                result.push({
                    link: src,
                    info: 'bia2hd-720p'
                });
            }
        }

        result = removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getWatchOnlineLinks($) {
    try {
        let result = [];
        let a = $('a');
        for (let i = 0; i < a.length; i++) {
            let text = $(a[i]).text();
            if (text && text.toLowerCase().includes('پخش آنلاین')) {
                let href = $(a[i]).attr('href');
                let info = get_file_size_movie($, a[i]);
                let quality = info.includes('1080') ? '1080p' : info.includes('720') ? '720p' : '480p';
                result.push({
                    link: href,
                    info: 'bia2hd-' + quality,
                });
            }
        }

        result = removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function get_file_size($, link, type) {
    // '720p.x265 - 249.5MB'  // '720p.x265.dubbed - 249.5MB'
    // '1080p.x265.YIFY - 1.6GB'  // '1080p.x265.YIFY - 1.6GB'
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_file_size_serial($, link) {
    let infoNodeChildren = $($(link).parent().parent().parent().prev().children()[0]).children();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let quality = $(infoNodeChildren[1]).text()
        .replace('کیفیت', '').trim()
        .replace(' x264', '')
        .replace(' -', '')
        .replace(/\s/g, '.');
    let qualitySplit = quality.split('.');
    if (qualitySplit.length > 1 &&
        qualitySplit[0] === 'x265' &&
        qualitySplit[1].match(/\d\d\d\dp|\d\d\dp/g)) {
        quality = [qualitySplit[1], qualitySplit[0], ...qualitySplit.slice(2)].filter(value => value).join('.');
    }
    let size = '';
    if ($(link).parent()[0].name === 'div') {
        let sizeInfoNodeChildren = $($(link).parent().prev().children()[0]).children();
        size = $(sizeInfoNodeChildren[1]).text().trim()
            .replace('حجم :', '')
            .replace('میانگین حجم', '')
            .replace('میانگین', '')
            .replace('گیگابایت', 'GB')
            .replace('مگابایت', 'MB')
            .replace(/\s/g, '');
    }

    let info = [quality, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let quality = $(infoNodeChildren[0]).text().replace('#', '').replace('p', 'p.').replace('.x264', '').trim();
    let size = $(infoNodeChildren[1]).text()
        .replace('حجم :', '')
        .replace('میانگین حجم', '')
        .replace('میانگین', '')
        .replace('گیگابایت', 'GB')
        .replace('مگابایت', 'MB')
        .replace(/\s/g, '');
    let encoder = $(infoNodeChildren[2]).text().replace('انکودر :', '').trim();
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}
