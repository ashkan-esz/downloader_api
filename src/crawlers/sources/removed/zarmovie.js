import config from "../../../config";
import {search_in_title_page, wrapper_module} from "../../searchTools";
import {
    getTitleAndYear,
    getType,
    removeDuplicateLinks,
    checkHardSub,
    checkDubbed,
    purgeQualityText,
    purgeSizeText,
    purgeEncoderText,
} from "../../utils";
import save from "../../save_changes_db";
import {saveError} from "../../../error/saveError";

const sourceName = "zarmovie";

export default async function zarmovie({movie_url, serial_url, page_count, serial_page_count}) {
    // await wrapper_module(sourceName, serial_url, serial_page_count, search_title);
    await wrapper_module(sourceName, movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.text().includes('دانلود')) {
            let pageLink = link.attr('href');
            let year;
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`zarmovie/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, pageLink, type, getFileData, getQualitySample);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
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
    } catch (error) {
        saveError(error);
    }
}

function getPersianSummary($) {
    try {
        let $p = $('p');
        for (let i = 0; i < $p.length; i++) {
            if ($($p[i]).text().includes('خلاصه داستان :')) {
                return $($p[i]).text().replace('خلاصه داستان :', '').trim();
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
        let imgs = $('img');
        for (let i = 0; i < imgs.length; i++) {
            let parent = imgs[i].parent;
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
        let a = $('a');
        for (let i = 0; i < a.length; i++) {
            let title = $(a[i]).attr('title');
            let text = $(a[i]).text();
            if (title && title.toLowerCase().includes('پخش آنلاین') && text.includes('مشاهده تریلر')) {
                let href = $(a[i]).attr('href');
                result.push({
                    url: href,
                    info: 'zarmovie-720p'
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
    // '720p.Bluray.YIFY.HardSub - 1.74GB' // '1080p.Web-Dl.GalaxyRG.HardSub - 797.08MB'
    //'1080p.x265.Bluray.PSA.HardSub - 2.16GB' // '1080p.x265.10bit.WEB-DL.HardSub - 300MB'
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
    let infoNodeChildren = $(link).parent().parent().parent().parent().prev().children();
    let hardSub = checkHardSub($(infoNodeChildren[0]).text()) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), $(infoNodeChildren[0]).text()) ? 'dubbed' : '';
    if (hardSub || dubbed) {
        infoNodeChildren = infoNodeChildren.slice(1);
    }
    let qualityEncode = $(infoNodeChildren[0]).text().replace('WEB-DL - HDTV', 'WEB-DL').split(' - ');
    let qualityText = purgeQualityText(qualityEncode[0]).split(' ');
    let quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
    let encoder = qualityEncode.length > 1 ? purgeEncoderText(qualityEncode[1]) : '';
    let size = purgeSizeText($(infoNodeChildren[2]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function getFileData_movie($, link) {
    let infoNodeChildren = $(link).parent().prev().children();
    let linkHref = $(link).attr('href');
    let hardSub = (checkHardSub(linkHref) || checkHardSub($(infoNodeChildren[0]).text())) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, $(infoNodeChildren[0]).text()) ? 'dubbed' : '';
    if (hardSub && dubbed) {
        infoNodeChildren = infoNodeChildren.slice(2);
    } else if (hardSub || dubbed) {
        infoNodeChildren = infoNodeChildren.slice(1);
    }
    let qualityText = purgeQualityText($(infoNodeChildren[0]).text()).split(' ');
    let quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
    if (!quality) {
        let splitLinkHref = linkHref.split('.');
        splitLinkHref.pop();
        splitLinkHref.pop();
        let seasonEpisodeIndex = splitLinkHref.findIndex((value => value.match(/\d\d\d\dp|\d\d\dp/g)));
        quality = splitLinkHref.slice(seasonEpisodeIndex).join('.').replace('.HardSub', '');
    }
    let size = purgeSizeText($(infoNodeChildren[1]).text());
    let encoder = purgeEncoderText($(infoNodeChildren[3]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    info = info.replace('.MkvCage.MkvCage', '.MkvCage');
    if (info.startsWith('FULL-HD')) {
        let resolution = linkHref.match(/\d\d\d+p/g);
        if (resolution) {
            info = resolution.pop() + '.' + info;
        }
    }
    return [info, size].filter(value => value).join(' - ');
}

function getQualitySample($, link, type) {
    try {
        if (type.includes('serial')) {
            return '';
        }
        let nextNode = $(link).next()[0];
        if (nextNode) {
            let sampleUrl = nextNode.attribs['data-imgqu'];
            if (sampleUrl && sampleUrl.includes('.jpg')) {
                return sampleUrl;
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}
