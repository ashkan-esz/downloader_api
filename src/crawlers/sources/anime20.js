import config from "../../config/index.js";
import {search_in_title_page, wrapper_module} from "../searchTools.js";
import {getType, removeDuplicateLinks, replacePersianNumbers} from "../utils/utils.js";
import {getTitleAndYear} from "../movieTitle.js";
import {purgeSizeText, fixLinkInfoOrder, fixLinkInfo, addDubAndSub} from "../linkInfoUtils.js";
import {posterExtractor, summaryExtractor, trailerExtractor} from "../extractors/index.js";
import save from "../save_changes_db.js";
import {saveError} from "../../error/saveError.js";

export const sourceConfig = Object.freeze({
    sourceName: "anime20",
    needHeadlessBrowser: false,
    sourceAuthStatus: 'ok',
    vpnStatus: Object.freeze({
        poster: 'allOk',
        trailer: 'allOk',
        downloadLink: 'allOk',
    }),
    replaceInfoOnDuplicate: true,
});

export default async function anime20({movie_url}, pageCount) {
    let p1 = await wrapper_module(sourceConfig, movie_url, pageCount, search_title);
    return [p1];
}

async function search_title(link, pageNumber, $, url) {
    try {
        let title = link.text();
        if (title && link.parent()[0].name === 'div' && link.parent().hasClass('post_small_title')) {
            let year;
            let pageLink = link.attr('href');
            let type = getType(title);
            if (type.includes('movie') && url.includes('/series/')) {
                type = type.replace('movie', 'serial');
            }
            if (config.nodeEnv === 'dev') {
                console.log(`anime20/${type}/${pageNumber}/${title}  ========>  `);
            }
            ({title, year} = getTitleAndYear(title, year, type));

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(sourceConfig, title, type, pageLink, pageNumber, getFileData);
                if (pageSearchResult) {
                    let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
                    if (type.includes('serial') && downloadLinks.length > 0 && downloadLinks.every(item => item.season === 1 && item.episode === 0)) {
                        type = type.replace('serial', 'movie');
                        pageSearchResult = await search_in_title_page(sourceConfig, title, type, pageLink, pageNumber, getFileData);
                        if (!pageSearchResult) {
                            return;
                        }
                        ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
                    }

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

                    await save(title, type, year, sourceData, pageNumber);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

export async function handlePageCrawler(pageLink, title, type, pageNumber = 0) {
    try {
        title = title.toLowerCase();
        let year;
        ({title, year} = getTitleAndYear(title, year, type));

        let pageSearchResult = await search_in_title_page(sourceConfig, title, type, pageLink, pageNumber, getFileData);
        if (pageSearchResult) {
            let {downloadLinks, $2, cookies, pageContent} = pageSearchResult;
            if (type.includes('serial') && downloadLinks.length > 0 && downloadLinks.every(item => item.season === 1 && item.episode === 0)) {
                type = type.replace('serial', 'movie');
                pageSearchResult = await search_in_title_page(sourceConfig, title, type, pageLink, pageNumber, getFileData);
                if (!pageSearchResult) {
                    return;
                }
                ({downloadLinks, $2, cookies, pageContent} = pageSearchResult);
            }

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
            await save(title, type, year, sourceData, pageNumber);
            return downloadLinks.length;
        }
        return 0;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export function getFileData($, link, type) {
    try {
        const infoNodeChildrenText = $($($(link).parent().prev()).children()).text();
        const sizeText = $($($(link).parent().prev()).children()[1]).text();
        const size = purgeSizeText(replacePersianNumbers(sizeText));
        const sub = addDubAndSub(infoNodeChildrenText, '');
        let info = fixLinkInfo(sub, $(link).attr('href'), type);
        info = fixLinkInfoOrder(info);
        return [info, size].filter(Boolean).join(' - ');
    } catch (error) {
        saveError(error);
        return '';
    }
}
