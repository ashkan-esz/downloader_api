import {wordsToNumbers} from "words-to-numbers";
import {getDecodedLink} from "./utils";
import {getEpisodeModel_placeholder} from "../models/episode";
import {saveError} from "../error/saveError";


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
                link.replace(/\.the\.movie|the\.|at\./g, '').includes(matchCases.case1.replace(/\.the\.movie|the\.|at\./g, '')) ||
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
        !link.replace(/\?\d+/g, '').match(/\.(mkv|mp4|avi|mov|flv|wmv)$/g) ||
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
        link.includes('dvdrip') || link.includes('hdcam') ||
        link.includes('mobile') || link.match(/\d\d\d+\.nineanime/g)
    ) {
        return true;
    }

    return (type.includes('serial') && checkSerialLinkMatch(link));
}

function checkSerialLinkMatch(link) {
    let decodedLink = getDecodedLink(link).toLowerCase().replace(/_/gi, '.');
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
        /([.\s\[(])+\s*(.*)\s*(\d\d\d+p*|dvdrip|dvd|web)\s*(.*)\s*([.\s\])])+\s*([.\[]*)(bia2anime|(animdl|animelit|animList|animeList)\.(ir|top)|x265|10bit|mkv)([.\]]*)/gi);
}

//---------------------

export function groupSerialLinks(links) {
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
                }],
            });
        }
    }

    result = result.sort((a, b) => a.seasonNumber - b.seasonNumber);
    for (let i = 0; i < result.length; i++) {
        result[i].episodes = result[i].episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    }

    return result;
}

export function groupMovieLinks(links) {
    let qualities = [
        {quality: '2160p', links: []},
        {quality: '1080p', links: []},
        {quality: '720p', links: []},
        {quality: '480p', links: []},
        {quality: '360p', links: []},
        {quality: 'others', links: []}
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

    return qualities;
}

export function updateMoviesGroupedLinks(prevGroupedLinks, currentGroupedLinks, sourceName) {
    let updateFlag = false;
    for (let i = 0; i < currentGroupedLinks.length; i++) {
        let checkQuality = prevGroupedLinks.find(item => item.quality === currentGroupedLinks[i].quality);
        if (checkQuality) {
            //quality exist
            prevGroupedLinks[i].checked = true;
            //get source links
            let prevLinks = checkQuality.links.filter(item => item.sourceName === sourceName);
            let currentLinks = currentGroupedLinks[i].links;
            let linkUpdateResult = updateSerialLinks(checkQuality, prevLinks, currentLinks);
            updateFlag = linkUpdateResult || updateFlag;
        } else {
            //new quality
            currentGroupedLinks[i].checked = true;
            prevGroupedLinks.push(currentGroupedLinks[i]);
            updateFlag = true;
        }
    }

    //handle removed quality links
    for (let i = 0; i < currentGroupedLinks.length; i++) {
        if (!currentGroupedLinks[i].checked) {
            let prevLength = currentGroupedLinks[i].links.length;
            currentGroupedLinks[i].links = currentGroupedLinks[i].links.filter(link => link.sourceName === sourceName);
            let newLength = currentGroupedLinks[i].links.length;
            if (prevLength !== newLength) {
                updateFlag = true;
            }
        }
        delete currentGroupedLinks[i].checked;
    }

    return updateFlag;
}

export function updateSerialLinks(checkEpisode, prevLinks, currentLinks) {
    let updateFlag = false;
    if (prevLinks.length !== currentLinks.length) {
        //remove prev link
        let removeLinks = prevLinks.map(item => item.link);
        checkEpisode.links = checkEpisode.links.filter(item => !removeLinks.includes(item.link));
        //add current links
        checkEpisode.links = [...checkEpisode.links, ...currentLinks];
        updateFlag = true;
    } else {
        for (let k = 0; k < prevLinks.length; k++) {
            //replace changed links
            if (!checkEqualLinks(prevLinks[k], currentLinks[k])) {
                prevLinks[k] = currentLinks[k];
                updateFlag = true;
            }
        }
    }
    return updateFlag;
}

export function checkEqualLinks(link1, link2) {
    return (
        link1.link === link2.link &&
        link1.info === link2.info &&
        link1.qualitySample === link2.qualitySample &&
        link1.pageLink === link2.pageLink
    );
}
