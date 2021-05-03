const {search_in_title_page, wrapper_module} = require('../searchTools');
const {remove_persian_words, replacePersianNumbers, getType} = require('../utils');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');
const {saveError} = require("../../saveError");


module.exports = async function film2movie({movie_url, page_count}) {
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
                console.log(`film2movie/${type}/${i}/${title}  ========>  `);
            }
            let title_array = remove_persian_words(title, type);
            if (title_array.length > 0) {
                let pageSearchResult = await search_in_title_page(title_array, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    if (save_link.length > 0) {
                        await save(title_array, page_link, save_link, persian_summary, poster, trailers, [], type);
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
        let div = $('div');
        for (let i = 0; i < div.length; i++) {
            let temp = $(div[i]).text();
            if (temp && temp === 'خلاصه داستان :')
                return $(div[i]).next().text().trim();
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
            let id = $(imgs[i]).attr('id');
            if (id && id === 'myimg') {
                return src;
            }
        }
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let alt = imgs[i].attribs.alt;
            if (src.includes('.jpg') && alt.includes('دانلود')) {
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
                    let quality = href.includes('1080p') ? '1080p'
                        : (href.includes('720p') || href.toLowerCase().includes('hd')) ? '720p' : '360p';
                    result.push({
                        link: href,
                        info: 'film2movie-' + quality
                    });
                }
            }
        }

        let unique = [];
        for (let i = 0; i < result.length; i++) {
            let exist = false;
            for (let j = 0; j < unique.length; j++) {
                if (result[i].link === unique[j].link) {
                    exist = true;
                    break;
                }
            }
            if (!exist) {
                unique.push(result[i]);
            }
        }
        return unique;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function get_file_size($, link, type) {
    //'1080p.HardSub'  //'720p.BluRay.F2M.dubbed.Censored'
    //'480p.BluRay.F2M.HardSub.Censored'  //'720p.BluRay.F2M.Censored'
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link)
    } catch (error) {
        saveError(error);
        return "";
    }
}

function get_file_size_serial($, link) {
    let text = $(link).parent().text().replace(/[:_|]/g, '');
    text = replacePersianNumbers(text);
    let family = (text.includes('Family')) ? 'Family' : '';
    let text_array = text.split(' ').filter((text) =>
        !persianRex.hasLetter.test(text) && text !== '' && text !== 'Family');
    text_array.shift();
    let link_href = $(link).attr('href').toLowerCase();
    let HardSub = (text.includes('هاردساب فارسی') || link_href.includes('subfa')) ? 'HardSub' : '';
    let dubbed = (text.includes('دوبله فارسی') ||
        link_href.includes('farsi.dub') ||
        link_href.includes('dubbed')) ? 'dubbed' : '';
    return [...text_array, HardSub, dubbed, family].filter(value => value !== '').join('.');
}

function get_file_size_movie($, link) {
    let parent = ($(link).parent()[0].name === 'p') ? $(link).parent() : $(link).parent().parent();
    let text = $(parent).prev().text();
    text = replacePersianNumbers(text);
    let link_href = $(link).attr('href').toLowerCase();
    let HardSub = (link_href.includes('subfa')) ? 'HardSub' : '';
    let dubbed = (link_href.includes('farsi.dub') || link_href.includes('dubbed')) ? 'dubbed' : '';
    let Censored = ($(link).next().text().toLowerCase().includes('family') || dubbed || HardSub) ? 'Censored' : '';
    let text_array = text.replace(/[()]/g, '').split(' ')
        .filter((text) => text && !persianRex.hasLetter.test(text));
    if (text_array.length === 1) {
        if (link_href.includes('3d')) {
            return '3D';
        }
        if (link_href.includes('dvdrip')) {
            return 'DVDrip';
        }
        let case1 = link_href.match(/\d\d\d\dp|\d\d\dp/g);
        let quality = case1 ? case1[0] : null;
        if (quality === null) {
            return text_array[0];
        }
        let link_href_array = link_href.split('.');
        let index = link_href_array.indexOf(quality);
        return [link_href_array[index], link_href_array[index + 2], link_href_array[index + 1], dubbed, HardSub, Censored].filter(value => value).join('.');
    } else if (text_array.length === 2) {
        if (text_array[1].match(/\d\d\d\dp|\d\d\dp/g)) {
            return [text_array[1], text_array[0], dubbed, HardSub, Censored].filter(value => value).join('.');
        }
        return [...text_array, dubbed, HardSub, Censored].filter(value => value).join('.');
    }
    if (text_array[2].match(/\d\d\d\dp|\d\d\dp/g) && text_array[0] === 'x265') {
        return [text_array[2], text_array[0], text_array[1], ...text_array.slice(3), HardSub, dubbed, Censored].filter(value => value !== '').join('.');
    }
    if (text_array[0].match(/\d\d\d\dp|\d\d\dp/g) || text_array[0].toLowerCase() === 'mobile') {
        return [text_array[0], text_array[1], ...text_array.slice(2), HardSub, dubbed, Censored].filter(value => value !== '').join('.');
    }
    return [text_array[1], text_array[0], ...text_array.slice(2), HardSub, dubbed, Censored].filter(value => value !== '').join('.');
}
