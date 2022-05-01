import config from "../../../config/index.js";
import {search_in_title_page, wrapper_module,} from "../../searchTools.js";
import {getTitleAndYear, getType} from "../../utils.js";
import save from "../../save_changes_db.js";
import * as persianRex from "persian-rex";
import {saveError} from "../../../error/saveError.js";

const sourceName = "topmovies";
const needHeadlessBrowser = false;

export default async function topmovies({movie_url, serial_url, page_count, serial_page_count}) {
    await wrapper_module(sourceName, needHeadlessBrowser, serial_url, serial_page_count, search_title);
    await wrapper_module(sourceName, needHeadlessBrowser, movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.children().length === 0 &&
            title.toLowerCase().replace(/\s/g, '') ===
            link.text().toLowerCase().replace(/\s/g, '')) {
            let year;
            let type = getType(title);
            let pageLink = link.attr('href');
            if (config.nodeEnv === 'dev') {
                console.log(`topmovie/${type}/${i}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceName, title, pageLink, type, getFileData);
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
                            trailers: [],
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
        let divs = $('div');
        for (let i = 0; i < divs.length; i++) {
            if ($(divs[i]).hasClass('summary_text')) {
                let movieName = $($(divs[i]).children()[0]).text();
                return $(divs[i]).text().replace(movieName, '').trim();
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
            if ($(imgs[i]).hasClass('wp-post-image')) {
                let src = imgs[i].attribs['src'];
                let parent = imgs[i].parent.name;
                if (parent === 'a' && src) {
                    return src;
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
    //'480p.WEBRip.HardSub - 180MB'  //'720p.WEB-DL.dubbed - 911.9M'
    //'1080p.BluRay.YTS.HardSub - 1.65G' //'720p.WEB-DL.HardSub - 802.3M'
    try {
        let HardSub = checkHardSub($);
        let link_href = $(link).attr('href').toLowerCase();
        let dubbed = (link_href.includes('farsi.dub') ||
            link_href.includes('duble') ||
            link_href.includes('dubbed')) ? 'dubbed' : HardSub;
        if (type === 'serial') {
            let prevNodeChildren = $(link).parent().parent().parent().parent().prev().children();
            let size = $($(prevNodeChildren[1]).children()[0]).text()
                .replace(/\s/g, '')
                .replace('میانگینحجم:', '');
            let text_array = $(prevNodeChildren[0]).text().trim()
                .replace('»', '')
                .replace(/[\n\t]/g, '')
                .replace('WEB.DL', 'WEB-DL')
                .replace(/\./g, ' ')
                .split(' ').filter(value => value && !persianRex.hasLetter.test(value));
            let info = [text_array[0], ...text_array.slice(2), text_array[1], dubbed].filter(value => value !== '').join('.');
            return [info, size].filter(value => value !== '').join(' - ');
        }

        let prevNodeChildren = $(link).parent().parent().prev().children();
        let size = $(prevNodeChildren[0]).text().replace(/\s/g, '').replace('حجم:', '');
        let text_childs = $(prevNodeChildren[1]).children();
        if ($(text_childs[0]).text().includes('زیرنویس فارسی به زودی')) {
            dubbed = (dubbed === "dubbed") ? "dubbed" : '';
        }
        let quality = $(text_childs[0]).text().split(' ').filter((text) => !persianRex.hasLetter.test(text));
        let encoder = $(text_childs[2]).text().replace('Encoder:', '').replace(/\s/g, '');
        let info = [quality[0], ...quality.slice(2), quality[1], encoder, dubbed].filter(value => value).join('.');
        return [info, size].filter(value => value !== '').join(' - ');
    } catch (error) {
        saveError(error);
        return "";
    }
}

function checkHardSub($) {
    let HardSub = "";
    let divs = $('div');
    for (let i = 0; i < divs.length; i++) {
        if ($(divs[i]).hasClass('item_dl_title') ||
            $(divs[i]).hasClass('btn_tab_series_dl')) {
            let text = $(divs[i]).text();
            if (text.includes('زیرنویس فارسی چسبیده')) {
                HardSub = 'HardSub';
                break;
            }
        }
    }
    return HardSub;
}
