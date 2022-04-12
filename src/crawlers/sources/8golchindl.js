import config from "../../config";
import {search_in_title_page, wrapper_module} from "../searchTools";
import {
    getTitleAndYear,
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks
} from "../utils";
import {purgeEncoderText, purgeSizeText, purgeQualityText, linkInfoRegex} from "../linkInfoUtils";
import * as persianRex from "persian-rex";
import save from "../save_changes_db";
import {saveError} from "../../error/saveError";

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
        let name = nameMatch ? nameMatch.pop().replace(/(\d\d\d\d|\d\d\d)p|hdtv/gi, '').replace(/\.|%20/g, ' ').trim() : '';
        if (!name) {
            continue;
        }
        let splitInfo = downloadLinks[i].info.split(' - ');
        if (splitInfo.length === 1) {
            downloadLinks[i].info += ' (' + name + ')';
        } else {
            downloadLinks[i].info = splitInfo[0] + ' (' + name + ')' + ' - ' + splitInfo[1];
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
    let hardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let bit10 = $(link).attr('href').includes('10bit') ? '10bit' : '';
    let splitInfoText = infoText.split(' – ');
    let quality, encoder;
    if (splitInfoText[0].includes('کیفیت')) {
        let qualityText = splitInfoText[0].split('کیفیت')[1].trim().split(/ |\s/g);
        quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
        quality = purgeQualityText(quality);
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
            .replace('g.', '')
            .replace(/^\d\./, '')
            .replace('x265.720p', '720p.x265')
            .replace('DD%202.0.H.264-monkee', 'monkee')
            .replace('WEB-RIP.hevc.x265', 'x265.WEB-RIP.hevc')
            .replace('REPACK.720p.WEB-DL', '720p.WEB-DL.REPACK');
        encoder = '';
    }
    let linkHrefQualityMatch = linkHref.match(/bluray|webdl|web-dl|webrip|web-rip/gi);
    if (!quality.match(/bluray|webdl|web-dl|webrip|web-rip/gi) && linkHrefQualityMatch) {
        quality = quality + '.' + linkHrefQualityMatch.pop();
        quality = purgeQualityText(quality);
    }
    if (quality === 'DUBLE.Golchindl') {
        let qualityMatch = linkHref.match(/[.\s](\d\d\d\d|\d\d\d)p[.\s]/gi);
        let temp = qualityMatch ? qualityMatch.pop().replace(/[.\s]/g, '') : '480p';
        quality = temp + '.' + 'dubbed';
    }
    if (quality.includes('10bit')) {
        bit10 = '';
    }
    if (quality.toLowerCase().includes('duble') || quality.toLowerCase().includes('dubbed')) {
        dubbed = '';
    }
    let resolution = quality.match(/\d\d\d+p/g);
    if (resolution) {
        quality = quality
            .replace(`x265.${resolution[0]}`, `${resolution[0]}.x265`)
            .replace(`Dl.${resolution[0]}.Web`, `${resolution[0]}.WEB-DL`)
            .replace(`BluRay${resolution[0]}`, `${resolution[0]}.BluRay`);
    }

    quality = quality.replace(/\.Www\.DownloadSpeed\.iR|-NEXT|-DEEP|\.subed|\.subdl|\.\[shahrdl.com]|\.NF|\.DDP2\.0|\.x264/gi, '').trim();
    let multiEpisodeMatch = linkHref.match(/s\d\de\d\d(e\d\d)+/gi);
    let multiEpisode = multiEpisodeMatch ? multiEpisodeMatch.pop() : '';
    return [quality, multiEpisode, bit10, encoder, hardSub, dubbed]
        .filter(value => value)
        .join('.')
        .replace(/^REAL\.REPACK\.|^REPACK\./gi, '')
        .replace('WEB-DL.10bit', '10bit.WEB-DL')
        .replace('WEB-RIP.10bit', '10bit.WEB-RIP')
        .replace('10bit.WEB-RIP.2CH.x265', 'x265.10bit.WEB-RIP.2CH')
        .replace('10bit.WEB-RIP.6CH.x265', 'x265.10bit.WEB-RIP.6CH')
        .replace('4K.2160p', '2160p.4K')
        .replace('Farsi.Dubbed', 'dubbed')
        .replace('.Golchindl.net', '')
        .replace('DUBLE', 'dubbed');
}

