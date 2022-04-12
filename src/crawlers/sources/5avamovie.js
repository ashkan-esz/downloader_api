import config from "../../config";
import {search_in_title_page, wrapper_module} from "../searchTools";
import {
    getTitleAndYear,
    validateYear,
    getType,
    checkDubbed,
    checkHardSub,
    replacePersianNumbers,
} from "../utils";
import {
    purgeEncoderText,
    purgeSizeText,
    fixLinkInfoOrder,
    fixLinkInfo,
    purgeQualityText,
    linkInfoRegex
} from "../linkInfoUtils";
import save from "../save_changes_db";
import {saveError} from "../../error/saveError";

const sourceName = "avamovie";
const needHeadlessBrowser = true;

export default async function avamovie({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, serial_url, serial_page_count, search_title);
    await wrapper_module(sourceName, needHeadlessBrowser, movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.parent()[0].name === 'h2') {
            let year;
            let pageLink = link.attr('href');
            let type = getType(title);
            if (config.nodeEnv === 'dev') {
                console.log(`avamovie/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies} = pageSearchResult;
                    if (!year) {
                        year = fixYear($2);
                    }

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

function fixYear($) {
    try {
        let postInfo = $('li:contains("سال های پخش")');
        if (postInfo.length === 0) {
            postInfo = $('li:contains("سال انتشار")');
        }
        if (postInfo.length === 1) {
            let temp = $(postInfo).text().replace('سال های پخش', '').replace('سال انتشار', '').toLowerCase().trim();
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

function getPersianSummary($) {
    try {
        let $p = $('p');
        for (let i = 0; i < $p.length; i++) {
            if ($($p[i]).text().includes('خلاصه داستان')) {
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
        let $img = $('img');
        for (let i = 0; i < $img.length; i++) {
            let parent = $img[i].parent;
            if (parent.name === 'a' && $($img[i]).hasClass('wp-post-image')) {
                let href = $img[i].attribs['src'];
                if (href.includes('uploads')) {
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
            let child = $($a[i]).children()[0];
            if ($(child).text().includes('دانلود تریلر') && href && href.includes('.mp4')) {
                result.push({
                    url: href,
                    info: 'avamovie-720p',
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
    let infoNodeChildren = $($(link).parent().parent().parent().prev().children()[0]).children();
    let hardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = replacePersianNumbers($(infoNodeChildren[2]).text());
    quality = purgeQualityText(quality).split(/\s\s*/g).reverse().join('.');
    let size = $(infoNodeChildren[3]).text();
    if (size.includes('حجم')) {
        size = purgeSizeText(size);
    } else if (infoNodeChildren.length > 4) {
        size = purgeSizeText($(infoNodeChildren[4]).text());
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
    let infoNodeChildren = $($(link).parent().prev().children()[0]).children();
    let linkHref = $(link).attr('href');
    let hardSub = checkHardSub(linkHref) ? 'HardSub' : '';
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';
    let quality = replacePersianNumbers($(infoNodeChildren[0]).text());
    quality = purgeQualityText(quality).replace(' HD', '').split(' ').reverse().join('.');
    let encoder = '';
    let size = $(infoNodeChildren[2]).text();
    if (size.includes('حجم')) {
        size = purgeSizeText(size);
    } else if (infoNodeChildren.length === 3 && size.includes('انکودر')) {
        encoder = purgeEncoderText(size);
        if (encoder.match(/\d+(\.\d+)? (mb|gb)/i)) {
            encoder = '';
            size = purgeSizeText(encoder);
        } else {
            size = '';
        }
    } else if (infoNodeChildren.length > 3) {
        encoder = purgeEncoderText($(infoNodeChildren[2]).text());
        size = purgeSizeText($(infoNodeChildren[3]).text());
        if (encoder.toUpperCase() + 'MB' === size) {
            size = '';
        }
    }
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    info = fixLinkInfo(info, linkHref);
    info = fixLinkInfoOrder(info);
    info = info.replace('GalaxyRGAvaMovie','GalaxyRG');
    return [info, size].filter(value => value).join(' - ');
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
