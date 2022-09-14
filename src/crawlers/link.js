import {wordsToNumbers} from "words-to-numbers";
import {checkBetterQuality, getDecodedLink} from "./utils.js";
import {getEpisodeModel_placeholder} from "../models/episode.js";
import {saveError} from "../error/saveError.js";


export function check_download_link(original_link, matchCases, type) {
    try {
        let link = original_link.toLowerCase().replace(/[_-]|\.\.+/g, '.');
        if (link.includes('trailer')) {
            return null;
        }

        if (type.includes('movie')) {
            let decodedLink = getDecodedLink(link);
            if (
                link.includes(matchCases.case1) ||
                link.includes(matchCases.case2) ||
                link.includes(matchCases.case3) ||
                link.includes(matchCases.case4) ||
                decodedLink.includes(matchCases.case1) ||
                decodedLink.includes(matchCases.case1.replace(/\./g, ' ')) ||
                link.split('/').pop().replace(/\.the\.movie|[.%s]/g, '').includes(matchCases.case1.replace(/[.%s]/g, '')) ||
                link.replace(/\.the\.movie|the\.|at\.|\.special/g, '').includes(matchCases.case1.replace(/\.the\.movie|the\.|at\.|\.special/g, '')) ||
                link.includes(matchCases.case1.replace(/\./g, '')) ||
                link.includes(matchCases.case1.replace('.ova', '.oad')) ||
                link.includes(matchCases.case1.replace('.iii', '.3')) ||
                link.includes(matchCases.case1.replace('.3', '.iii')) ||
                link.includes(matchCases.case1.replace('.ii', '.2')) ||
                link.includes(matchCases.case1.replace('.2', '.ii')) ||
                link.includes(matchCases.case1.replace('el', 'the')) ||
                link.includes(matchCases.case1.replace('.and', '')) ||
                link.replace('.and', '').includes(matchCases.case1) ||
                link.includes(wordsToNumbers(matchCases.case1.replace(/\./g, ' ')).toString().replace(/\s/g, '.')) ||
                link.includes(matchCases.case1.replace('demon.slayer', 'kimetsu.no.yaiba')) ||
                link.includes(matchCases.case1.replace('demon.slayer', 'kimetsu.no.yaiba').replace('.the.movie', ''))
            ) {
                return original_link;
            }

            let splitted_matchCase = matchCases.case1.split('.');
            if (splitted_matchCase.length > 6) {
                let newMatchCase = splitted_matchCase.slice(3).join('.');
                return link.includes(newMatchCase) ? original_link : null;
            }
            if (splitted_matchCase.length > 3) {
                let newMatchCase = splitted_matchCase.slice(0, 3).join('.');
                return link.includes(newMatchCase) ? original_link : null;
            }

            return null;
        } else {
            return checkSerialLinkMatch(link) ? original_link : null;
        }
    } catch (error) {
        saveError(error);
        return null;
    }
}

export function getMatchCases(title, type) {
    if (type.includes('movie')) {
        let title_array = title.split(' ');
        let temp = title_array.map((text) => text.replace(/&/g, 'and').replace(/[’:]/g, ''));
        let case1 = temp.map((text) => text.split('.').filter((t) => t !== ''));
        case1 = [].concat.apply([], case1);
        let case2 = case1.map((text) => text.split('-'));
        case2 = [].concat.apply([], case2);
        let case3 = title_array.filter(value => isNaN(value));
        let case4 = case3.map((text) => text.charAt(0));
        return {
            case1: case1.join('.').toLowerCase(),
            case2: case2.join('.').toLowerCase(),
            case3: case3.join('.').toLowerCase(),
            case4: case4.join('.').toLowerCase()
        }
    } else return null;
}