function getFileData_movie($, link) {
    let linkHref = $(link).attr('href');
    let infoText = getMovieInfoText($, link);
    if (infoText.includes('دانلود پشت صحنه') || $(link).text().includes('دانلود پشت صحنه')) {
        return 'ignore';
    }
    let hardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, infoText) ? 'dubbed' : '';
    let quality, encoder, size;
    if (infoText.includes('|')) {
        let splitInfoText = infoText.split('|');
        if (splitInfoText.length === 3) {
            if (splitInfoText[0].includes('کیفیت')) {
                let qualityText = purgeQualityText(splitInfoText[0]).split(' ');
                quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
                if (splitInfoText[1].includes('انکودر')) {
                    encoder = purgeEncoderText(splitInfoText[1]);
                    size = purgeSizeText(splitInfoText[2]);
                } else {
                    size = purgeSizeText(splitInfoText[1]);
                    encoder = purgeEncoderText(splitInfoText[2]);
                }
            } else {
                let qualityText = purgeQualityText(splitInfoText[1]).split(' ');
                quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
                size = purgeSizeText(splitInfoText[2]);
                encoder = '';
            }
        } else {
            let qualityText = splitInfoText[0].trim()
                .split(' ')
                .filter((text) => text && !persianRex.hasLetter.test(text));
            quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
            size = purgeSizeText(splitInfoText[1]);
            encoder = '';
        }
    } else if (infoText.includes(' –') || infoText.includes(' -')) {
        let splitInfoText = infoText.split(/\s[–-]/g);
        if (splitInfoText.length === 3) {
            let qualityText = purgeQualityText(splitInfoText[0]).split(' ');
            quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
            if (splitInfoText[1].includes('انکودر')) {
                encoder = purgeEncoderText(splitInfoText[1]);
                size = purgeSizeText(splitInfoText[2]);
            } else {
                size = purgeSizeText(splitInfoText[1]);
                encoder = purgeEncoderText(splitInfoText[2]);
            }
        } else {
            let qualityText = purgeQualityText(splitInfoText[0]).split(' ');
            quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
            size = purgeSizeText(splitInfoText[1]);
            size = (size.toLowerCase().includes('mb') || size.toLowerCase().includes('gb')) ? size : '';
            encoder = splitInfoText[1].includes('انکودر') ? purgeEncoderText(splitInfoText[1]) : '';
        }
    } else {
        let splitInfoText = infoText.split('حجم');
        let qualityText = purgeQualityText(splitInfoText[0]).split(' ');
        quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
        size = splitInfoText.length > 1 ? purgeSizeText(splitInfoText[1]) : '';
        encoder = '';
    }
    let resolution = quality.match(/\d\d\d+p/g);
    if (resolution) {
        quality = quality
            .replace(`x265.${resolution[0]}`, `${resolution[0]}.x265`)
            .replace(`Dl.${resolution[0]}.Web`, `${resolution[0]}.WEB-DL`)
            .replace(`BluRay.${resolution[0]}`, `${resolution[0]}.BluRay`);
    }

    if (quality.match(/^(web-dl|dvdrip|bluray|br(-)?rip)$/gi) || quality === '') {
        let qualityMatch = linkHref.match(/[.\s](\d\d\d\d|\d\d\d)p[.\s]/gi);
        let temp = qualityMatch ? qualityMatch.pop().replace(/[.\s]/g, '') : '480p';
        if (!temp.toLowerCase().includes('x265') && linkHref.includes('x265')) {
            temp += '.x265';
        }
        quality = quality ? temp + '.' + quality : temp;
    }

    let linkHrefQualityMatch = linkHref.match(/bluray|b\.lu\.ry|webdl|web-dl|webrip|web-rip|br(-)?rip/gi);
    if (quality.match(/^(\d\d\d\d|\d\d\d)p(\.x265)*$/gi) && linkHrefQualityMatch) {
        quality = quality + '.' + linkHrefQualityMatch.pop().replace('b.lu.ry', 'BluRay');
    }

    let matchPart = linkHref.match(/\.part\d\./gi);
    let part = matchPart ? matchPart.pop().replace(/\./g, '') : '';
    let info = [quality, encoder, part, hardSub, dubbed]
        .filter(value => value).join('.')
        .replace('.دوبله فارسی', '')
        .replace('.اختصاصی', '')
        .replace('BluRay.x265', 'x265.BluRay')
        .replace('4K.2160p', '2160p.4K')
        .replace('BluRay1080p', '1080p.BluRay');
    return [info, size].filter(value => value).join(' - ');
}

function getMovieInfoText($, link) {
    let infoText = '';
    let parentName = $(link).parent()[0].name;
    if (parentName !== 'li') {
        let infoNodeChildren = parentName !== 'p'
            ? $($(link).parent().parent().prev().children()[0]).children()[0]
            : $($(link).parent().prev().children()[0]).children()[0];
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
    const badLinks = downloadLinks.filter(item => !item.info.match(linkInfoRegex));

    const badSeasonEpisode = downloadLinks.filter(item => item.season > 40 || item.episode > 400);

    console.log([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}
