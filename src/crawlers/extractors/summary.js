import * as cheerio from 'cheerio';
import * as Diff from "diff";
import chalk from 'chalk';
import inquirer from "inquirer";
import {getSourcePagesSamples, updateSourcePageData} from "../samples/sourcePages/sourcePagesSample.js";
import {sourcesNames} from "../sourcesArray.js";
import {saveError} from "../../error/saveError.js";

export function getPersianSummary($, title, year) {
    try {
        const $div = $('div');
        const $p = $('p');
        const $strong = $('strong');

        for (let i = 0, divLength = $div.length; i < divLength; i++) {
            if ($($div[i]).hasClass('plot_text')) {
                return purgePersianSummary($($div[i]).text(), title, year);
            }
        }

        // bia2anime -conflict with خلاصه داستان
        for (let i = 0, pLength = $p.length; i < pLength; i++) {
            if ($($p[i]).parent().hasClass('-plot')) {
                return purgePersianSummary($($p[i]).text(), title, year);
            }
        }

        //golchindl -conflict with خلاصه داستان
        for (let i = 0, divLength = $div.length; i < divLength; i++) {
            if ($($div[i]).hasClass('summary') && $($div[i]).text().includes('خلاصه')) {
                return purgePersianSummary($($div[i]).text(), title, year);
            }
        }

        //avamovie -conflict with خلاصه داستان
        for (let i = 0, divLength = $div.length; i < divLength; i++) {
            if ($($div[i]).hasClass('plot')) {
                return purgePersianSummary($($div[i]).text(), title, year);
            }
        }

        //film2movie
        for (let i = 0, divLength = $div.length; i < divLength; i++) {
            const temp = $($div[i]).text();
            if (temp && temp === 'خلاصه داستان :') {
                return purgePersianSummary($($div[i]).next().text(), title, year);
            }
        }

        //salamdl
        for (let i = 0, pLength = $p.length; i < pLength; i++) {
            const temp = $($p[i]).text();
            if (temp && temp.includes('خلاصه داستان')) {
                return purgePersianSummary(temp, title, year);
            }
        }

        //bia2hd
        for (let i = 0, pLength = $p.length; i < pLength; i++) {
            const parent = $p[i].parent;
            if (parent.name === 'div' && $(parent).hasClass('-plot')) {
                return purgePersianSummary($($p[i]).text(), title, year);
            }
        }

        //golchindl
        for (let i = 0, strongLength = $strong.length; i < strongLength; i++) {
            if ($($strong[i]).text().includes('خلاصه داستان')) {
                return purgePersianSummary($($strong[i]).text(), title, year);
            }
        }
        for (let i = 0, pLength = $p.length; i < pLength; i++) {
            if ($($p[i]).text().includes('خلاصه فیلم')) {
                return purgePersianSummary($($p[i]).text().split('–').pop(), title, year);
            }
        }

        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function purgePersianSummary(persianSummary, title, year) {
    try {
        persianSummary = persianSummary.replace(/ /g, ' ');
        let title2 = title
            .split('')
            .map(item => {
                if (item === ' ') {
                    item = ',?:?-?\\.?' + item;
                }
                return item;
            })
            .join('') + '!?\\.?';
        let title3 = title
            .replace(' and ', ' (and|&) ')
            .split('')
            .map(item => {
                if (item !== " ") {
                    item = item + ':?’?-?';
                } else {
                    item = "(\\s|-)";
                }
                return item;
            })
            .join('');

        const titleRegex = new RegExp("^(\\s)?" + title.replace(/\*/g, '\\*') + `( ${year})?(!)?`, 'i');
        const titleRegex2 = new RegExp("^(\\s)?(خلاصه( داستان)? (انیمیشن|فیلم|فيلم|سریال|انییمشن) )?" + title2.replace(/\*/g, '\\*') + `(!)?(\\?)?( ${year})?(!)?`, 'i');
        const titleRegex3 = new RegExp("^(\\s)?(خلاصه( داستان)? (انیمیشن|فیلم|فيلم|سریال|انییمشن) )?" + title3.replace(/\*/g, '\\*') + `(!)?(\\?)?( ${year})?(!)?`, 'i');
        persianSummary = persianSummary.replace(titleRegex, '');
        persianSummary = persianSummary.replace(titleRegex2, '');
        persianSummary = persianSummary.replace(titleRegex3, '');

        const titleRegex4 = new RegExp(`در خلاصه داستان (سریال|فیلم|فيلم) ${title.replace(/\*/g, '\\*')} آمده است :`, 'i');
        const titleRegex5 = new RegExp(`در خلاصه داستان (سریال|فیلم|فيلم) ${title.replace(/\*/g, '\\*')} آمده است که , `, 'i');
        persianSummary = persianSummary.replace(titleRegex4, '');
        persianSummary = persianSummary.replace(titleRegex5, '');
    } catch (error) {
        saveError(error);
    }

    return persianSummary
        .replace(/^\s*!\s+\d+\s(?=\()/, '')
        .replace('در خلاصه داستان این فیلم ترسناک و رازآلود آمده است ، ', '')
        .replace('در خلاصه داستان این سریال آمده است که، ', '')
        .replace('در خلاصه داستان این فیلم آمده است ، ', '')
        .replace('در خلاصه داستان این سریال آمده است ، ', '')
        .replace(/^(\s*خلاصه داستان\s*:)+/, '')
        .replace('خلاصه فیلم', '')
        .replace(/\n+/g, ' ')
        .replace(/\s\s+/g, ' ')
        .replace(/^\s?در خلاصه داستان این (انیمیشن|فیلم|فيلم|سریال|انییمشن)?( ترسناک) آمده است(:|(\s،\s))/, '')
        .replace(/^\s?در خلاصه داستان (انیمیشن|فیلم|فيلم|سریال|انییمشن) آمده است ، /, '')
        .replace(/^\s?در خلاصه داستان این (انیمیشن|فیلم|فيلم|سریال|انییمشن) آمده است:/, '')
        .replace(/^\s?فارسی English /, '')
        .replace(/(?<=([\u0600-\u06FF]))\s:(?=([\u0600-\u06FF]))/, ': ')
        .replace(/(?<!(([()\d]|[a-zA-Z]|[\u0600-\u06FF])\s?)):/, '')
        .replace(/([.…,\s])+$/, '')
        .trim();
}

export async function comparePrevSummaryWithNewMethod(sourceName = null, updateMode = false, autoUpdateIfNeed = false) {
    let stats = {
        total: 0,
        checked: 0,
        diffs: 0,
        updated: 0,
    };
    try {
        console.log('------------- START OF (comparePrevSummaryWithNewMethod) -----------');
        let sources = sourceName || sourcesNames;
        console.time('comparePrevSummaryWithNewMethod');
        for (let i = 0; i < sources.length; i++) {
            console.log(`------------- START OF (comparePrevSummaryWithNewMethod [${sources[i]}]) -----------`);
            let sourcePages = [];
            let start = 1;
            let lastFileIndex = 1;
            while (true) {
                sourcePages = await getSourcePagesSamples(sources[i], start, start);
                start++;
                if (sourcePages.length === 0) {
                    console.log(`------------- END OF (comparePrevSummaryWithNewMethod [${sources[i]}]) -----------`);
                    break;
                }
                stats.total += sourcePages.length;

                for (let j = 0; j < sourcePages.length; j++) {
                    if (lastFileIndex !== sourcePages[j].fileIndex) {
                        lastFileIndex = sourcePages[j].fileIndex;
                        console.log(`------------- START OF [${sources[i]}] -fileIndex:${lastFileIndex} -----------`);
                    }
                    stats.checked++;
                    let {persianSummary, pageContent, title, year} = sourcePages[j];
                    let $ = cheerio.load(pageContent);
                    const newPersianSummary = getPersianSummary($, title, year);

                    if (persianSummary !== newPersianSummary) {
                        let {sourceName: sName, fileIndex, title, type, pageLink} = sourcePages[j];
                        console.log(sName, '|', fileIndex, '|', stats.checked + '/' + stats.total, '|', title, '|', type, '|', pageLink);
                        const diff = Diff.diffChars(persianSummary, newPersianSummary);
                        let diffs = [];
                        let t = persianSummary;
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
                            ps1: persianSummary,
                            ps2: newPersianSummary,
                        });
                        console.log(`${chalk.blue("RES")}: ${t}\n${chalk.blue("DIFFS")}: ${diffs}`);

                        stats.diffs++;

                        if (updateMode) {
                            let checkUpdateIsNeededResult = checkUpdateIsNeeded(diffs, diff, title, year);
                            if (checkUpdateIsNeededResult && autoUpdateIfNeed) {
                                console.log('------ semi manual update');
                                sourcePages[j].persianSummary = newPersianSummary;
                                await updateSourcePageData(sourcePages[j], ["persianSummary"]);
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
                                sourcePages[j].persianSummary = newPersianSummary;
                                await updateSourcePageData(sourcePages[j], ["persianSummary"]);
                            }
                            console.log();
                        }
                        console.log('-------------------------');
                        console.log('-------------------------');
                    }
                }
            }
        }
        console.timeEnd('comparePrevSummaryWithNewMethod');
        console.log(JSON.stringify(stats));
        console.log('------------- END OF (comparePrevSummaryWithNewMethod) -----------');
        return stats;
    } catch (error) {
        saveError(error);
        return stats;
    }
}

function checkUpdateIsNeeded(diffs, diff, title, year) {
    let changes = diff.filter(item => item.removed || item.added);
    let changesJoinedValues = changes.map(item => item.value).join('').trim().replace(/\s/g, '');
    console.log(changes);
    return (
        (diffs.length <= 3 && changes.every(item => item.added === true && item.value === ":")) ||
        (diffs.length <= 4 && changes.every(item => item.removed === true && (item.value === " " || item.value === "  "))) ||
        (diffs.length <= 11 && changes.every(item => ((item.removed === true && item.value === " ") || item.added === true && item.value === " "))) ||
        (diffs.length <= 2 && changes.every(item => item.removed === true && (item.value === "\n" || item.value === "\n\n"))) ||
        (diffs.length === 2 && changes[0].added === true && changes[0].value === ":" && changes[1].removed === true && changes[1].value === " ") ||
        (diffs.length === 2 && changes[0].removed === true && (changes[0].value === "\n" || changes[0].value === "\n\n") && changes[1].added === true && changes[1].value === " ") ||
        (diffs.length <= 7 &&
            changes.every(item => item.removed === true) &&
            (
                changesJoinedValues === "درانفیلمآمدهاست،ی" ||
                changesJoinedValues === "دراینفیلمترسناکآمدهاست،" ||
                changesJoinedValues === "درایسریاآمدهاست،نل" ||
                changesJoinedValues === "دراینفیلمآمدهاست،" ||
                changesJoinedValues === "دراینفیلمآمدهات،س" ||
                changesJoinedValues === "دراینسریالآمداست،ه" ||
                changesJoinedValues === "درانفیلمترسناورازآلودآمدهاست،یک"
            )
        ) ||
        (diffs.length <= 7 &&
            changes.every(item => ((item.added === true) || (item.removed === true && item.value === " "))) &&
            (
                changesJoinedValues === "خلاصهدستانا" ||
                changesJoinedValues === "خلاصهداستان"
            )
        ) ||

        (diffs.length <= 7 &&
            changes[0].removed === true && (
                changes[0].value.toLowerCase().replace(/[\s!,:.-]/g, '').trim() === title.toLowerCase().replace(/\s/g, '') ||
                changes[0].value.toLowerCase().replace(/[\s!,:.-]/g, '').trim() === year ||
                changes[0].value.toLowerCase().replace(/[\s!,:.-]/g, '').trim() === (title.toLowerCase() + ' ' + year).replace(/\s/g, '')
            ) &&
            changes.slice(1).every(item => (
                    (item.added === true && item.value === ":") ||
                    (item.added === true && item.value === " ") ||
                    (item.removed === true && item.value === " ") ||
                    (item.removed === true && item.value === "\n") ||
                    (item.removed === true && item.value === "\n\n")
                )
            )
        )
    );
}
