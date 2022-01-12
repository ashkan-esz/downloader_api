import config from "../../config";
import {search_in_title_page, wrapper_module} from "../searchTools";
import {
    purgeTitle,
    getTitleAndYear,
    getType,
    removeDuplicateLinks,
    checkDubbed,
    purgeQualityText,
    purgeEncoderText,
    purgeSizeText,
    getYear
} from "../utils";
import save from "../save_changes_db";
import {saveError} from "../../error/saveError";

const sourceName = "digimoviez";

export default async function digimoviez({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(sourceName, serial_url, serial_page_count, search_title);
    await wrapper_module(sourceName, movie_url, page_count, search_title);
}

async function search_title(link, i, $, url) {
    try {
        let text = link.text();
        if (text && text.includes('دانلود') && text.includes('ادامه')) {
            let title = link.attr('title').toLowerCase();
            let year;
            let type = getType(title);
            if (url.includes('serie')) {
                type = type.replace('movie', 'serial');
            }
            let pageLink = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`digimoviez/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, pageLink, type, getFileData, getQualitySample);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        ({title, year} = fixTitleAndYear(title, year, type, pageLink, downloadLinks, $2));
                    }
                    downloadLinks = removeDuplicateLinks(downloadLinks);
                    if (downloadLinks.length > 0 && downloadLinks[0].link.match(/s\d+e\d+/gi)) {
                        type = 'serial';
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

function fixTitleAndYear(title, year, type, page_link, downloadLinks, $2) {
    try {
        let titleHeader = $2('.head_meta');
        if (titleHeader) {
            let temp = $2($2($2(titleHeader).children()[1]).children()[0]).text().toLowerCase();
            let splitTitle = purgeTitle(temp, type, true);
            year = splitTitle[splitTitle.length - 1];
            if (!isNaN(year) && Number(year) > 1900) {
                splitTitle.pop();
                title = splitTitle.join(" ");
                if (year.length > 4) {
                    year = year.slice(0, 4);
                }
            } else {
                title = splitTitle.join(" ");
                year = getYear(title, page_link, downloadLinks);
            }
            return {title, year};
        }
        return {title, year: year || ''};
    } catch (error) {
        saveError(error);
        return {title, year: year || ''};
    }
}

function getPersianSummary($) {
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

function getPoster($) {
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
                        url: href,
                        info: 'digimoviez-720p'
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
                    info: 'digimoviez-720p',
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
