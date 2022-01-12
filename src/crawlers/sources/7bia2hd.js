import config from "../../config";
import {search_in_title_page, wrapper_module} from "../searchTools";
import {
    getTitleAndYear,
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks,
    replacePersianNumbers,
    purgeQualityText,
    purgeSizeText,
    purgeEncoderText
} from "../utils";
import save from "../save_changes_db";
import {saveError} from "../../error/saveError";

const sourceName = "bia2hd";

export default async function bia2hd({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(sourceName, serial_url, serial_page_count, search_title);
    await wrapper_module(sourceName, movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let year;
            let pageLink = link.attr('href');
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`bia2hd/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '' && !checkPersianSerial(title)) {
                let pageSearchResult = await search_in_title_page(title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2);
                    }
                    let sourceData = {
                        sourceName,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: getWatchOnlineLinks($2),
                        persianSummary: getPersianSummary($2),
                        poster: getPoster($2),
                        trailers: getTrailers($2),
                        subtitles: [],
                        cookies
                    };
                    await save(title, type, year, sourceData);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function fixYear($) {
    try {
        let state = 0;
        let postInfo = $('li:contains("سال انتشار")');
        if (postInfo.length === 0) {
            state = 1;
            postInfo = $('li:contains("سال های پخش")');
        }
        if (postInfo.length === 1) {
            let temp = $(postInfo).text().replace('سال های پخش', '').replace('سال انتشار', '').toLowerCase().trim();
            if (!temp && state === 0) {
                postInfo = $('li:contains("سال های پخش")');
                if (postInfo.length === 1) {
                    temp = $(postInfo).text().replace('سال های پخش', '').replace('سال انتشار', '').toLowerCase().trim();
                }
            }
            let yearArray = temp.split(/\s+|-|–/g)
                .filter(item => item && !isNaN(item.trim()))
                .sort((a, b) => Number(a) - Number(b));
            if (yearArray.length === 0) {
                return '';
            }
            return validateYear(yearArray[0]);
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getPersianSummary($) {
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

function getPoster($) {
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
                result.push({
                    url: src,
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
                let info = getFileData_movie($, a[i]);
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

function getFileData($, link, type) {
    // '720p.x265 - 249.5MB'  // '720p.x265.dubbed - 249.5MB'
    // '1080p.x265.YIFY - 1.6GB'  // '1080p.x265.YIFY - 1.6GB'
    try {
        return type.includes('serial')
            ? getFileData_serial($, link)
            : getFileData_movie($, link);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getFileData_serial($, link) {
    let infoNodeChildren = $($(link).parent().parent().parent().parent().prev().children()[0]).children();
    let hardSub = checkHardSub($(link).attr('href')) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), '') ? 'dubbed' : '';
    let quality = $(infoNodeChildren[2]).text()
        .replace('کیفیت', '').trim()
        .replace(' x264', '')
        .replace(' -', '')
        .replace(/\s/g, '.');
    quality = replacePersianNumbers(quality);
    quality = purgeQualityText(quality);
    let qualitySplit = quality.split('.');
    if (qualitySplit.length > 1 &&
        qualitySplit[0] === 'x265' &&
        qualitySplit[1].match(/\d\d\d+p/g)) {
        quality = [qualitySplit[1], qualitySplit[0], ...qualitySplit.slice(2)].filter(value => value).join('.');
    }
    let size = '';
    if ($(link).parent()[0].name === 'div') {
        let sizeInfoNodeChildren = $($(link).parent().prev().children()[0]).children();
        for (let i = 0; i < sizeInfoNodeChildren.length; i++) {
            let sizeText = $(sizeInfoNodeChildren[1]).text();
            if (sizeText.includes('حجم')) {
                size = purgeSizeText(sizeText);
                break;
            }
        }
    }
    let info = [quality, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function getFileData_movie($, link) {
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let linkHref = $(link).attr('href');
    let hardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = replacePersianNumbers($(infoNodeChildren[1]).text());
    quality = quality.replace(/x264|-/g, '').replace(/\s\s+/g, ' ').trim();
    let linkHrefQualityMatch = linkHref.match(/bluray|webdl|web-dl|webrip|web-rip/gi);
    if (!quality.match(/bluray|webdl|web-dl|webrip|web-rip/gi) && linkHrefQualityMatch) {
        quality = quality + ' ' + linkHrefQualityMatch.pop();
    }
    quality = purgeQualityText(quality).replace(/\s+/g, '.');
    if (quality.startsWith('4K.')) {
        quality = '2160p.' + quality;
    }
    let size = purgeSizeText($(infoNodeChildren[2]).text());
    let encoder = purgeEncoderText($(infoNodeChildren[3]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function checkPersianSerial(title) {
    let names = [
        'bidar bash', 'dodkesh', 'bi seda faryad kon',
        'baaghe mozaffar', 'avaye baran', 'sakhteman pezeshkan',
        'kolah pahlavi', 'marde 2000 chehreh', 'zero degree turn',
        'the man with a thousand faces', 'merajiha', 'mokhtarnameh',
        'motaham gorikht', 'padari', 'roshantar az khamoshi',
        'ziba barbershop', 'ashkha va labkhandha', 'moammaye shah',
        'se dar chahar', 'breath', 'alalbadal', 'dar jostojooie aramesh',
        'legionnaire', 'hasto nist', 'divar be divar', 'gosal',
        'az yadha rafteh', 'recovery', 'zoj ya fard', 'deldadegan 1397',
        'raghs rooi e shisheh', 'baradar jaan', 'shahrzad 1394',
    ];
    for (let i = 0; i < names.length; i++) {
        if (title === names[i]) {
            return true;
        }
    }
    return false;
}
