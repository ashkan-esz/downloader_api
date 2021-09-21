const {search_in_title_page, wrapper_module} = require('../searchTools');
const {
    purgeTitle,
    getType,
    checkDubbed,
    checkHardSub,
    replacePersianNumbers,
    purgeQualityText,
    purgeSizeText,
    purgeEncoderText
} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function avamovie({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(serial_url, serial_page_count, search_title);
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let page_link = link.attr('href');
            let type = getType(title);
            if (process.env.NODE_ENV === 'dev') {
                console.log(`avamovie/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title.toLowerCase(), type);
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2, subtitles, cookies} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    await save(title, page_link, save_link, persian_summary, poster, trailers, [], subtitles, cookies, type);
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
                return $($p[i]).text().replace('خلاصه داستان :', '').trim();
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
            if (parent.name === 'a' && $($img[i]).hasClass('wp-post-image')) {
                let href = $img[i].attribs['data-lazy-src'];
                if (href.includes('uploads')) {
                    return href.replace(/-\d\d\d+x\d\d\d+\./g, '.');
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
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let href = $a[i].attribs.href;
            let child = $($a[i]).children()[0];
            if ($(child).text().includes('دانلود تریلر') && href && href.includes('.mp4')) {
                result.push({
                    link: href,
                    info: 'avamovie-720p',
                });
            }
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function get_file_size($, link, type) {
    // 1080p.x265.10bit.BluRay - 600MB // 1080p.x265.WEB-DL - 380MB
    // 1080p.x265.WEB-DL.PSA - 1.2GB  // 720p.BluRay.YTS.HardSub - 780MB
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
    let quality = purgeQualityText($(infoNodeChildren[2]).text()).split(' ').reverse().join('.');
    quality = replacePersianNumbers(quality);
    let resolution = quality.match(/\d\d\d+p/g);
    if (resolution) {
        quality = quality
            .replace('x256', 'x265')
            .replace(`x265.${resolution[0]}`, `${resolution[0]}.x265`)
            .replace(`10bit.${resolution[0]}`, `${resolution[0]}.10bit`)
    }
    quality = quality
        .replace('10bit.x265', 'x265.10bit')
        .replace('HDR.1080p.10bit', '1080p.10bit.HDR')
        .replace('HD.1080p', '1080p.HD')
        .replace('HD.720p', '720p.HD');
    let size = $(infoNodeChildren[3]).text();
    if (size.includes('حجم')) {
        size = purgeSizeText(size);
    } else if (infoNodeChildren.length > 4) {
        size = purgeSizeText($(infoNodeChildren[4]).text());
    }
    let info = [quality, hardSub, dubbed].filter(value => value).join('.');
    if (info === '' && size === '') {
        return 'ignore';
    }
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let linkHref = $(link).attr('href');
    let hardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = purgeQualityText($(infoNodeChildren[0]).text()).replace(' HD', '').split(' ').reverse().join('.');
    quality = replacePersianNumbers(quality);
    let resolution = quality.match(/\d\d\d+p/g);
    if (resolution) {
        quality = quality
            .replace('x256', 'x265')
            .replace(`x265.${resolution[0]}`, `${resolution[0]}.x265`)
            .replace(`10bit.${resolution[0]}`, `${resolution[0]}.10bit`)
    }
    quality = quality.replace('10bit.x265', 'x265.10bit');
    let encoder = '';
    let size = $(infoNodeChildren[2]).text();
    if (size.includes('حجم')) {
        size = purgeSizeText(size);
    } else if (infoNodeChildren.length > 3) {
        encoder = purgeEncoderText($(infoNodeChildren[2]).text());
        size = purgeSizeText($(infoNodeChildren[3]).text());
    }
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}