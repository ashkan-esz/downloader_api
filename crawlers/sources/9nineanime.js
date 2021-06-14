const {search_in_title_page, wrapper_module} = require('../searchTools');
const {
    purgeTitle,
    getType,
    checkDubbed,
    replacePersianNumbers,
    purgeQualityText,
    purgeSizeText,
    persianWordToNumber
} = require('../utils');
const persianRex = require('persian-rex');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function nineanime({movie_url, page_count}) {
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let page_link = link.attr('href');

            let type;
            if (title.includes('انیمه')) {
                type = title.includes('سینمایی') ? 'anime_movie' : 'anime_serial';
            } else {
                type = getType(title);
            }

            if (process.env.NODE_ENV === 'dev') {
                console.log(`nineanime/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title.toLowerCase(), type);
            if (title.toLowerCase().includes('ova') && !type.includes('anime')) {
                type = 'anime_' + type;
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    if (save_link.length > 0) {
                        await save(title, page_link, save_link, persian_summary, poster, [], [], type);
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
                return $($p[i]).text().replace('خلاصه داستان', '').trim()
                    .replace('N / A', '');
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
        let $img = $('img');
        for (let i = 0; i < $img.length; i++) {
            let parent = $img[i].parent;
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

function get_file_size($, link, type) {
    // '480p.HardSub - 520MB'  //
    // 'S1E03.480p.HardSub' // S5E08.720p.HardSub
    try {
        if (type.includes('serial')) {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_file_size_serial($, link) {
    let infoNodeChildren = $($(link).parent().prev()).hasClass('download-info')
        ? $($(link).parent().prev().children()[0]).children()
        : $($(link).parent().parent().parent().prev().children()[0]).children();
    let linkHref = $(link).attr('href').toLowerCase();
    let infoText = replacePersianNumbers($(infoNodeChildren[0]).text());
    let seasonEpisode, ova;
    if (persianRex.hasLetter.test(infoText)) {
        let seasonNumber = persianWordToNumber(infoText);
        let episodeNumber = decodeURIComponent(linkHref).match(/\[\d+(\.\d)*]|e\d+(\.\d)*/g)[0].replace(/[\[\]e]/g, '');
        seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber;
        ova = '';
    } else {
        seasonEpisode = '';
        ova = infoText.replace('#', '').replace('.x264', '').trim();
    }
    let hardSub = 'HardSub';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = purgeQualityText($(infoNodeChildren[1]).text());
    quality = replacePersianNumbers(quality);
    quality = quality.match(/\d\d\d\dp|\d\d\dp/g) ? quality : quality + 'p';
    let sizeText = $(infoNodeChildren[2]).text()
        .split(' ')
        .filter(value => value && !persianRex.hasLetter.test(value))
        .join(' ');
    let size = purgeSizeText(sizeText);
    size = replacePersianNumbers(size);
    let info = [seasonEpisode, ova, quality, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let hardSub = 'HardSub';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let quality = $(infoNodeChildren[0]).text().replace('#', '').replace('.x264', '').trim() + 'p';
    quality = replacePersianNumbers(quality);
    let sizeText = $(infoNodeChildren[1]).text();
    let size, extraInfo;
    if (
        sizeText.toLowerCase().includes('mb') ||
        sizeText.toLowerCase().includes('mb') ||
        sizeText.toLowerCase().includes('مگا') ||
        sizeText.toLowerCase().includes('گیگا')
    ) {
        extraInfo = '';
        size = purgeSizeText(sizeText);
    } else {
        extraInfo = replacePersianNumbers(sizeText);
        size = purgeSizeText($(infoNodeChildren[2]).text());
    }
    size = replacePersianNumbers(size);
    let info = [quality, extraInfo, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}
