const {search_in_title_page, wrapper_module} = require('../searchTools');
const {
    purgeTitle,
    getType,
    removeDuplicateLinks,
    checkDubbed,
    purgeQualityText,
    purgeEncoderText,
    purgeSizeText
} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function digimovies({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(serial_url, serial_page_count, search_title);
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i, $, url) {
    try {
        let text = link.text();
        if (text && text.includes('دانلود') && text.includes('ادامه')) {
            let title = link.attr('title').toLowerCase();
            let type = getType(title);
            if (url.includes('serie')) {
                type = type.replace('movie', 'serial');
            }
            let page_link = link.attr('href');
            if (process.env.NODE_ENV === 'dev') {
                console.log(`digimovies/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title, type);
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size, getQualitySample);
                if (pageSearchResult) {
                    let {save_link, $2, subtitles, cookies} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    let watchOnlineLinks = getWatchOnlineLinks($2);
                    save_link = removeDuplicateLinks(save_link);
                    if (save_link.length > 0 && save_link[0].link.match(/s\d+e\d+/gi)) {
                        type = 'serial';
                    }
                    await save(title, page_link, save_link, persian_summary, poster, trailers, watchOnlineLinks, subtitles, cookies, type);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function get_persian_summary($) {
    try {
        let divs = $('div');
        for (let i = 0; i < divs.length; i++) {
            if ($(divs[i]).hasClass('plot_text'))
                return $(divs[i]).text().trim();
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
                let href = $img[i].attribs.src;
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
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('on_trailer_bottom')) {
                let href = $div[i].attribs['data-trailerlink'];
                if (href && href.toLowerCase().includes('trailer')) {
                    result.push({
                        link: href,
                        info: 'digimovie-720p'
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

function getWatchOnlineLinks($) {
    try {
        let result = [];
        let $a = $('a');
        for (let i = 0; i < $a.length; i++) {
            let title = $($a[i]).attr('title');
            if (title && title.includes('پخش آنلاین')) {
                let href = $($a[i]).attr('href');
                result.push({
                    link: href,
                    info: 'digimovie-720p',
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
    //'1080p.HDTV.dubbed - 550MB'  //'1080p.WEB-DL.SoftSub - 600MB'
    //'720p.x265.WEB-DL.SoftSub - 250MB' //'2160p.x265.10bit.BluRay.IMAX.SoftSub - 4.42GB'
    try {
        let infoNode = (type.includes('serial') || $(link).attr('href').match(/s\d+e\d+/gi))
            ? $($(link).parent().parent().parent().prev().children()[1]).children()
            : $(link).parent().parent().next().children();
        let infoNodeChildren = $(infoNode[1]).children();
        let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
        let quality = purgeQualityText($(infoNode[0]).text()).replace(/\s/g, '.');
        let hardSub = quality.match(/softsub|hardsub/gi) || '';
        if (hardSub) {
            hardSub = hardSub[0];
            quality = quality.replace('.' + hardSub, '');
        }
        quality = sortQualityInfo(quality);
        let encoder = (infoNodeChildren.length === 3) ? purgeEncoderText($(infoNodeChildren[0]).text()) : '';
        let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
        let size = (infoNodeChildren.length === 3)
            ? purgeSizeText($(infoNodeChildren[1]).text())
            : purgeSizeText($(infoNodeChildren[0]).text());
        return [info, size].filter(value => value).join(' - ');
    } catch (error) {
        saveError(error);
        return '';
    }
}

function sortQualityInfo(quality) {
    let spited_quality = quality.split('.');

    if (quality.match(/(\d\d\d\dp|\d\d\dp)\.10bit\.(BluRay|WEB-DL|WEB-RIP|HDTV)(\.6ch)*\.x265/gi)) {
        //'1080p.10bit.BluRay.x265','1080p.x265.10bit.BluRay'
        spited_quality = spited_quality.filter(text => text !== 'x265');
        quality = [spited_quality[0], 'x265', ...spited_quality.slice(1)].filter(value => value).join('.');
    } else if (quality.match(/(\d\d\d\dp|\d\d\dp)\.(BluRay|WEB-DL|WEB-RIP|HDTV)\.x265/gi)) {
        //'1080p.BluRay.x265','1080p.x265.BluRay'
        quality = [spited_quality[0], ...spited_quality.slice(2), spited_quality[1]].filter(value => value).join('.');
    } else if (quality.match(/BluRay\.(\d\d\d\dp|\d\d\dp)/gi)) {
        //'BluRay.1080p.x265','1080p.x265.BluRay'
        //'BluRay.1080p','1080p.BluRay'
        quality = [...spited_quality.slice(1), spited_quality[0]].filter(value => value).join('.');
    }
    quality = quality.replace('REMASTERED.1080p.BluRay', '1080p.BluRay.REMASTERED');
    return quality;
}

function getQualitySample($, link, type) {
    try {
        if (type.includes('serial') || $(link).attr('href').match(/s\d+e\d+/gi)) {
            return '';
        }
        let nextNode = $(link).next().next()[0];
        let sampleUrl = nextNode ? nextNode.attribs.href : '';
        if (sampleUrl.includes('.jpg')) {
            return sampleUrl;
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}