export function check_format(link, type) {
    link = link.toLowerCase().trim();
    let qualities = ['bluray', 'mobile', 'dvdrip', 'hdrip', 'brip', 'webrip', 'web-dl', 'web.dl',
        'farsi_dubbed', 'dvdscr', 'x264', '3d', 'hdcam', '480p', '720p', '1080p', 'farsi.dubbed'];
    let encodes = ['valamovie', 'tmkv', 'ganool', 'pahe', 'rarbg', 'evo',
        'psa', 'nitro', 'f2m', 'xredd', 'yify', 'shaanig', 'mkvcage', 'imax'];

    if (
        !link.replace(/\?\d+/g, '').match(/\.(mkv|mp4|avi|mov|flv|wmv)(\?md\d=.+)?$/g) ||
        link.includes('teaser') || link.includes('trailer')
    ) {
        return false;
    }

    if (link.match(/\d\d\d+p/g) !== null) {
        for (let j = 0; j < qualities.length; j++) {
            if (link.includes(qualities[j])) {
                return true;
            }
        }
        for (let j = 0; j < encodes.length; j++) {
            if (link.includes(encodes[j])) {
                return true;
            }
        }
    }

    if (
        link.includes('dvdrip') || link.includes('hdcam') || link.includes('hdtv') ||
        link.includes('mobile') || link.includes('dubbed.farsi') || link.match(/\d\d\d+\.nineanime/g)
        || link.includes('1080.bia2anime.mkv')
    ) {
        return true;
    }

    return (type.includes('serial') && checkSerialLinkMatch(link));
}

function checkSerialLinkMatch(link) {
    let decodedLink = getDecodedLink(link).toLowerCase().replace(/[_-]|\.\.+/gi, '.');
    let serialMatch = decodedLink.match(/\[\d+]|s\d+e\d+|e\d+|\d+\.nineanime/gi);
    if (serialMatch) {
        return true;
    }
    let animeSerialMatch1 = decodedLink.match(
        /\.(episode|ep)\.\d+\.mkv|ep \d+ \[animdl\.ir]\.mkv|\.(\d\d+|oad\.dvd|ova\.orphan|special)\.animdl\.ir|\.\d\d+(\.uncen)*\.(hd|sd|bd|dvd)(\.dual[.\-]audio)*\.animdl\.ir/gi);
    if (animeSerialMatch1) {
        return true;
    }
    return decodedLink.match(
            /([.\s\[(])+\s*(.*)\s*(\d\d\d+p*|dvdrip|dvd|web)\s*(.*)\s*([.\s\])])+\s*([.\[]*)(bia2anime|(animdl|animelit|animList|animeList)\.(ir|top)|x265|10bit|mkv)([.\]]*)/gi)
        || decodedLink.match(/\.\d\d\d?\.bitdownload\.ir\.mkv/gi);
}

//---------------------

