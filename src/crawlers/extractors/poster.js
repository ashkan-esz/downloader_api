import config from "../../config/index.js";
import * as cheerio from 'cheerio';
import * as Diff from "diff";
import chalk from 'chalk';
import inquirer from "inquirer";
import {getSourcePagesSamples, updateSourcePageData} from "../samples/sourcePages/sourcePagesSample.js";
import {sourcesNames} from "../sourcesArray.js";
import {saveError} from "../../error/saveError.js";

const badPosterRegex = /https:\/\/image\.salamdl\.[a-zA-Z]+\/t\/p\/w\d+_and_h\d+_bestv\d+/i;

export function getPoster($, sourceName) {
    try {
        const $img = $('img');

        if (sourceName === "golchindl") {
            for (let i = 0, imgLen = $img.length; i < imgLen; i++) {
                const parent = $img[i].parent;
                if (parent.name === 'a' && ($(parent).hasClass('thumb') || $(parent).hasClass('photo'))) {
                    const href = $img[i].attribs['data-lazy-src'] || $img[i].attribs['data-src'] || $img[i].attribs['src'];
                    if (href && (href.includes('uploads') || href.includes('cdn.'))) {
                        return purgePoster(href);
                    }
                }
            }
            return "";
        }

        if (sourceName === "bia2anime" || sourceName === "bia2hd") {
            for (let i = 0, imgLen = $img.length; i < imgLen; i++) {
                if ($($img[i]).hasClass('wp-post-image')) {
                    const src = $img[i].attribs['data-lazy-src'] || $img[i].attribs['data-src'] || $img[i].attribs['src'];
                    if (src && src.includes('uploads')) {
                        return purgePoster(src);
                    }
                }
            }
            return "";
        }

        if (sourceName === "film2movie") {
            for (let i = 0, imgLen = $img.length; i < imgLen; i++) {
                const id = $($img[i]).attr('id');
                const alt = $img[i].attribs.alt;
                const src = $img[i].attribs['data-lazy-src'] || $img[i].attribs['data-src'] || $img[i].attribs['src'];
                if ((id && id === 'myimg') || (src.includes('.jpg') && alt && alt.includes('دانلود'))) {
                    return purgePoster(src);
                }
            }
            return "";
        }

        if (sourceName === 'anime20') {
            for (let i = 0, imgLen = $img.length; i < imgLen; i++) {
                const parent = $img[i].parent.name;
                if (parent === 'p' || parent === 'div') {
                    const src = $img[i].attribs['data-lazy-src'] || $img[i].attribs['data-src'] || $img[i].attribs['src'];
                    return src.match(badPosterRegex) ? '' : purgePoster(src);
                }
            }
        }

        //digimoviez|avamovie|salamdl
        for (let i = 0, imgLen = $img.length; i < imgLen; i++) {
            const parent = $img[i].parent;
            if (parent.name === 'a') {
                const src = $img[i].attribs['data-lazy-src'] || $img[i].attribs['data-src'] || $img[i].attribs['src'];
                if (src.includes('uploads') && !src.includes('/logo') && !src.endsWith('.gif')) {
                    if (!src.match(badPosterRegex)) {
                        return purgePoster(src);
                    }
                }
            }
        }

        //salamdl
        for (let i = 0, imgLen = $img.length; i < imgLen; i++) {
            const parent = $img[i].parent.name;
            if (parent === 'p' || parent === 'div'|| parent === 'strong'|| parent === 'span') {
                const src = $img[i].attribs['data-lazy-src'] || $img[i].attribs['data-src'] || $img[i].attribs['src'];
                return src.match(badPosterRegex) ? '' : purgePoster(src);
            }
        }

        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function purgePoster(poster) {
    if (poster === "" || poster.includes('https://www.w3.org/') || poster.includes('data:image/') || poster.includes('/Logo.')) {
        if (config.nodeEnv === 'dev') {
            console.log('************************************ BAD POSTER: ', poster);
        }
        return "";
    }
    return poster
        .replace(/.+(?=https:)/, '')
        .replace(/-\d\d\d+x\d\d\d+(?=\.)/g, '');
}

export async function comparePrevPosterWithNewMethod(sourceName = null, updateMode = true, autoUpdateIfNeed = false) {
    let stats = {
        total: 0,
        checked: 0,
        diffs: 0,
        updated: 0,
    };
    try {
        console.log('------------- START OF (comparePrevPosterWithNewMethod) -----------');
        let sources = sourceName || sourcesNames;
        console.time('comparePrevPosterWithNewMethod');
        for (let i = 0; i < sources.length; i++) {
            console.log(`------------- START OF (comparePrevPosterWithNewMethod [${sources[i]}]) -----------`);
            let sourcePages = [];
            let start = 1;
            let lastFileIndex = 1;
            while (true) {
                sourcePages = await getSourcePagesSamples(sources[i], start, start);
                start++;
                if (sourcePages.length === 0) {
                    console.log(`------------- END OF (comparePrevPosterWithNewMethod [${sources[i]}]) -----------`);
                    break;
                }
                stats.total += sourcePages.length;

                for (let j = 0; j < sourcePages.length; j++) {
                    if (lastFileIndex !== sourcePages[j].fileIndex) {
                        lastFileIndex = sourcePages[j].fileIndex;
                        console.log(`------------- START OF [${sources[i]}] -fileIndex:${lastFileIndex} -----------`);
                    }
                    stats.checked++;
                    let {
                        sourceName: sName,
                        poster,
                        pageContent,
                        fileIndex,
                        title,
                        type,
                        year,
                        pageLink
                    } = sourcePages[j];
                    let $ = cheerio.load(pageContent);
                    const newPoster = getPoster($, sName);
                    if (!newPoster) {
                        console.log(`--- empty poster (${title}) (year:${year}): `, fileIndex, '|', stats.checked + '/' + stats.total, '|', title, '|', type, '|', pageLink);
                    }

                    if (poster !== newPoster) {
                        console.log(sName, '|', fileIndex, '|', stats.checked + '/' + stats.total, '|', title, '|', type, '|', pageLink);
                        const diff = Diff.diffChars(poster, newPoster);
                        let diffs = [];
                        let t = poster;
                        diff.forEach((part) => {
                            if (part.added) {
                                let p = chalk.green(part.value);
                                t = t.replace(part.value, p)
                                diffs.push(p);
                            } else if (part.removed) {
                                let p = chalk.red(part.value);
                                t = t.replace(part.value, p)
                                diffs.push(p);
                            }
                        });
                        console.log({
                            ps1: poster,
                            ps2: newPoster,
                        });
                        console.log(`${chalk.blue("RES")}: ${t}\n${chalk.blue("DIFFS")}: ${diffs}`);

                        stats.diffs++;

                        if (updateMode) {
                            let checkUpdateIsNeededResult = checkUpdateIsNeeded(diffs, diff);
                            if (checkUpdateIsNeededResult && autoUpdateIfNeed) {
                                console.log('------ semi manual update');
                                sourcePages[j].poster = newPoster;
                                await updateSourcePageData(sourcePages[j], ["poster"]);
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
                                sourcePages[j].poster = newPoster;
                                await updateSourcePageData(sourcePages[j], ["poster"]);
                            }
                            console.log();
                        }
                        console.log('-------------------------');
                        console.log('-------------------------');
                    }
                }
            }
        }
        console.timeEnd('comparePrevPosterWithNewMethod');
        console.log(JSON.stringify(stats));
        console.log('------------- END OF (comparePrevPosterWithNewMethod) -----------');
        return stats;
    } catch (error) {
        saveError(error);
        return stats;
    }
}

function checkUpdateIsNeeded(diffs, diff) {
    let changes = diff.filter(item => item.removed || item.added);
    console.log(changes);

    return (
        (diffs.length === 1 && changes[0].removed === true && changes[0].value.match(/^-\d\d\dx\d\d\d$/i)) ||
        (diffs.length === 1 && changes[0].removed === true && changes[0].value.match(badPosterRegex))
    );
}
