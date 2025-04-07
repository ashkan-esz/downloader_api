import * as cheerio from 'cheerio';
import inquirer from "inquirer";
import isEqual from 'lodash.isequal';
import {getSourcePagesSamples, updateSourcePageData} from "../samples/sourcePages/sourcePagesSample.js";
import {sourcesNames} from "../sourcesArray.js";
import {removeDuplicateLinks} from "../utils/utils.js";
import {saveError} from "../../error/saveError.js";
import {hasSidebarClass} from "../sources/generic.js";


export function getTrailers($, pageLink, sourceName, trailerVpnStatus) {
    try {
        let result = [];
        const $video = $('video');
        const $div = $('div');
        const $a = $('a');

        //bia2anime|bia2hd|golchindl
        if (sourceName !== 'film2movie') {
            for (let i = 0, len = $video.length; i < len; i++) {
                const sourceChild = $($video[i]).children()[0];
                if (sourceChild && sourceChild.attribs?.src) {
                    const src = sourceChild.attribs.src
                        .replace('دانلود', '')
                        .replace('دانلو', '');
                    result.push(purgeTrailer(src, pageLink, sourceName, '720p', trailerVpnStatus));
                }
            }
        }

        //digimoviez
        for (let i = 0, len = $div.length; i < len; i++) {
            if ($($div[i]).hasClass('on_trailer_bottom')) {
                const src = $div[i].attribs['data-trailerlink'];
                if (src && src.toLowerCase().includes('trailer') && !hasSidebarClass($($div[i]), ['related'])) {
                    result.push(purgeTrailer(src, pageLink, sourceName, '720p', trailerVpnStatus));
                }
            }
        }

        //film2movie|golchindl|salamdl
        for (let i = 0, len = $a.length; i < len; i++) {
            let src = $($a[i]).attr('href');
            if (src && src.toLowerCase().includes('trailer') && !hasSidebarClass($($a[i]), ['related'])) {
                if (src.includes('.mp4') || src.includes('.mkv')) {
                    src = src.replace('rel=', '');
                    result.push(purgeTrailer(src, pageLink, sourceName, '', trailerVpnStatus));
                }
            }
        }

        //avamovie|salamdl|vipo
        for (let i = 0, len = $a.length; i < len; i++) {
            const src = $a[i].attribs.href || $a[i].attribs.src;
            const text = $($a[i]).text() || '';
            if (src && !hasSidebarClass($($a[i]), ['related'])) {
                if (
                    (text.includes('تریلر') && src.toLowerCase().includes('/trailer/')) ||
                    (src.match(/\.trailer\.mp4$/i))
                ) {
                    result.push(purgeTrailer(src, pageLink, sourceName, '720p', trailerVpnStatus));
                }
            }
        }

        //f2m
        for (let i = 0, len = $video.length; i < len; i++) {
            const src = $video[i].attribs.href || $video[i].attribs.src;
            const text = $($video[i]).text() || '';
            if (src && !hasSidebarClass($($video[i]), ['related'])) {
                if (
                    (text.includes('تریلر') && src.toLowerCase().includes('/trailer/')) ||
                    (src.match(/OFFICIAL([.\-_])?TRAILER/i) || src.match(/[._-](trailer|teaser|seasonTeaser)(\d)?\.mp4$/i) || src.match(/\.s\d+\.mp4$/i))
                ) {
                    result.push(purgeTrailer(src, pageLink, sourceName, '720p', trailerVpnStatus));
                }
            }
        }

        result = removeDuplicateLinks(result.filter(item => item !== null));
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function purgeTrailer(url, pageLink, sourceName, quality, vpnStatus) {
    if (
        url.includes('media-imdb.com') ||
        url.includes('aparat.com') ||
        url.includes('imdb.com') ||
        url.startsWith("ftp:") ||
        url.match(/[\/._-]comment\./) ||
        url.match(/[\/._-]new-[a-z]+\./) ||
        url.match(/\.(jpe?g|png)$/)
    ) {
        return null;
    }

    url = url.trim().replace(/\s/g, '%20');

    if (!url.startsWith('http')) {
        //relative links
        url = pageLink.split(/(?<=([a-zA-Z\d])\/)/g)[0] + url.replace(/^\//, '');
    }

    if (sourceName === "film2movie") {
        //from: https://dl200.ftk.pw/?s=7&f=/trailer/***.mp4
        //to: https://dl7.ftk.pw/trailer/***.mp4
        let temp = url.match(/\/\?s=\d+&f=(?=(\/(trailer|user|serial)))/gi);
        if (temp) {
            const match = temp.pop();
            const number = Number(match.match(/\d+/g).pop());
            url = url.replace(/(?<=dl)\d+(?=\.)/, number).replace(match, '');
        }
    }

    if (!quality) {
        const qualityMatch = url.match(/(\d\d\d\d?p)|((?<=_)\d\d\d\d?(?=\.))/g);
        if (qualityMatch) {
            quality = qualityMatch.pop();
            if (Number(quality) > 1080) {
                quality = (url.includes('.72p.') || url.toLowerCase().includes('hd')) ? '720p' : '480p';
            }
        } else {
            if (url.toLowerCase().includes('4k')) {
                quality = '2160p';
            } else {
                quality = (url.includes('.72p.') || url.toLowerCase().includes('hd')) ? '720p' : '480p';
            }
        }
        if (!quality.endsWith('p')) {
            quality += 'p';
        }
        quality = quality
            .replace('7200p', '720p')
            .replace('700p', '720p')
            .replace('3600p', '360p');
    }
    return ({
        url: url.replace(/\?_=\d+$/g, ''),
        info: sourceName + '-' + quality,
        vpnStatus: vpnStatus,
    });
}

export async function comparePrevTrailerWithNewMethod(sourceName = null, updateMode = true, autoUpdateIfNeed = false) {
    let stats = {
        total: 0,
        checked: 0,
        diffs: 0,
        updated: 0,
    };
    try {
        console.log('------------- START OF (comparePrevTrailerWithNewMethod) -----------');
        let sources = sourceName || sourcesNames;
        console.time('comparePrevTrailerWithNewMethod');
        for (let i = 0; i < sources.length; i++) {
            console.log(`------------- START OF (comparePrevTrailerWithNewMethod [${sources[i]}]) -----------`);
            let sourcePages = [];
            let start = 1;
            let lastFileIndex = 1;
            while (true) {
                sourcePages = await getSourcePagesSamples(sources[i], start, start);
                start++;
                if (sourcePages.length === 0) {
                    console.log(`------------- END OF (comparePrevTrailerWithNewMethod [${sources[i]}]) -----------`);
                    break;
                }
                stats.total += sourcePages.length;

                for (let j = 0; j < sourcePages.length; j++) {
                    if (lastFileIndex !== sourcePages[j].fileIndex) {
                        lastFileIndex = sourcePages[j].fileIndex;
                        console.log(`------------- START OF [${sources[i]}] -fileIndex:${lastFileIndex} -----------`);
                    }
                    stats.checked++;
                    let {sourceName: sName, trailers, pageContent} = sourcePages[j];
                    let $ = cheerio.load(pageContent);
                    const newTrailers = getTrailers($, "", sName, 'noVpn');

                    if (!isEqual(trailers, newTrailers)) {
                        let {sourceName: sName, fileIndex, title, type, pageLink} = sourcePages[j];
                        console.log(sName, '|', fileIndex, '|', stats.checked + '/' + stats.total, '|', title, '|', type, '|', pageLink);
                        console.log({
                            ps1: trailers,
                            ps2: newTrailers,
                        });
                        stats.diffs++;

                        if (updateMode) {
                            let checkUpdateIsNeededResult = checkUpdateIsNeeded(trailers, newTrailers);
                            if (checkUpdateIsNeededResult && autoUpdateIfNeed) {
                                console.log('------ semi manual update');
                                sourcePages[j].trailers = newTrailers;
                                await updateSourcePageData(sourcePages[j], ["trailers"]);
                                stats.updated++;
                                continue;
                            }

                            const questions = [
                                {
                                    type: 'list',
                                    name: 'ans',
                                    message: `update this movie data? [checkUpdateIsNeeded=${checkUpdateIsNeededResult}]`,
                                    choices: ["Yes", "No"],
                                },
                            ];
                            console.log();
                            let answers = await inquirer.prompt(questions);
                            if (answers.ans.toLowerCase() === 'yes') {
                                stats.updated++;
                                sourcePages[j].trailers = newTrailers;
                                await updateSourcePageData(sourcePages[j], ["trailers"]);
                            }
                            console.log();
                        }
                        console.log('-------------------------');
                        console.log('-------------------------');
                    }
                }
            }
        }
        console.timeEnd('comparePrevTrailerWithNewMethod');
        console.log(JSON.stringify(stats));
        console.log('------------- END OF (comparePrevTrailerWithNewMethod) -----------');
        return stats;
    } catch (error) {
        saveError(error);
        return stats;
    }
}

function checkUpdateIsNeeded(trailers, newTrailers) {

    return (
        (trailers.length === 0 && newTrailers.length > 0)
    );
}
