const {search_in_title_page, wrapper_module} = require('../searchTools');
const {
    purgeTitle,
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks,
    purgeQualityText,
    purgeSizeText,
    purgeEncoderText
} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");

//todo : add subtitle link

module.exports = async function bia2hd({movie_url, serial_url, page_count, serial_page_count}) {
    await Promise.all([
        wrapper_module(serial_url, serial_page_count, search_title_serial),
        wrapper_module(movie_url, page_count, search_title_movie)
    ]);
}

async function search_title_serial(link, i) {
    try {
        let title = link.attr('title');
        let page_link = link.attr('href');
        if (title === '' && page_link && page_link.includes('series')) {
            title = link.parent().next().text();
            let type = getType(title);
            if (process.env.NODE_ENV === 'dev') {
                console.log(`mctv/${type}/${i}/${title}  ========>  `);
            }
            let title_array = purgeTitle(title.toLowerCase(), type);
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

async function search_title_movie(link, i) {
    try {
        let title = link.attr('title');
        let text = link.text();
        if (title === '' && text.includes('دانلود')) {
            title = text;
            let page_link = link.attr('href');
            let type = getType(title);
            if (process.env.NODE_ENV === 'dev') {
                console.log(`mctv/${type}/${i}/${title}  ========>  `);
            }
            let title_array = purgeTitle(title.toLowerCase(), type);
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
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('summery_movies')) {
                return $($div[i]).text().replace('خلاصه داستان :', '').trim();
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

function getTrailers($) {
    try {
        let result = [];
        let $video = $('video');
        for (let i = 0; i < $video.length; i++) {
            let sourceChild = $($video[i]).children()[0];
            if (sourceChild) {
                let src = sourceChild.attribs.src;
                if (src.includes('trailer')) {
                    result.push({
                        link: src,
                        info: 'mctv-720p'
                    });
                }
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
    //'720p.x265.WEB-DL.PSA - 873MB' //'720p.BluRay.YIFI - 944MB'
    //'720p.x265.WEB-DL - 100MB'  //'1080p.x265.10bit.WEB-DL - 250MB'
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
    let infoNodeChildren = $(link).parent().parent().parent().prev().children();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let qualityEncode = $(infoNodeChildren[0]).text().trim()
        .replace('WEB-DL - HDTV', 'WEB-DL')
        .split(' - ');
    let qualityText = purgeQualityText(qualityEncode[0].replace('.', '')).split(' ');
    let quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
    quality = quality.replace('10bit.x265', 'x265.10bit');
    let encoder = qualityEncode.length > 1 ? qualityEncode[1].trim() : '';
    let size = purgeSizeText($(infoNodeChildren[2]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $(link).prev().children();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let qualityText = purgeQualityText($(infoNodeChildren[0]).text()).split(' ');
    let quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
    quality = quality.replace('10bit.x265', 'x265.10bit');
    let size = purgeSizeText($(infoNodeChildren[1]).text());
    let encoder = purgeEncoderText($(infoNodeChildren[2]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}