export function groupSerialLinks(links, watchOnlineLinks) {
    let result = [];

    for (let i = 0; i < links.length; i++) {
        let seasonExist = false;
        for (let j = 0; j < result.length; j++) {
            if (result[j].seasonNumber === links[i].season) {
                seasonExist = true;
                let episodeExist = false;
                for (let k = 0; k < result[j].episodes.length; k++) {
                    if (result[j].episodes[k].episodeNumber === links[i].episode) {
                        episodeExist = true;
                        result[j].episodes[k].links.push(links[i]);
                        break;
                    }
                }
                if (!episodeExist) {
                    let episodeModel = getEpisodeModel_placeholder(links[i].season, links[i].episode);
                    delete episodeModel.season;
                    delete episodeModel.episode;
                    result[j].episodes.push({
                        episodeNumber: links[i].episode,
                        ...episodeModel,
                        links: [links[i]],
                        watchOnlineLinks: [],
                    });
                }
                break;
            }
        }
        if (!seasonExist) {
            let episodeModel = getEpisodeModel_placeholder(links[i].season, links[i].episode);
            delete episodeModel.season;
            delete episodeModel.episode;
            result.push({
                seasonNumber: links[i].season,
                episodes: [{
                    episodeNumber: links[i].episode,
                    ...episodeModel,
                    links: [links[i]],
                    watchOnlineLinks: [],
                }],
            });
        }
    }

    //-------------------------------------------
    for (let i = 0; i < watchOnlineLinks.length; i++) {
        let seasonExist = false;
        for (let j = 0; j < result.length; j++) {
            if (result[j].seasonNumber === watchOnlineLinks[i].season) {
                seasonExist = true;
                let episodeExist = false;
                for (let k = 0; k < result[j].episodes.length; k++) {
                    if (result[j].episodes[k].episodeNumber === watchOnlineLinks[i].episode) {
                        episodeExist = true;
                        result[j].episodes[k].watchOnlineLinks.push(watchOnlineLinks[i]);
                        break;
                    }
                }
                if (!episodeExist) {
                    let episodeModel = getEpisodeModel_placeholder(watchOnlineLinks[i].season, watchOnlineLinks[i].episode);
                    delete episodeModel.season;
                    delete episodeModel.episode;
                    result[j].episodes.push({
                        episodeNumber: watchOnlineLinks[i].episode,
                        ...episodeModel,
                        links: [],
                        watchOnlineLinks: [watchOnlineLinks[i]],
                    });
                }
                break;
            }
        }
        if (!seasonExist) {
            let episodeModel = getEpisodeModel_placeholder(watchOnlineLinks[i].season, watchOnlineLinks[i].episode);
            delete episodeModel.season;
            delete episodeModel.episode;
            result.push({
                seasonNumber: watchOnlineLinks[i].season,
                episodes: [{
                    episodeNumber: watchOnlineLinks[i].episode,
                    ...episodeModel,
                    links: [],
                    watchOnlineLinks: [watchOnlineLinks[i]],
                }],
            });
        }
    }
    //-------------------------------------------

    result = result.sort((a, b) => a.seasonNumber - b.seasonNumber);
    for (let i = 0; i < result.length; i++) {
        result[i].episodes = result[i].episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

        //sort links
        for (let j = 0; j < result[i].episodes.length; j++) {
            result[i].episodes[j].links = sortLinksByQuality(result[i].episodes[j].links);
            result[i].episodes[j].watchOnlineLinks = sortLinksByQuality(result[i].episodes[j].watchOnlineLinks);
        }
    }

    return result;
}

export function groupMovieLinks(links, watchOnlineLinks) {
    let qualities = [
        {quality: '2160p', links: [], watchOnlineLinks: []},
        {quality: '1080p', links: [], watchOnlineLinks: []},
        {quality: '720p', links: [], watchOnlineLinks: []},
        {quality: '480p', links: [], watchOnlineLinks: []},
        {quality: '360p', links: [], watchOnlineLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: []}
    ];

    for (let i = 0; i < links.length; i++) {
        let matchQuality = false;
        for (let j = 0; j < qualities.length; j++) {
            if (links[i].info.includes(qualities[j].quality)) {
                qualities[j].links.push(links[i]);
                matchQuality = true;
                break;
            }
        }
        if (!matchQuality) {
            qualities.find(item => item.quality === 'others').links.push(links[i]);
        }
    }

    for (let i = 0; i < watchOnlineLinks.length; i++) {
        let matchQuality = false;
        for (let j = 0; j < qualities.length; j++) {
            if (watchOnlineLinks[i].info.includes(qualities[j].quality)) {
                qualities[j].watchOnlineLinks.push(watchOnlineLinks[i]);
                matchQuality = true;
                break;
            }
        }
        if (!matchQuality) {
            qualities.find(item => item.quality === 'others').watchOnlineLinks.push(links[i]);
        }
    }

    //sort links
    for (let i = 0; i < qualities.length; i++) {
        qualities[i].links = sortLinksByQuality(qualities[i].links);
        qualities[i].watchOnlineLinks = sortLinksByQuality(qualities[i].watchOnlineLinks);
    }

    return qualities;
}

