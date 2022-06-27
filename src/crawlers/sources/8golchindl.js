import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    getTitleAndYear,
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks
} from "../utils.js";
import {
    purgeEncoderText,
    purgeSizeText,
    purgeQualityText,
    fixLinkInfo,
    fixLinkInfoOrder,
    linkInfoRegex,
    releaseRegex
} from "../linkInfoUtils.js";
import * as persianRex from "persian-rex";
import save from "../save_changes_db.js";
import {saveError} from "../../error/saveError.js";

const sourceName = "golchindl";
const needHeadlessBrowser = false;

export default async function golchindl({movie_url, page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, movie_url, page_count, search_title);
}

async function search_title(link, i, $) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let year;
            let pageLink = link.attr('href');
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`golchindl/${type}/${i}/${title}  ========>  `);
            }
            if (
                title.includes('انتخابات') ||
                title.includes('مجله لیگ قهرمانان') ||
                title.includes('جومونگ')
            ) {
                return;
            }
            title = title.replace('پلی استیشن 5', '');
            let isCeremony = title.includes('دانلود مراسم');
            let isCollection = title.includes('کالکشن فیلم') || title.includes('کالکشن انیمیشن');
            ({title, year} = getTitleAndYear(title, year, type));

            if (!year) {
                year = fixYear($, link);
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (type.includes('serial') && downloadLinks.length > 0 &&
                        downloadLinks[0].link.replace(/\.(mkv|mp4)|\.HardSub|\.x264|:/gi, '') === downloadLinks[0].info.replace(/\.HardSub|\.x264/gi, '')) {
                        type = type.replace('serial', 'movie');
                        pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies} = pageSearchResult);
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && downloadLinks[0].link.match(/s\d+e\d+/gi)) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies} = pageSearchResult);
                    }
                    downloadLinks = removeDuplicateLinks(downloadLinks);
                    if (isCollection) {
                        title += ' collection';
                        addTitleNameToInfo(downloadLinks);
                    } else if (isCeremony) {
                        addTitleNameToInfo(downloadLinks);
                    }

                    let sourceData = {
                        sourceName,
                        pageLink,
                        downloadLinks,
                        watchOnlineLinks: [],
                        persianSummary: getPersianSummary($2),
                        poster: getPoster($2),
                        trailers: [],
                        subtitles: [],
                        cookies
                    };
                    await save(title, type, year, sourceData);
                }
            }
        }
    } catch (error) {
        await saveError(error);
    }
}

