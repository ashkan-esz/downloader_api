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
            if (title.toLowerCase().includes('قسمت های سینمایی') && !type.includes('anime')) {
                type = 'anime_' + type;
            }
            title = purgeTitle(title.toLowerCase(), type);
            if (title.toLowerCase().includes('ova') && !type.includes('anime')) {
                type = 'anime_' + type;
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size, null,
                    extraSearch_match, extraSearch_getFileSize);
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
        : $($(link).parent().parent().parent().parent().prev().children()[0]).children();

    let linkHref = $(link).attr('href').toLowerCase();
    let infoText = replacePersianNumbers($(infoNodeChildren[1]).text());
    infoText = purgeQualityText(infoText).replace('قسمت ', '');
    let linkText = infoText;
    if (infoText.match(/^\d+$/g) || infoText.match(/\d+و\d+/g)) {
        infoNodeChildren = $($(link).parent().parent().parent().parent().prev().children()[0]).children();
        infoText = replacePersianNumbers($(infoNodeChildren[1]).text());
        infoText = purgeQualityText(infoText);
    }

    let seasonEpisode, ova;
    if (persianRex.hasLetter.test(infoText)) {
        let seasonNumber = persianWordToNumber(infoText);
        if (linkText.match(/\d+و\d+/g)) {
            let episodes = linkText.split('و');
            seasonEpisode = 'S' + seasonNumber + 'E' + episodes[0] + '-' + episodes[1];
        } else {
            let episodeNumber = decodeURIComponent(linkHref).match(/\[\d+(\.\d)*]|e\d+(\.\d[^\d])*/g)[0].replace(/[\[\]e]/g, '');
            seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber;
        }
        ova = '';
    } else {
        seasonEpisode = '';
        ova = infoText
            .replace(/#|.x265/g, '')
            .replace(/\s\s/g, ' ')
            .replace(/\s/g, '.')
            .trim();
    }

    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : 'HardSub';
    if (dubbed !== 'dubbed' && infoNodeChildren.length > 4) {
        if (checkDubbed($(infoNodeChildren[4]).text(), '')) {
            dubbed = 'dubbed';
        }
    }
    let quality = purgeQualityText($(infoNodeChildren[2]).text());
    quality = replacePersianNumbers(quality);
    quality = quality.match(/\d\d\d+p/g) ? quality : quality + 'p';
    let temp = $(infoNodeChildren[3]).text().toLowerCase();
    let sizeText = temp.includes('mb') || temp.includes('gb') ? temp : '';
    let size = purgeSizeText(sizeText);
    size = replacePersianNumbers(size);
    let info = [seasonEpisode, ova, quality, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let topBoxText = $(link).parent().parent().parent().parent().prev().text();
    let dubbed = checkDubbed($(link).attr('href'), topBoxText) ? 'dubbed' : 'HardSub';
    let quality = $(infoNodeChildren[1]).text().replace('#', '').replace('.x264', '').trim() + 'p';
    quality = purgeQualityText(quality);
    quality = replacePersianNumbers(quality);
    let sizeText = replacePersianNumbers($(infoNodeChildren[2]).text().toLowerCase());
    let size, extraInfo;
    if (
        sizeText.includes('mb') ||
        sizeText.includes('gb') ||
        sizeText.includes('مگا') ||
        sizeText.includes('گیگا') ||
        sizeText.includes('گیگ')
    ) {
        extraInfo = '';
        size = purgeSizeText(sizeText);
    } else {
        extraInfo = sizeText
            .trim()
            .replace(/#|.x265/g, '')
            .replace(/\s\s\s/g, ' ')
            .replace(/\s\s/g, ' ')
            .replace(/\s/g, '.');
        size = purgeSizeText($(infoNodeChildren[3]).text());
        size = replacePersianNumbers(size);
    }

    let info = [extraInfo, quality, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function extraSearch_match($, link, title) {
    let linkHref = $(link).attr('href');
    let linkTitle = $(link).attr('title');
    let splitLinkHref = linkHref.split('/');
    let lastPart = splitLinkHref.pop();
    if (!lastPart) {
        lastPart = splitLinkHref.pop();
    }
    let infoText = $($($($(link).parent().prev().children()[0])).children()[1]).text();
    infoText = replacePersianNumbers(infoText.trim());

    return (
        (linkTitle === 'لینک دانلود' && !linkHref.includes('.mkv') && !linkHref.includes('.mp4') &&
            lastPart.toLowerCase().includes(title.toLowerCase().replace(/\s/g, '.'))) ||
        (infoText.length < 30 && infoText.includes('دانلود همه قسمت ها')) ||
        (infoText.length < 15 && infoText.includes('دانلود فصل')) ||
        (infoText.length < 30 && infoText.includes('قسمت') && infoText.match(/\s*\d+\s*تا\s*\d+\s*/g))
    );
}

function extraSearch_getFileSize($, link, type, sourceLinkData) {
    try {
        let linkHref = decodeURIComponent($(link).attr('href').toLowerCase());
        if (linkHref.match(/^\.+\/\.*$/g)) {
            return 'ignore';
        }
        let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : 'HardSub';
        let seasonMatch = linkHref.match(/s\d+/g);
        let source$ = sourceLinkData.$;
        let topBoxData = source$(source$(sourceLinkData.link).parent().parent().parent().parent().prev().children()[0]).children();
        let seasonFromTopBox = persianWordToNumber(source$(topBoxData[1]).text());
        let qualityFromTopBox = replacePersianNumbers(purgeQualityText(source$(topBoxData[2]).text()));
        qualityFromTopBox = qualityFromTopBox.match(/\d\d\d+p*/g) ? qualityFromTopBox : '';

        let seasonNumber = seasonMatch ? seasonMatch.pop().replace('s', '') : seasonFromTopBox || 1;
        let episodeNumber = linkHref
            .match(/\[\d+(\.\d*)*]|e\d+(\.\d[^\d])*|[.\-]\s*\d+\s*([.\[])\s*\d\d\d+p*([.\]])/gi)[0]
            .replace(/^\[|[^\d\s]\[|[\]e\s\-]|^\./g, '')
            .split(/[.[]/g);

        let seasonEpisode;
        if (episodeNumber.length === 2 && Number(episodeNumber[0]) + 1 === Number(episodeNumber[1])) {
            seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber[0] + '-' + episodeNumber[1];
        } else {
            seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber[0];
        }

        let matchQuality = linkHref.match(/\[*\d\d\d+p*(\.|]|nineanime)/gi);
        let quality = matchQuality ? matchQuality.pop().replace(/[.\[\]]|nineanime/gi, '') : qualityFromTopBox;
        quality = quality.includes('p') ? quality : quality !== '' ? quality + 'p' : '';
        return [seasonEpisode, quality, dubbed].filter(value => value).join('.');
    } catch (error) {
        saveError(error);
        return '';
    }
}