export function updateMoviesGroupedLinks(prevGroupedLinks, currentGroupedLinks, sourceName) {
    let updateFlag = false;
    for (let i = 0; i < currentGroupedLinks.length; i++) {
        let checkQuality = prevGroupedLinks.find(item => item.quality === currentGroupedLinks[i].quality);
        if (checkQuality) {
            //quality exist
            checkQuality.checked = true;
            //get source links
            let prevLinks = checkQuality.links.filter(item => item.sourceName === sourceName);
            let prevOnlineLinks = checkQuality.watchOnlineLinks.filter(item => item.sourceName === sourceName);
            let currentLinks = currentGroupedLinks[i].links;
            let currentOnlineLinks = currentGroupedLinks[i].watchOnlineLinks;
            let linkUpdateResult = updateSerialLinks(checkQuality, prevLinks, prevOnlineLinks, currentLinks, currentOnlineLinks);
            updateFlag = linkUpdateResult || updateFlag;
        } else {
            //new quality
            currentGroupedLinks[i].checked = true;
            prevGroupedLinks.push(currentGroupedLinks[i]);
            updateFlag = true;
        }
    }

    //handle removed quality links
    for (let i = 0; i < prevGroupedLinks.length; i++) {
        if (!prevGroupedLinks[i].checked) {
            let prevLength = prevGroupedLinks[i].links.length;
            let prevOnlineLength = prevGroupedLinks[i].watchOnlineLinks.length;
            prevGroupedLinks[i].links = prevGroupedLinks[i].links.filter(link => link.sourceName !== sourceName);
            prevGroupedLinks[i].watchOnlineLinks = prevGroupedLinks[i].watchOnlineLinks.filter(link => link.sourceName !== sourceName);
            let newLength = prevGroupedLinks[i].links.length;
            let newOnlineLength = prevGroupedLinks[i].watchOnlineLinks.length;
            if (prevLength !== newLength || prevOnlineLength !== newOnlineLength) {
                updateFlag = true;
            }
        }
        delete prevGroupedLinks[i].checked;
    }

    return updateFlag;
}

export function updateSerialLinks(checkEpisode, prevLinks, prevOnlineLinks, currentLinks, currentOnlineLinks) {
    let updateFlag = false;

    let linksUpdateNeed = prevLinks.length !== currentLinks.length;
    if (!linksUpdateNeed) {
        for (let k = 0; k < prevLinks.length; k++) {
            //check changed links
            if (!checkEqualLinks(prevLinks[k], currentLinks[k])) {
                linksUpdateNeed = true;
                break;
            }
        }
    }
    if (linksUpdateNeed) {
        //remove prev link
        let removeLinks = prevLinks.map(item => item.link);
        checkEpisode.links = checkEpisode.links.filter(item => !removeLinks.includes(item.link));
        //add current links
        checkEpisode.links = [...checkEpisode.links, ...currentLinks];
        checkEpisode.links = sortLinksByQuality(checkEpisode.links);
        updateFlag = true;
    }

    let onlineLinksUpdateNeed = prevOnlineLinks.length !== currentOnlineLinks.length;
    if (!onlineLinksUpdateNeed) {
        for (let k = 0; k < prevOnlineLinks.length; k++) {
            //check changed links
            if (!checkEqualLinks(prevOnlineLinks[k], currentOnlineLinks[k])) {
                onlineLinksUpdateNeed = true;
                break;
            }
        }
    }
    if (onlineLinksUpdateNeed) {
        //remove prev link
        let removeLinks = prevOnlineLinks.map(item => item.link);
        checkEpisode.watchOnlineLinks = checkEpisode.watchOnlineLinks.filter(item => !removeLinks.includes(item.link));
        //add current links
        checkEpisode.watchOnlineLinks = [...checkEpisode.watchOnlineLinks, ...currentOnlineLinks];
        checkEpisode.watchOnlineLinks = sortLinksByQuality(checkEpisode.watchOnlineLinks);
        updateFlag = true;
    }

    return updateFlag;
}

export function checkEqualLinks(link1, link2) {
    return (
        link1.link === link2.link &&
        link1.info === link2.info &&
        link1.qualitySample === link2.qualitySample &&
        link1.pageLink === link2.pageLink &&
        link1.season === link2.season &&
        link1.episode === link2.episode
    );
}

export function sortLinksByQuality(links) {
    return links.sort((a, b) => checkBetterQuality(a.info, b.info, false) ? -1 : 1);
}
