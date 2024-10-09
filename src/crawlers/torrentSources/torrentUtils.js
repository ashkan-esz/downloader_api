import {getSeasonEpisode} from "../utils/utils.js";
import {purgeSizeText} from "../linkInfoUtils.js";
import {getConcurrencyNumber} from "../searchTools.js";
import PQueue from "p-queue";
import {checkForceStopCrawler, updatePageNumberCrawlerStatus} from "../status/crawlerStatus.js";
import {pauseCrawler} from "../status/crawlerController.js";

export const _japaneseCharactersRegex = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g;

export async function handleCrawledTitles(titles, pageNumber, pageCount, saveCrawlDataFunc, sourceConfig, extraConfigs) {
    // const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
    const concurrencyNumber = 1;
    const promiseQueue = new PQueue({concurrency: concurrencyNumber});
    updatePageNumberCrawlerStatus(pageNumber, pageCount, concurrencyNumber, extraConfigs);
    for (let i = 0; i < titles.length; i++) {
        if (checkForceStopCrawler()) {
            break;
        }
        await pauseCrawler();
        await promiseQueue.onSizeLessThan(3 * concurrencyNumber);
        if (checkForceStopCrawler()) {
            break;
        }
        const t = i;
        promiseQueue.add(() => saveCrawlDataFunc(titles[t], extraConfigs));
    }

    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

export async function handleSearchedCrawledTitles(titles, pageNumber, pageCount, saveCrawlDataFunc, sourceConfig, extraConfigs) {
    // const concurrencyNumber = await getConcurrencyNumber(sourceConfig.sourceName, sourceConfig.needHeadlessBrowser, extraConfigs);
    const concurrencyNumber = 1;
    const promiseQueue = new PQueue({concurrency: concurrencyNumber});
    updatePageNumberCrawlerStatus(pageNumber, pageCount, concurrencyNumber, extraConfigs);
    for (let i = 0; i < titles.length; i++) {
        await promiseQueue.onSizeLessThan(concurrencyNumber);
        const t = i;
        promiseQueue.add(() => saveCrawlDataFunc(titles[t], extraConfigs));
    }

    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

//------------------------------------------
//------------------------------------------

export function normalizeSeasonText(text) {
    return text
        .replace(/2nd season - \d+/, r => 's2e' + r.match(/\d+$/).pop())
        .replace('2nd season', '2')
        .replace('2nd attack', '2')
        .replace('zoku hen', 'season 2')
        .replace(/3rd season - \d+/, r => 's3e' + r.match(/\d+$/).pop())
        .replace('3rd season', '3')
        .replace('season 3', '3')
        .replace(/\dth season/, r => r.replace('th season', ''))
        .replace(/season \d/, r => r.replace('season ', ''))
        .replace(/part i\s/, 'part 1 ')
        .replace(/(part)? ii+/, r => r.replace('iii', '3').replace('ii', '2'))
        .replace(' ∬', ' 2');
}

export function removeSeasonText(text) {
    return text
        .replace(/2nd season( - \d+)?/, "")
        .replace('2nd attack', "")
        .replace('zoku hen', "")
        .replace(/3rd season( - \d+)?/, "")
        .replace(/\dth season/, "")
        .replace(/season \d/, "")
        .replace(/\srepack$/, '')
        .replace(/\stv\s(0[1-9])+([1-9]0)?$/, '') // tv 010203 | tv 010230
        .replace(/\stv\s\d+-\d+$/, '') // tv 04-09 | tv 11-15
        .replace(/(\sv2)?\s(tv|ld)$/, '')
        .replace(/\s\d\d\d+-\d\d\d+$/, '') // 008-009
        .replace(/s\d+\s(\d+\s?)+/, '')
        .replace(/(?<=(\s2))\s\d+$/, '')
        .replace(/(?<=(\s\d))\s0$/, '')
        .replace(' part one', ' part 1')
        .replace(' part two', ' part 2')
        .replace(' part three', ' part 3')
        .replace(' part four', ' part 4')
        .replace(/\sdvd$/i, '')
        .trim();
}

export function fixSeasonEpisode(text, isLinkInput) {
    // console.log(text)
    let se = getSeasonEpisode(text, isLinkInput);
    if (se.season === 1 && se.episode === 0) {
        let temp = text.replace(/\s?[(\[][a-zA-Z\d\sx]+[)\]]/g, '').match(/\s\d+(-\d+)?(v\d)?(\s(end|raw))?(\.\s*(mkv|mp4|avi|wmv))?$/);
        if (temp) {
            se.episode = Number(temp[0].match(/\d+/g)[0]);
        }
    }

    return se;
}

export function getFixedFileSize($, link) {
    // let sizeText = link.match(/size: \d+\.?\d+(mb|gb)/i)?.[0].toLowerCase() || "";
    let sizeText = link.toLowerCase();
    sizeText = sizeText
        .replace(/size:\s/, '')
        .replace('mib', 'mb')
        .replace('gib', 'gb');
    sizeText = purgeSizeText(sizeText);
    if (sizeText.endsWith('MB')) {
        return Number(sizeText.replace("MB", ''));
    }
    return Math.floor(Number(sizeText.replace("GB", '')) * 1024);
}

export function mergeTitleLinks(titles) {
    let uniqueTitles = [];
    titles = titles.sort((a, b) => {
        let w1 = 0;
        let w2 = 0;
        if (a.title.match(/\(/)) {
            w1++;
        }
        if (b.title.match(/\(/)) {
            w2++;
        }
        if (a.title.match(_japaneseCharactersRegex)) {
            w1++;
        }
        if (b.title.match(_japaneseCharactersRegex)) {
            w2++;
        }

        return w1 - w2;
    });

    for (let i = 0; i < titles.length; i++) {
        let findResult = uniqueTitles.find(item =>
            item.title.replace(/\s+/g, '') === titles[i].title.replace(/\s+/g, '') ||
            item.title.split(/\(/)[0].trim() === titles[i].title.split(/\(/)[0].trim() ||
            item.title.split(_japaneseCharactersRegex)[0].trim() === titles[i].title.split(_japaneseCharactersRegex)[0].trim() ||
            simplifyTitle(item.title) === simplifyTitle(titles[i].title)
        );
        if (findResult) {
            findResult.links = [...findResult.links, ...titles[i].links];
        } else {
            uniqueTitles.push(titles[i]);
        }
    }

    uniqueTitles = uniqueTitles.filter(item => item.links.length > 0 && !checkInvalidTitle(item.title));
    uniqueTitles = dropOutlierEpisodeNumber(uniqueTitles);
    return uniqueTitles;
}

function checkInvalidTitle(title) {
    return !title ||
        title.includes(" scripts fonts for ") ||
        title.includes(" music collection") ||
        title.includes(" music video") ||
        title.includes("random subbed episodes pack");
}

function simplifyTitle(title) {
    return title
        .replace('ou ', 'o ')
        .replace(' wo ', ' o ')
        .replace(/\swo$/, ' o')
        .replace(/[ck]/g, 'c');
}

function dropOutlierEpisodeNumber(titles) {
    for (let i = 0; i < titles.length; i++) {
        let seasons = [];
        for (let j = 0; j < titles[i].links.length; j++) {
            let s = titles[i].links[j].season;
            let e = titles[i].links[j].episode;
            let season = seasons.find(item => item.season === s);
            if (season) {
                if (!season.episodes.includes(e)) {
                    season.episodes.push(e);
                }
            } else {
                seasons.push({
                    season: s,
                    episodes: [e],
                })
            }
        }

        for (let j = 0; j < seasons.length; j++) {
            seasons[j].episodes = seasons[j].episodes.sort((a, b) => a - b);
            let episodes = seasons[j].episodes[0] !== undefined ? [seasons[j].episodes[0]] : [];
            for (let k = 1; k < seasons[j].episodes.length; k++) {
                if (seasons[j].episodes[k] - seasons[j].episodes[k - 1] < 6) {
                    episodes.push(seasons[j].episodes[k]);
                }
            }
            seasons[j].episodes = episodes;
        }

        titles[i].links = titles[i].links.filter(l => {
            let season = seasons.find(item => item.season === l.season);
            return season && season.episodes.includes(l.episode);
        });
    }

    return titles;
}