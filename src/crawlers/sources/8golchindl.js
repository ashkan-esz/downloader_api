import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    removeDuplicateLinks,
    getDecodedLink,
    replacePersianNumbers,
} from "../utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {
    encodersRegex,
    fixLinkInfo,
    fixLinkInfoOrder,
    linkInfoRegex,
    purgeEncoderText,
    purgeQualityText,
    purgeSizeText,
    releaseRegex,
    specialWords
} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import * as persianRex from "persian-rex";
import save from "../save_changes_db.js";
import {saveError} from "../../error/saveError.js";

export const sourceConfig = Object.freeze({
    sourceName: "golchindl",
    needHeadlessBrowser: false,
    sourceAuthStatus: 'ok',
    vpnStatus: Object.freeze({
        poster: 'allOk',
        trailer: 'allOk',
        downloadLink: 'allOk',
    }),
});

export default async function golchindl({movie_url, page_count}) {
    let p1 = await wrapper_module(sourceConfig, movie_url, page_count, search_title);
    return [p1];
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
                title.includes('جومونگ') ||
                title.includes('دانلود بازی')
            ) {
                return;
            }
            title = title.replace('پلی استیشن 5', '').replace(/\(.+\)$/, '');
            let isCeremony = title.includes('دانلود مراسم');
            let isCollection = title.includes('کالکشن فیلم') || title.includes('کالکشن انیمیشن');
            ({title, year} = getTitleAndYear(title, year, type));

            if (!year) {
                year = fixYear($, link);
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData,
                    null, null, false,
                    extraSearchMatch, extraSearch_getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
                    type = fixAnimeType($2, type);
                    if (type.includes('serial') && downloadLinks.length > 0 &&
                        downloadLinks[0].link.replace(/\.(mkv|mp4)|\.HardSub|\.x264|:/gi, '') === downloadLinks[0].info.replace(/\.HardSub|\.x264/gi, '')) {
                        type = type.replace('serial', 'movie');
                        pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData,
                            null, null, false,
                            extraSearchMatch, extraSearch_getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
                    }
                    if (type.includes('movie') && downloadLinks.length > 0 && downloadLinks[0].link.match(/s\d+e\d+/gi)) {
                        type = type.replace('movie', 'serial');
                        pageSearchResult = await search_in_title_page(sourceConfig, title, pageLink, type, getFileData,
                            null, null, false,
                            extraSearchMatch, extraSearch_getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
                    }
                    downloadLinks = removeDuplicateLinks(downloadLinks);
                    if (isCollection) {
                        title += ' collection';
                        addTitleNameToInfo(downloadLinks);
                    } else if (isCeremony) {
                        addTitleNameToInfo(downloadLinks);
                    }

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

function fixAnimeType($, type) {
    try {
        if (type.includes('anime')) {
            return type;
        }
        let details = $('.details')?.text().toLowerCase() || '';
        if (details.includes('انیمیشن') && (details.includes('کشور سازنده :japan') || details.includes('زبان :japan'))) {
            return 'anime_' + type;
        }
        return type;
    } catch (error) {
        saveError(error);
        return type;
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

    let info = [quality, bit10, encoder, hardSub, dubbed].filter(value => value).join('.').replace(/\.+/g, '.');
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

//------------------------------------------------
//------------------------------------------------

function extraSearchMatch($, link, title) {
    try {
        let linkHref = replacePersianNumbers(getDecodedLink($(link).attr('href'))).toLowerCase();

        if (linkHref.includes('/sub/download/') ||
            linkHref.includes('/movie_cats/') ||
            linkHref.includes('/sound/') ||
            linkHref.includes('/audio/') ||
            linkHref.match(/mka|mkv|mp4|avi|mov|flv|wmv/) ||
            linkHref.match(/((\/sub)|(\.(mkv|zip))|([?#](v-c|comment)[=_-]\d+))$/)) {
            return false;
        }
        if (
            linkHref.match(/\/((\d\d\d+p(\s?bd)?)|(specials?))$/i) ||
            replacePersianNumbers($(link).text()).match(/\d+\s*&\s*\d+/i)
        ) {
            return true;
        }

        title = title.replace(/\*/g, '\\*');
        return (
            !!linkHref.match(/\/s\d+\/(.*\/?((\d{3,4}p(\.x265)?)|(DVDRip))\/)?$/i) ||
            !!linkHref.match(new RegExp(`${title .replace(/\*/g, '\\*')}\\/\\d+p(\\.x265)?\\/`)) ||
            !!linkHref.match(new RegExp(`${title.replace(/\s+/g, '.') .replace(/\*/g, '\\*')}\\/\\d+p(\\.x265)?\\/`)) ||
            !!linkHref.match(new RegExp(`\\/serial\\/${title.replace(/\s+/g, '.') .replace(/\*/g, '\\*')}\\/$`)) ||
            !!linkHref.match(/\/(duble|dubbed)\//i) ||
            !!linkHref.match(/\/(HardSub|SoftSub|dubbed|duble|(Zaban\.Asli))\/\d+-(\d+)?\/(\d\d\d\d?p(\.x265)?\/)?/i) ||
            !!linkHref.match(/\/(HardSub|SoftSub|dubbed|duble|(Zaban\.Asli))\/\d\d\d\d?p(\.x265)?\/?/i)
        );
    } catch (error) {
        saveError(error);
        return false;
    }
}

function extraSearch_getFileData($, link, type, sourceLinkData, title) {
    try {
        let linkHref = getDecodedLink($(link).attr('href'));
        let pageHref = $(sourceLinkData.link).attr('href');
        let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
        let bit10 = linkHref.includes('10bit') ? '10bit' : '';

        let quality = getQualityFromLinkHref(linkHref, title);
        quality = removeEpisodeNameFromQuality(quality);

        quality = purgeQualityText(quality)
            .replace(/(\.nf)?(\.ss)?\.(((Dub)?Golchi?n\.?dl?n?(fa)?(\.\d)?\d?)|RMTGolchindl|GolchinMusics|Golchuindl)(_\d)?/gi, '')
            .replace(/(\.nf)?(\.ss)?\.(NightMovie|AvaMovie|Sas?ber(Fun)?|ValaMovi?e|DayMovie|Bia2M|MrMovie|(filmb(\.in)?)|Amazon|net|BWBP+|2CH)(_\d)?/gi, '')
            .replace('REAL.', '')
            .replace('DD%202.0.H.264monkee', 'monkee')
            .replace('[AioFilm.com]', '');

        let hardSub = quality.match(/softsub|hardsub/gi) ||
            linkHref.match(/softsub|hardsub/gi) ||
            pageHref.match(/softsub|hardsub/gi);
        hardSub = hardSub ? hardSub[0] : checkHardSub(linkHref) ? 'HardSub' : '';

        let info = [quality, bit10, hardSub, dubbed].filter(value => value).join('.')
        info = fixLinkInfo(info, linkHref);
        info = fixLinkInfoOrder(info);
        info = info
            .replace('HardSub.dubbed', 'dubbed')
            .replace(/\.Www\.DownloadSpeed\.iR/i, '')
            .replace('.Golchindl', '')
            .replace(/\.ATVP\.GalaxyTV/i, '.GalaxyTV')
            .replace(/\.DIMENSION\.pahe/i, '');
        if (!info.match(/^\d\d\d\d?p/)) {
            let t = info;
            info = info.replace(/.+(?=(\d\d\d\dp))/, '');
            if (t === info) {
                info = info.replace(/.+(?=(\d\d\dp))/, '');
            }
        }
        if (!hardSub && pageHref.match(/duble/i) && !info.includes('dubbed')) {
            info = info + '.dubbed';
        }
        let sizeMatch = info.match(/\.\d+MB(?=(\.|$))/i);
        if (sizeMatch) {
            info = info.replace(new RegExp('\\' + sizeMatch[0].replace(/\*/g, '\\*'), 'gi'), '');
            info = info + ' - ' + sizeMatch[0].replace('.', '');
        }
        if (info.includes('https')) {
            return 'ignore';
        }
        return info;
    } catch (error) {
        saveError(error);
        return 'ignore';
    }
}

function getQualityFromLinkHref(linkHref, title) {
    let splitLinkHref = linkHref
        .replace(/\s+/g, '.')
        .replace(/(\.-\.)/, '.')
        .replace(/\.+/g, '.')
        .replace(/,/g, '')
        .split('.');
    splitLinkHref.pop();

    let seasonEpisodeIndex = splitLinkHref.findIndex((value => value.match(/(?<!\/)s\d+[._-]?(e\d+)?/gi) || value.match(/Ep?\d+/i)));
    if (seasonEpisodeIndex === -1) {
        let numbers = splitLinkHref.filter(item => !isNaN(item));
        if (numbers.length === 1) {
            seasonEpisodeIndex = splitLinkHref.indexOf(numbers[0]);
        }
    }

    if (seasonEpisodeIndex === splitLinkHref.length - 1) {
        seasonEpisodeIndex--;
    }

    return splitLinkHref.slice(seasonEpisodeIndex + 1).join('.')
        .replace(/\d\d\d\d?\.p/, res => res.replace('.p', 'p.'))
        .replace(/^E?\d+\./i, '')
        .replace('.HardSub', '')
        .replace('.SoftSub', '')
        .replace('.netDUBLE', '.DUBLE')
        .replace(/\.(DUBE|DIBLE)/i, '.DUBLE')
        .replace('20x264', '')
        .replace(/\.Senario(?=(\.|$))/i, '')
        .replace(/\d\d\d\d?p(?!(\.|\s|$))/i, res => res.replace('p', 'p.'))
        .replace(/(^|\.)s\d+e\d+/i, '')
        .replace(new RegExp('^' + title.replace(/\s+/g, '.').replace(/\*/g, '\\*'), 'i'), '')
        .replace(new RegExp('[.\\/]' + title.replace(/\s+/g, '.').replace(/\*/g, '\\*'), 'i'), '')
        .replace(/\d\d\d\d?p_?\d/, res => res.replace(/_?\d$/, ''))
        .replace(/\.x?264-/i, '.x264.')
        .replace(/(^|\.)10bit/i, '')
        .replace(/\.HQ(?=(\.|$))/i, '')
        .replace(/\.Ohys[.\-]Raws/i, '')
        .replace('.NEW', '')
        .replace(/AC3\.6CH/i, '6CH')
        .replace(/\.5\.1ch/i, '')
        .replace(/ITALIAN|i_c|pcok|(O\.Ye\.of\.Little\.Faith\.Father\.NF\.)/i, '')
        .replace(/\.(STAN|Keyword|TagName|((ctu|real|proper|in|GMEB)(?=(\.|$))))/gi, '')
        .replace('AHDTV', 'HDTV')
        .replace(/\.[876]ch/i, res => res.toUpperCase())
        .replace(/\.Zaban\.Asli/i, '')
        .replace('.(Kor)', '')
        .replace(/(^|\.)((Fifteen\.Minutes\.of\.Shame)|(The\.Gift)|(Beyond\.the\.Aquila\.Rift))/i, '')
        .replace(/\.?\(Film2serial\.ir\)/i, '')
        .replace(/[_\-]/g, '.').replace(/\.+/g, '.').replace(/^\./, '');
}

function removeEpisodeNameFromQuality(quality) {
    quality = quality.replace(/(^|\.)(silence|Joyeux|problème|loki)/gi, '');
    let tempQuality = quality.replace(/(^|\.)((DVDRip)|(Not\.Sub(bed)?)|(Special)|(Part\.\d+))/gi, '');
    const specialWordsRegex = new RegExp(`(\\d\\d\\d\\d?p)|(${releaseRegex.source})|(${encodersRegex.source})|(${specialWords.source})`);

    if (tempQuality && !tempQuality.match(specialWordsRegex)) {
        let splitTempQuality = tempQuality.split('.');
        for (let i = 0; i < splitTempQuality.length; i++) {
            quality = quality.replace(splitTempQuality[i], '');
        }
        quality = quality.replace(/\.+/g, '.').replace(/(^\.)|(\.$)/g, '');
    } else {
        let tempQuality2 = quality.split(/\.\d\d\d\d?p/)[0].replace(/(^|\.)((DVDRip)|(Not\.Sub(bed)?)|(Special)|(Part\.\d+))/gi, '');
        if (tempQuality2 && tempQuality2.split('.').length > 0 && !tempQuality2.match(specialWordsRegex)) {
            let splitTempQuality = tempQuality2.split('.');
            for (let i = 0; i < splitTempQuality.length; i++) {
                quality = quality.replace(splitTempQuality[i], '');
            }
            quality = quality.replace(/\.+/g, '.').replace(/(^\.)|(\.$)/g, '');
        }
    }
    return quality;
}

//------------------------------------------------
//------------------------------------------------

function printLinksWithBadInfo(downloadLinks) {
    const golchindlMovieLinkInfoRegex = new RegExp([
        /^\d\d\d\d?p/,
        /(\.Episode\(\d\d?\d?-\d\d?\d?\))?/,
        /(\.Episode\(\d\d?\.5\))?/,
        /(\.x265(\.10bit)?)?/,
        /(\.(Special|OVA|NCED|NCOP)(_\d)?)?/,
        /(\.Summary)?/,
        /(\.Oscar(\.\d\d\d\d)?)?/,
        /(\.REPACK)?/,
        new RegExp(`(\\.(${releaseRegex.source}))?`),
        /(\.[876]CH)?/,
        new RegExp(`(\\.(${encodersRegex.source}))?`),
        /(\.[876]CH)?/,
        /(\.(HardSub|SoftSub|dubbed))?/,
        /(\.\s\(.+\))?/,
        /(\.\d+[A-Da-d])?/,
        /( - ((\d\d\d?MB)|(\d(\.\d\d?)?GB)))?$/,
    ].map(item => item.source).join(''));

    const badLinks = downloadLinks.filter(item =>
        !item.info.match(linkInfoRegex) &&
        !item.info.match(golchindlMovieLinkInfoRegex)
    );

    const badSeasonEpisode = downloadLinks.filter(item => item.season > 47 || item.episode > 1300);

    console.log([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}
