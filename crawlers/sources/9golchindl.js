const {search_in_title_page, wrapper_module} = require('../searchTools');
const {remove_persian_words, getType, checkDubbed, checkHardSub} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function golchindl({movie_url, page_count}) {
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let page_link = link.attr('href');
            let type = getType(title);
            if (process.env.NODE_ENV === 'dev') {
                console.log(`golchindl/${type}/${i}/${title}  ========>  `);
            }
            let title_array = remove_persian_words(title.toLowerCase(), type);
            if (title_array.length > 0) {
                let pageSearchResult = await search_in_title_page(title_array, page_link, type, get_file_size);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    if (save_link.length > 0) {
                        await save(title_array, page_link, save_link, persian_summary, poster, [], [], type);
                    }
                }
            }
        }
    } catch (error) {
        await saveError(error);
    }
}

function get_persian_summary($) {
    try {
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('summary')) {
                return $($div[i]).text().replace('خلاصه داستان', '').replace(':', '').trim();
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
            if (parent.name === 'a' && $(parent).hasClass('thumb')) {
                let href = $img[i].attribs['data-src'];
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
    // '480p.BluRay.dubbed - 445MB' // '480p.Web-dl - 350MB'
    // '720p.x265.Web-dl.PSA' // '720p.Web-dl.dubbed'
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
    let infoText = $($(link).parent()[0]).text();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let bit10 = $(link).attr('href').includes('10bit') ? '10bit' : '';
    let splittedInfoText = infoText.split(' – ');
    let quality, encoder;
    if (splittedInfoText[0].includes('کیفیت')) {
        let qualityText = splittedInfoText[0].split('کیفیت')[1].trim().split(' ');
        quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
        encoder = splittedInfoText.length > 1 ? splittedInfoText[1].replace('انکودر:', '').trim() : '';
    } else if (splittedInfoText[0].includes('«')) {
        quality = splittedInfoText[0]
            .split('«')[1]
            .replace('لينک مستقيم', '')
            .replace('»:', '')
            .trim()
            .split(' ')
            .join('.');
        encoder = splittedInfoText.length > 1 ? splittedInfoText[1].replace('انکودر:', '').trim() : '';
    } else {
        let linkHref = $(link).attr('href').split('.');
        linkHref.pop();
        let seasonEpisodeIndex = linkHref.findIndex((value => value.match(/S\d\dE\d\d|S\dE\d\d/g)));
        quality = linkHref.slice(seasonEpisodeIndex + 1).join('.').replace('.HardSub', '');
        encoder = '';
    }
    return [quality, bit10, encoder, hardSub, dubbed].filter(value => value).join('.');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $($(link).parent().parent().prev().children()[0]).children()[0];
    let infoText = $(infoNodeChildren).text();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), infoText) ? 'dubbed' : '';
    let quality, encoder, size;
    if (infoText.includes('|')) {
        let qualityText = infoText.split('|')[1].replace('کیفیت', '').trim().split(' ');
        quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
        size = infoText.split('|')[2].replace('حجم', '').replace(':', '').trim();
        encoder = $(infoNodeChildren[2]).text().replace('انکودر :', '').trim();
    } else {
        let qualityText = infoText.split(' –')[0].trim().split(' ');
        quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
        size = infoText.split(' –').pop().trim();
        encoder = $(infoNodeChildren[2]).text().replace('انکودر :', '').trim();
    }
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}
