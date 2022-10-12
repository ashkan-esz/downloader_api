import config from "../../../config/index.js";
import {search_in_title_page, wrapper_module} from "../../searchTools.js";
import {
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks
} from "../../utils.js";
import {getTitleAndYear} from "../../movieTitle.js";
import {purgeEncoderText, purgeSizeText, purgeQualityText} from "../../linkInfoUtils.js";
import save from "../../save_changes_db.js";
import {saveError} from "../../../error/saveError.js";

const sourceName = "mctv";
const needHeadlessBrowser = false;

export default async function bia2hd({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, serial_url, serial_page_count, search_title_serial);
    await wrapper_module(sourceName, needHeadlessBrowser, movie_url, page_count, search_title_movie);
}

async function search_title_serial(link, i) {
    try {
        let title = link.attr('title');
        let pageLink = link.attr('href');
        if (title === '' && pageLink && pageLink.includes('series')) {
            title = link.parent().next().text();
            let year;
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`mctv/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (downloadLinks.length > 0) {
                        let sourceData = {
                            sourceName,
                            pageLink,
                            downloadLinks,
                            watchOnlineLinks: [],
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
            let pageLink = link.attr('href');
            let year;
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`mctv/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (downloadLinks.length > 0) {
                        let sourceData = {
                            sourceName,
                            pageLink,
                            downloadLinks,
                            watchOnlineLinks: [],
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
        }
    } catch (error) {
        saveError(error);
    }
}

function getPersianSummary($) {
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
                if (src.includes('trailer')) {
                    result.push({
                        url: src,
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

function getFileData($, link, type) {
    //'720p.x265.WEB-DL.PSA - 873MB' //'720p.BluRay.YIFI - 944MB'
    //'720p.x265.WEB-DL - 100MB'  //'1080p.x265.10bit.WEB-DL - 250MB'
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

function getFileData_movie($, link) {
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
