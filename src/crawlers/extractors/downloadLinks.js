import config from "../../config/index.js";
import * as cheerio from 'cheerio';
import inquirer from "inquirer";
import isEqual from 'lodash.isequal';
import {getSourcePagesSamples, updateSourcePageData} from "../samples/sourcePages/sourcePagesSample.js";
import {getSourcesMethods, sourcesNames} from "../sourcesArray.js";
import {getSeasonEpisode, removeDuplicateLinks} from "../utils.js";
import {countriesRegex, fixLinkInfoOrder, linkInfoRegex, specialRegex} from "../linkInfoUtils.js";
import {check_format} from "../link.js";
import {saveError} from "../../error/saveError.js";

const sourcesMethods = getSourcesMethods();

export function getDownloadLinksFromPageContent($, page_link, title, type, year, sourceName) {
    try {
        let sourceMethods = sourcesMethods[sourceName];
        let links = $('a');

        let downloadLinks = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');
            if (!link) {
                continue;
            }

            if (
                (sourceMethods.extraChecker && sourceMethods.extraChecker($, links[j], title, type)) ||
                check_format(link, title)
            ) {
                let link_info = sourceMethods.getFileData($, links[j], type, null, title);
                let qualitySample = sourceMethods.getQualitySample ? sourceMethods.getQualitySample($, links[j], type) || '' : '';
                if (link_info !== 'trailer' && link_info !== 'ignore') {
                    let season = 0, episode = 0, isNormalCase = false;
                    if (type.includes('serial') || link_info.match(/^s\d+e\d+(-?e\d+)?\./i)) {
                        if (type.includes('anime')) {
                            ({season, episode, isNormalCase} = getSeasonEpisode(link_info));
                            if ((season === 0 && episode === 0) || link_info.match(/^\d\d\d\d?p(\.|$)/)) {
                                ({season, episode, isNormalCase} = getSeasonEpisode(link));
                            }
                        } else {
                            ({season, episode, isNormalCase} = getSeasonEpisode(link));
                            if (season === 0 && !isNormalCase) {
                                ({season, episode, isNormalCase} = getSeasonEpisode(link_info));
                            }
                        }
                    }
                    downloadLinks.push({
                        link: link.trim(),
                        info: link_info.replace(/^s\d+e\d+(-?e\d+)?\./i, ''),
                        qualitySample: qualitySample,
                        sourceName: sourceName,
                        pageLink: page_link,
                        season, episode,
                    });
                }
            }
        }

        if (sourceMethods.addTitleNameToInfo && !type.includes('serial')) {
            downloadLinks = sourceMethods.addTitleNameToInfo(downloadLinks, title, year);
        }
        if (sourceMethods.handleLinksExtraStuff) {
            downloadLinks = sourceMethods.handleLinksExtraStuff(downloadLinks);
        }

        return removeDuplicateLinks(downloadLinks, sourceMethods.sourceConfig.replaceInfoOnDuplicate);
    } catch (error) {
        saveError(error);
        return [];
    }
}

