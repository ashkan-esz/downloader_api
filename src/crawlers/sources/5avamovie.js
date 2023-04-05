import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {validateYear, getType, replacePersianNumbers, removeDuplicateLinks} from "../utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {
    purgeEncoderText,
    purgeSizeText,
    fixLinkInfoOrder,
    fixLinkInfo,
    purgeQualityText,
} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {saveError} from "../../error/saveError.js";

export const sourceConfig = Object.freeze({
    sourceName: "avamovie",
    needHeadlessBrowser: true,
    sourceAuthStatus: 'ok',
    vpnStatus: Object.freeze({
        poster: 'allOk',
        trailer: 'noVpn',
        downloadLink: 'noVpn',
    }),
    replaceInfoOnDuplicate: true,
});

export default async function avamovie({movie_url, serial_url, page_count, serial_page_count}) {
    let p1 = await wrapper_module(sourceConfig, serial_url, serial_page_count, search_title);
    let p2 = await wrapper_module(sourceConfig, movie_url, page_count, search_title);
    return [p1, p2];
}

async function search_title(link, i, $, url) {
    try {
        let title = link.attr('title');
        if (
            (title && title.includes('دانلود') && link.parent()[0].name === 'h2' && link.parent().hasClass('title')) ||
            (url.includes('/serie') && link.parent()[0].name === 'article' && $(link.parent()[0]).hasClass('item'))
        ) {
            let year;
            let pageLink = link.attr('href');
            let type = getType(title);
            if (type.includes('movie') && url.includes('/series/')) {
                type = type.replace('movie', 'serial');
            }
            if (config.nodeEnv === 'dev') {
                console.log(`avamovie/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData, getQualitySample);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2);
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && (
                        downloadLinks[0].link.match(/s\d+e\d+/gi) ||
                        downloadLinks[0].link.match(/\.E\d\d\d?\..*\d\d\d\d?p?\./i) ||
                        downloadLinks[0].link.match(/(?<=\.)(Special|OVA|OAD|NCED|NCOP)\.\d\d\d?\.\d\d\d\d?p?/i) ||
                        (type === 'anime_movie' && downloadLinks[0].link.match(/\.\d\d\d?\.\d\d\d\d?p/i))
                    )) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData, getQualitySample);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
                    }
                    year = fixWrongYear(title, type, year);
                    downloadLinks = removeDuplicateLinks(downloadLinks, sourceConfig.replaceInfoOnDuplicate);

                    let sourceData = {
                        sourceConfig,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: summaryExtractor.getPersianSummary($2, title, year),
                        poster: posterExtractor.getPoster($2, sourceConfig.sourceName),
                        trailers: trailerExtractor.getTrailers($2, sourceConfig.sourceName, sourceConfig.vpnStatus),
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
        let postInfo = $('li:contains("سال های پخش")');
        if (postInfo.length === 0) {
            postInfo = $('li:contains("سال انتشار")');
        }
        if (postInfo.length === 0) {
            postInfo = $('li:contains("سال تولید")');
        }
        if (postInfo.length === 1) {
            const temp = $(postInfo).text()
                .replace('سال های پخش', '')
                .replace('سال انتشار', '')
                .replace('سال تولید', '')
                .toLowerCase().trim();
            const yearArray = temp.split(/\s+|-/g)
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

function fixWrongYear(title, type, year) {
    if (title === 'the blacklist' && type === 'serial') {
        return '2013'; // 2016 --> 2013
    } else if (title === 'i am the night' && type === 'serial') {
        return '2019'; // 2011 --> 2019
    } else if (title === 'living with yourself' && type === 'serial') {
        return '2019'; // 2010 --> 2019
    } else if (title === 'the l word generation q' && type === 'serial') {
        return '2019'; // 2021 --> 2019
    }
    return year;
}

export function getFileData($, link, type) {
    try {
        return type.includes('serial')
            ? getFileData_serial($, link, type)
            : getFileData_movie($, link, type);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getFileData_serial($, link, type) {
    const infoNodeChildren = $($(link).parent().parent().parent().parent().prev()).children();
    const temp = $(infoNodeChildren[0]).text();
    const qualityText = (temp.match(/\d\d\d\d?p/i) || temp.includes('کیفیت')) ? temp : $(infoNodeChildren[1]).text();
    let quality = replacePersianNumbers(qualityText);
    quality = purgeQualityText(quality).split(/\s+/g).reverse().join('.');
    let size = $(infoNodeChildren[2]).text();
    if (size.includes('حجم')) {
        size = purgeSizeText(size);
    } else if (infoNodeChildren.length > 3) {
        const text = $(infoNodeChildren[3]).text();
        size = text === 'SoftSub' ? '' : purgeSizeText(text);
    }
    if (quality === '' && size === '') {
        return 'ignore';
    }
    let info = fixLinkInfo(quality, $(link).attr('href'), type);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(Boolean).join(' - ');
}

function getFileData_movie($, link, type) {
    const containerText = $($(link).parent().parent().parent().parent().prev()).text().trim();
    const infoNode = $(link).parent().next().children();
    const infoNodeChildren = $(infoNode[1]).children();
    let quality = replacePersianNumbers($(infoNode[0]).text());
    quality = quality.includes('نلود فیلم') ? '' : purgeQualityText(quality).replace(/\s+/g, '.');
    let encoder = purgeEncoderText($(infoNodeChildren[0]).text());
    let size = purgeSizeText($(infoNodeChildren[1]).text());
    if (encoder.includes('حجم')) {
        size = purgeSizeText(encoder);
        encoder = '';
    }
    if (containerText.includes('بدون زیرنویس')) {
        quality = quality.replace(/\.?HardSub|SoftSub/i, '');
    }
    let info = [quality, encoder].filter(Boolean).join('.');
    info = fixLinkInfo(info, $(link).attr('href'), type);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(Boolean).join(' - ');
}

function getQualitySample($, link) {
    try {
        const nextNode = $(link).next()[0];
        if (!nextNode || nextNode.name !== 'div') {
            return '';
        }
        const sampleUrl = nextNode.attribs['data-imgqu'];
        if (sampleUrl.endsWith('.jpg')) {
            return sampleUrl;
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}
