import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    replacePersianNumbers,
    removeDuplicateLinks,
} from "../utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {
    purgeEncoderText,
    purgeSizeText,
    fixLinkInfoOrder,
    fixLinkInfo,
    purgeQualityText,
    linkInfoRegex,
    encodersRegex
} from "../linkInfoUtils.js";
import save from "../save_changes_db.js";
import {saveError} from "../../error/saveError.js";

const sourceName = "avamovie";
const needHeadlessBrowser = true;
const sourceVpnStatus = Object.freeze({
    poster: 'allOk',
    trailer: 'noVpn',
    downloadLink: 'noVpn',
});

export default async function avamovie({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, serial_url, serial_page_count, search_title);
    await wrapper_module(sourceName, needHeadlessBrowser, movie_url, page_count, search_title);
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
            if (config.nodeEnv === 'dev') {
                console.log(`avamovie/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, title, pageLink, type, getFileData, getQualitySample);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2);
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && (
                        downloadLinks[0].link.match(/s\d+e\d+/gi) ||
                        downloadLinks[0].link.match(/\.E\d\d\d?\..*\d\d\d\d?p?\./i) ||
                        downloadLinks[0].link.match(/(?<=\.)(Special|OVA|NCED|NCOP)\.\d\d\d?\.\d\d\d\d?p?/i) ||
                        (type === 'anime_movie' && downloadLinks[0].link.match(/\.\d\d\d?\.\d\d\d\d?p/i))
                    )) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceName, needHeadlessBrowser, title, pageLink, type, getFileData, getQualitySample);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies} = pageSearchResult);
                    }
                    year = fixWrongYear(title, type, year);
                    downloadLinks = removeDuplicateLinks(downloadLinks);

                    let sourceData = {
                        sourceName,
                        sourceVpnStatus,
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
            let temp = $(postInfo).text()
                .replace('سال های پخش', '')
                .replace('سال انتشار', '')
                .replace('سال تولید', '')
                .toLowerCase().trim();
            let yearArray = temp.split(/\s+|-/g)
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

function getPersianSummary($) {
    try {
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('plot')) {
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
                let href = $img[i].attribs['src'];
                if (href.includes('uploads')) {
                    return href.replace(/-\d\d\d+x\d\d\d+\./g, '.');
                }
                href = $img[i].attribs['data-src'] || $img[i].attribs['data-lazy-src'];
                if (href && !href.includes('/Logo.') && href.includes('uploads')) {
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
            if ($($a[i]).text().includes('تریلر') && href && href.includes('/trailer/')) {
                result.push({
                    url: href,
                    info: 'avamovie-720p',
                    vpnStatus: sourceVpnStatus.trailer,
                });
            }
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function getFileData($, link, type) {
    // 1080p.x265.10bit.BluRay - 600MB // 1080p.x265.WEB-DL - 380MB
    // 1080p.x265.WEB-DL.PSA - 1.2GB  // 720p.BluRay.YTS.HardSub - 780MB
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
    let linkHref = $(link).attr('href');
    let infoNodeChildren = $($(link).parent().parent().parent().parent().prev()).children();
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let temp = $(infoNodeChildren[0]).text();
    let qualityText = (temp.match(/\d\d\d\d?p/i) || temp.includes('کیفیت')) ? temp : $(infoNodeChildren[1]).text();
    let quality = replacePersianNumbers(qualityText);
    quality = purgeQualityText(quality).split(/\s\s*/g).reverse().join('.');
    let hardSub = quality.match(/softsub|hardsub/gi) || linkHref.match(/softsub|hardsub/gi);
    hardSub = hardSub ? hardSub[0] : checkHardSub(linkHref) ? 'HardSub' : '';
    let size = $(infoNodeChildren[2]).text();
    if (size.includes('حجم')) {
        size = purgeSizeText(size);
    } else if (infoNodeChildren.length > 3) {
        let text = $(infoNodeChildren[3]).text();
        if (text === 'SoftSub') {
            size = '';
        } else {
            size = purgeSizeText(text);
        }
    }
    let info = [quality, hardSub, dubbed].filter(value => value).join('.');
    if (info === '' && size === '') {
        return 'ignore';
    }
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    return [info, size].filter(value => value).join(' - ');
}

function getFileData_movie($, link) {
    let infoNode = $(link).parent().next().children();
    let infoNodeChildren = $(infoNode[1]).children();
    let linkHref = $(link).attr('href');
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = replacePersianNumbers($(infoNode[0]).text());
    if (quality.includes('نلود فیلم')) {
        quality = '';
    } else {
        quality = purgeQualityText(quality).split(' ').reverse().join('.').replace(/^\.?(softsub|hardsub)\.?/i, '');
    }
    let hardSub = quality.match(/softsub|hardsub/gi) || linkHref.match(/softsub|hardsub/gi);
    hardSub = hardSub ? hardSub[0] : checkHardSub(linkHref) ? 'HardSub' : '';

    let encoder = purgeEncoderText($(infoNodeChildren[0]).text());
    let size = purgeSizeText($(infoNodeChildren[1]).text());
    if (encoder.includes('حجم')) {
        size = purgeSizeText(encoder);
        encoder = '';
    }

    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    info = info.replace('GalaxyRGAvaMovie', 'GalaxyRG');
    return [info, size].filter(value => value).join(' - ');
}

function getQualitySample($, link) {
    try {
        let nextNode = $(link).next()[0];
        if (!nextNode || nextNode.name !== 'div') {
            return '';
        }
        let sampleUrl = nextNode.attribs['data-imgqu'];
        if (sampleUrl.endsWith('.jpg')) {
            return sampleUrl;
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function printLinksWithBadInfo(downloadLinks) {
    const badLinks = downloadLinks.filter(item =>
        !item.info.match(linkInfoRegex) &&
        !item.info.match(new RegExp(`^\\d\\d\\d\\d?p\\.(${encodersRegex.source})\\.SoftSub( - ((\\d\\d\\d?MB)|(\\d(\\.\\d)?GB)))?$`)) &&
        !item.info.match(/^\d\d\d\d?p\.x265(\.10bit)?( - ((\d\d\d?MB)|(\d(\.\d)?GB)))?$/) &&
        !item.info.match(new RegExp(`^\\d\\d\\d\\d?p\\.FULL-HD\\.(${encodersRegex.source})( - ((\\d\\d\\d?MB)|(\\d(\\.\\d)?GB)))?$`))
    );

    const badSeasonEpisode = downloadLinks.filter(item => item.season > 40 || item.episode > 400);

    console.log([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}