export function getDownloadLinksFromLinkInfo(downloadLinks) {
    try {
        let result = [];

        for (let i = 0, len = downloadLinks.length; i < len; i++) {
            let downloadLink = {...downloadLinks[i]};
            let temp = downloadLink.info.split(' - ');
            downloadLink.info = fixLinkInfoOrder(temp[0]);
            if (temp[1]) {
                downloadLink.info += ' - ' + temp[1];
            }
            result.push(downloadLink);
        }
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

export function getLinksDoesntMatchLinkRegex(downloadLinks, type) {
    const badLinks = downloadLinks.filter(item =>
        (
            !item.info.match(linkInfoRegex) &&
            !item.info.match(countriesRegex)
        )
        || item.info.match(/[\u0600-\u06FF]/)
    );

    const isSerial = type.includes('serial');
    const badSeasonEpisode = downloadLinks.filter(({season, episode, info, link}) => {
        if (type.includes('movie') && (season !== 0 || episode !== 0)) {
            return true;
        }
        if (isSerial) {
            if (season === 0 && !link.match(/s0+\.?e\d{1,2}/i) && !info.match(/\. \([a-zA-Z\s]+ \d{1,2}\)/) && !info.match(/\. \([a-zA-Z\s]+\)$/) && !info.match(specialRegex)) {
                return true;
            }
            if (season <= 1 && episode === 0 && !link.match(/s\d{1,2}-?e0+/i) && !link.match(/\.e0+\./i) && !info.match(specialRegex)) {
                return true;
            }
            if (season > 47 || episode > 1300) {
                return true;
            }
        }
        return false;
    });

    return ([...badLinks, ...badSeasonEpisode].map(item => {
        return ({
            link: item.link,
            info: item.info,
            seasonEpisode: `S${item.season}E${item.episode}`,
        })
    }));
}

function checkDownloadLink(url, sourceName, quality, vpnStatus) {
    // todo : print link if include persian character
    if (config.nodeEnv === 'dev') {

    }
    if (url.includes('media-imdb.com') || url.includes('.ir/') || url.includes('aparat.com')) {
        return null;
    }
    url = url.trim().replace(/\s/g, '%20');
    if (sourceName === "film2movie") {
        //from: https://dl200.ftk.pw/?s=7&f=/trailer/***.mp4
        //to: https://dl7.ftk.pw/trailer/***.mp4
        let temp = url.match(/\/\?s=\d+&f=(?=(\/(trailer|user|serial)))/gi);
        if (temp) {
            let match = temp.pop();
            let number = Number(match.match(/\d+/g).pop());
            url = url.replace(/(?<=dl)\d+(?=\.)/, number).replace(match, '');
        }
    }
}

export async function comparePrevDownloadLinksWithNewMethod(sourceName = null, mode = "pageContent", updateMode = false) {
    let stats = {
        total: 0,
        checked: 0,
        diffs: 0,
        updated: 0,
    };
    try {
        console.log('------------- START OF (comparePrevDownloadLinksWithNewMethod) -----------');
        let sources = sourceName || sourcesNames;
        console.time('comparePrevDownloadLinksWithNewMethod');
        for (let i = 0; i < sources.length; i++) {
            console.log(`------------- START OF (comparePrevDownloadLinksWithNewMethod [${sources[i]}]) -----------`);
            let sourcePages = [];
            let start = 1;
            let lastFileIndex = 1;
            while (true) {
                sourcePages = await getSourcePagesSamples(sources[i], start, start);
                start++;
                if (sourcePages.length === 0) {
                    console.log(`------------- END OF (comparePrevDownloadLinksWithNewMethod [${sources[i]}]) -----------`);
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
                        fileIndex,
                        downloadLinks,
                        pageContent,
                        pageLink,
                        title,
                        type,
                        year
                    } = sourcePages[j];
                    let $ = cheerio.load(pageContent);
                    let newDownloadLinks = (mode === "pageContent")
                        ? getDownloadLinksFromPageContent($, pageLink, title, type, year, sName)
                        : (mode === "checkRegex")
                            ? getLinksDoesntMatchLinkRegex(downloadLinks, type)
                            : getDownloadLinksFromLinkInfo(downloadLinks);

                    if (mode === "checkRegex") {
                        if (newDownloadLinks.length === 0) {
                            continue;
                        }
                        stats.diffs++;
                        console.log(sName, '|', fileIndex, '|', stats.checked + '/' + stats.total, '|', title, '|', type, '|', pageLink);
                        console.log(`prev vs new: ${downloadLinks.length} vs ${newDownloadLinks.length}`);
                        for (let k = 0; k < newDownloadLinks.length; k++) {
                            console.log(newDownloadLinks[k]);
                            console.log('-----------');
                        }
                        const questions = [
                            {
                                type: 'list',
                                name: 'ans',
                                message: `press enter to continue`,
                                choices: ["Yes"],
                            },
                        ];
                        console.log();
                        await inquirer.prompt(questions);
                        console.log();
                        console.log('-------------------------');
                        console.log('-------------------------');
                        newDownloadLinks = getDownloadLinksFromPageContent($, pageLink, title, type, year, sName);
                    }

                    if (!isEqual(downloadLinks, newDownloadLinks)) {
                        console.log(sName, '|', fileIndex, '|', stats.checked + '/' + stats.total, '|', title, '|', type, '|', pageLink);
                        console.log(`prev vs new: ${downloadLinks.length} vs ${newDownloadLinks.length}`);
                        printDiffLinks(downloadLinks, newDownloadLinks);
                        stats.diffs++;
                        if (updateMode) {
                            let answer = await handleUpdatePrompt(newDownloadLinks, sourcePages[j], stats);
                            if (mode === "checkRegex" && answer === "yes") {
                                j--;
                            }
                        }
                        console.log('-------------------------');
                        console.log('-------------------------');
                    } else if (mode === "checkRegex") {
                        console.log('************ No diff in new extracted links, check linkInfoRegex or linksExtractorFunctions');
                    }
                }
            }
        }
        console.timeEnd('comparePrevDownloadLinksWithNewMethod');
        console.log(JSON.stringify(stats));
        console.log('------------- END OF (comparePrevDownloadLinksWithNewMethod) -----------');
        return stats;
    } catch (error) {
        saveError(error);
        return stats;
    }
}

function printDiffLinks(downloadLinks, newDownloadLinks) {
    for (let k = 0; k < Math.max(downloadLinks.length, newDownloadLinks.length); k++) {
        if (!isEqual(downloadLinks[k], newDownloadLinks[k])) {
            if (
                isEqual(downloadLinks[k]?.info, newDownloadLinks[k]?.info) ||
                downloadLinks[k]?.season !== newDownloadLinks[k]?.season ||
                downloadLinks[k]?.episode !== newDownloadLinks[k]?.episode
            ) {
                console.log({
                    link1: downloadLinks[k],
                    link2: newDownloadLinks[k],
                });
            } else {
                console.log({
                    link1: {
                        link: downloadLinks[k]?.link,
                        info: downloadLinks[k]?.info,
                    },
                    link2: {
                        link: newDownloadLinks[k]?.link,
                        info: newDownloadLinks[k]?.info,
                    },
                });
            }
            console.log('------------------');
        }
    }
}

async function handleUpdatePrompt(newDownloadLinks, pageData, stats) {
    const questions = [
        {
            type: 'list',
            name: 'ans',
            message: `update this movie data?`,
            choices: ["Yes", "No"],
        },
    ];
    console.log();
    let answers = await inquirer.prompt(questions);
    if (answers.ans.toLowerCase() === 'yes') {
        stats.updated++;
        pageData.downloadLinks = newDownloadLinks;
        await updateSourcePageData(pageData, ["downloadLinks"]);
    }
    console.log();
    return answers.ans.toLowerCase();
}