function fixYear($, link) {
    try {
        let linkNodeParent = link.parent().parent().parent().parent().next().next().next();
        let yearNodeParentChildren = $(linkNodeParent).children().children().children();
        for (let i = 0; i < yearNodeParentChildren.length; i++) {
            let text = $(yearNodeParentChildren[i]).text();
            if (text.includes('سال ساخت :')) {
                let temp = text.replace('سال ساخت :', '').trim();
                let yearArray = temp.split(/\s+|-|–/g)
                    .filter(item => item && !isNaN(item.trim()))
                    .sort((a, b) => Number(a) - Number(b));
                if (yearArray.length === 0) {
                    return '';
                }
                return validateYear(yearArray[0]);
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function addTitleNameToInfo(downloadLinks) {
    for (let i = 0; i < downloadLinks.length; i++) {
        let fileName = downloadLinks[i].link.split('/').pop();
        let nameMatch = fileName.match(/.+(\d\d\d\d|\d\d\d)p/gi);
        if (!nameMatch) {
            nameMatch = fileName.match(/.+(hdtv)/gi);
        }
        let name = nameMatch ? nameMatch.pop().replace(/\d\d\d\d?p|hdtv/gi, '').replace(/\.|%20/g, ' ').trim() : '';
        if (!name) {
            continue;
        }
        let splitInfo = downloadLinks[i].info.split(' - ');
        if (splitInfo.length === 1) {
            downloadLinks[i].info += '. (' + name + ')';
        } else {
            downloadLinks[i].info = splitInfo[0] + '. (' + name + ')' + ' - ' + splitInfo[1];
        }
    }
}

function getPersianSummary($) {
    try {
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('summary') && $($div[i]).text().includes('خلاصه')) {
                return $($div[i]).text().replace('خلاصه داستان', '').replace(':', '').trim();
            }
        }
        let $strong = $('strong');
        for (let i = 0; i < $strong.length; i++) {
            if ($($strong[i]).text().includes('خلاصه داستان')) {
                return $($strong[i]).text().replace('خلاصه داستان', '').replace(':', '').trim();
            }
        }
        let p = $('p');
        for (let i = 0; i < p.length; i++) {
            if ($(p[i]).text().includes('خلاصه فیلم')) {
                return $(p[i]).text().split('–').pop().replace('خلاصه فیلم', '').replace(':', '').trim();
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
            if (parent.name === 'a' && $(parent).hasClass('thumb')) {
                let href = $img[i].attribs['data-src'] || $img[i].attribs['src'];
                if (href && (href.includes('uploads') || href.includes('cdn.'))) {
                    return href
                        .replace(/.+(?=https:)/, '')
                        .replace(/-\d\d\dx\d\d\d(?=(\.jpg))/, '');
                }
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getFileData($, link, type) {
    // '480p.BluRay.dubbed - 445MB' // '480p.Web-dl - 350MB'
    // '720p.x265.Web-dl.PSA' // '720p.Web-dl.dubbed'
    try {
        return type.includes('serial')
            ? getFileData_serial($, link)
            : getFileData_movie($, link);
    } catch (error) {
        saveError(error);
        return 'ignore';
    }
}

function getFileData_serial($, link) {
    let infoText = $($(link).parent()[0]).text();
    let linkHref = $(link).attr('href');
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let bit10 = linkHref.includes('10bit') ? '10bit' : '';
    let splitInfoText = infoText.split(' – ');
    let quality, encoder;
    if (splitInfoText[0].includes('کیفیت')) {
        let qualityText = splitInfoText[0].split('کیفیت')[1].trim().replace(/ |\s/g, '.');
        quality = purgeQualityText(qualityText);
        encoder = splitInfoText.length > 1 ? purgeEncoderText(splitInfoText[1]) : '';
    } else if (splitInfoText[0].includes('«')) {
        quality = splitInfoText[0].split('«')[1].replace('»:', '');
        quality = purgeQualityText(quality).replace(/\s+/g, '.');
        encoder = splitInfoText.length > 1 ? purgeEncoderText(splitInfoText[1].replace('»: لينک مستقيم', '')) : '';
    } else {
        let splitLinkHref = linkHref.split('.');
        splitLinkHref.pop();
        let seasonEpisodeIndex = splitLinkHref.findIndex((value => value.match(/s\d+e\d+/gi)));
        quality = splitLinkHref.slice(seasonEpisodeIndex + 1).join('.').replace('.HardSub', '');
        quality = purgeQualityText(quality);
        quality = quality
            .replace(/\.(Golchindl|net|BWBP|2CH)/gi, '')
            .replace('REAL.', '')
            .replace('DD%202.0.H.264monkee', 'monkee');
        encoder = '';
    }

    let hardSub = quality.match(/softsub|hardsub/gi) || linkHref.match(/softsub|hardsub/gi);
    hardSub = hardSub ? hardSub[0] : checkHardSub(linkHref) ? 'HardSub' : '';

    let info = [quality, bit10, encoder, hardSub, dubbed].filter(value => value).join('.')
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    info = info
        .replace('HardSub.dubbed', 'dubbed')
        .replace(/\.Www\.DownloadSpeed\.iR/i, '')
    if (info.includes('https')) {
        return 'ignore';
    }
    return info;
}

function getFileData_movie($, link) {
    let linkHref = $(link).attr('href');
    let infoText = getMovieInfoText($, link);
    if (infoText.includes('دانلود پشت صحنه') || $(link).text().includes('دانلود پشت صحنه')) {
        return 'ignore';
    }
    let hardSub = linkHref.match(/softsub|hardsub/gi);
    hardSub = hardSub ? hardSub[0] : checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, infoText) ? 'dubbed' : '';
    let quality, encoder, size;
    if (infoText.includes('|')) {
        let splitInfoText = infoText.split('|');
        if (splitInfoText.length === 3) {
            if (splitInfoText[0].includes('کیفیت')) {
                quality = purgeQualityText(splitInfoText[0]).replace(/\s/g, '.');
                if (splitInfoText[1].includes('انکودر')) {
                    encoder = purgeEncoderText(splitInfoText[1]);
                    size = purgeSizeText(splitInfoText[2]);
                } else {
                    size = purgeSizeText(splitInfoText[1]);
                    encoder = purgeEncoderText(splitInfoText[2]);
                }
            } else {
                quality = purgeQualityText(splitInfoText[1]).replace(/\s/g, '.');
                size = purgeSizeText(splitInfoText[2]);
                encoder = '';
            }
        } else {
            quality = splitInfoText[0].trim()
                .split(' ')
                .filter((text) => text && !persianRex.hasLetter.test(text))
                .join('.');
            size = purgeSizeText(splitInfoText[1]);
            encoder = '';
        }
    } else if (infoText.includes(' –') || infoText.includes(' -')) {
        let splitInfoText = infoText.split(/\s[–-]/g);
        quality = purgeQualityText(splitInfoText[0]).replace(/\s/g, '.');
        if (splitInfoText.length === 3) {
            if (splitInfoText[1].includes('انکودر')) {
                encoder = purgeEncoderText(splitInfoText[1]);
                size = purgeSizeText(splitInfoText[2]);
            } else {
                size = purgeSizeText(splitInfoText[1]);
                encoder = purgeEncoderText(splitInfoText[2]);
            }
        } else {
            size = purgeSizeText(splitInfoText[1]);
            size = (size.toLowerCase().includes('mb') || size.toLowerCase().includes('gb')) ? size : '';
            encoder = splitInfoText[1].includes('انکودر') ? purgeEncoderText(splitInfoText[1]) : '';
        }
    } else {
        let splitInfoText = infoText.split('حجم');
        quality = purgeQualityText(splitInfoText[0]).replace(/\s/g, '.');
        size = splitInfoText.length > 1 ? purgeSizeText(splitInfoText[1]) : '';
        encoder = '';
    }

    let matchPart = linkHref.match(/\.part\d\./gi);
    let part = matchPart ? matchPart.pop().replace(/\./g, '') : '';

    let info = [quality, encoder, part, hardSub, dubbed].filter(value => value).join('.')
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    if (info.includes('https')) {
        return 'ignore';
    }
    return [info, size].filter(value => value).join(' - ');
}

function getMovieInfoText($, link) {
    let infoText = '';
    let parentName = $(link).parent()[0].name;
    if (parentName !== 'li') {
        let infoNodeChildren;
        if (parentName === 'strong') {
            infoNodeChildren = $(link).parent().parent().prev();
            if (!$(infoNodeChildren).text().match(/^BluRay \d\d\d\d?p$/i)) {
                infoNodeChildren = $($(link).parent().parent().parent().prev().children()[0]).children()[0];
            }
            if ($(infoNodeChildren).text().includes('دانلود با کیفیت')) {
                infoNodeChildren = $($(link).parent().parent().parent().prev().prev().children()[0]).children()[0];
            }
        } else {
            infoNodeChildren = parentName !== 'p'
                ? $($(link).parent().parent().prev().children()[0]).children()[0]
                : $($(link).parent().prev().children()[0]).children()[0];
        }
        infoText = $(infoNodeChildren).text();
        if (infoText.match(/پارت \d/g)) {
            // پارت 1
            infoNodeChildren = $(infoNodeChildren).prev();
            infoText = $(infoNodeChildren).text();
        }
        if (infoText.includes('انکودر') || $(infoNodeChildren).length === 0) {
            // انکودر : RMT
            infoNodeChildren = $(link).parent().parent().prev().prev();
            infoText = $(infoNodeChildren).text();
            if (infoText.includes('خلاصه داستان')) {
                infoNodeChildren = $(link).parent().prev().children()[0];
                infoText = $(infoNodeChildren).text();
            }
            if (infoText.match(/^(–|\s)+$/g) || $(infoNodeChildren).length === 0) {
                infoNodeChildren = $(link).parent().parent().prev();
                infoText = $(infoNodeChildren).text();
            }
            if (infoText.match(/^([-=….])+$/g)) {
                infoText = '';
            }
        }
        infoText = infoText
            .replace(/ /g, ' ')
            .replace('- 4K', '')
            .replace('- اختصاصی گلچین دانلود', '')
            .replace('زبان اصلی - ', '')
            .trim();
    }
    return infoText;
}

function printLinksWithBadInfo(downloadLinks) {
    const golchindlMovieLinkInfoRegex = new RegExp([
        /^\d\d\d\d?p/,
        /(\.x265(\.10bit)?)?/,
        /(\.Summary)?/,
        /(\.Oscar(\.\d\d\d\d)?)?/,
        new RegExp(`(\\.(${releaseRegex.source}))?`),
        /(\.(HardSub|SoftSub|dubbed))?/,
        /(\.\s\(.+\))?/,
        /( - ((\d\d\d?MB)|(\d(\.\d\d?)?GB)))?$/,
    ].map(item => item.source).join(''));

    const badLinks = downloadLinks.filter(item =>
        !item.info.match(linkInfoRegex) &&
        !item.info.match(golchindlMovieLinkInfoRegex)
    );

    const badSeasonEpisode = downloadLinks.filter(item => item.season > 47 || item.episode > 400);

    console.log([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}
