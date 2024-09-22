import {checkBetterQuality, removeDuplicateLinks} from "./utils/utils.js";
import {getEpisodeModel_placeholder} from "../models/episode.js";

export function check_format(link, title) {
    link = link.toLowerCase().trim();
    const videoExtensionsRegex = /\.(avi|flv|m4v|mkv|mov|mp4|mpg|mpeg|rm|swf|wmv|3gp|3g2)(\?((md\d)|(par))=.+)?$/i;
    return (
        videoExtensionsRegex.test(link.replace(/\?\d+/g, '')) &&
        !link.includes('teaser') &&
        !link.includes('trailer') &&
        !link.includes('trialer') &&
        !link.includes('/sound/') &&
        !link.includes('opening.mp4') &&
        !link.includes('intro.mp4') &&
        !link.match(/dubbed\.audio\.\(irib\)\.mkv/) &&
        !link.match(/s\d+\.mp4/) &&
        !link.replace(/the|\s|\./g, '').includes(title.replace(/the|\s|\./g, '') + 'mp4')
    );
}

//----------------------------------------
//----------------------------------------

export function groupSerialLinks(links, watchOnlineLinks, torrentLinks) {
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
                        torrentLinks: [],
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
                    torrentLinks: [],
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
                        torrentLinks: [],
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
                    torrentLinks: [],
                }],
            });
        }
    }

    //-------------------------------------------

    for (let i = 0; i < torrentLinks.length; i++) {
        let seasonExist = false;
        for (let j = 0; j < result.length; j++) {
            if (result[j].seasonNumber === torrentLinks[i].season) {
                seasonExist = true;
                let episodeExist = false;
                for (let k = 0; k < result[j].episodes.length; k++) {
                    if (result[j].episodes[k].episodeNumber === torrentLinks[i].episode) {
                        episodeExist = true;
                        result[j].episodes[k].torrentLinks.push(torrentLinks[i]);
                        break;
                    }
                }
                if (!episodeExist) {
                    let episodeModel = getEpisodeModel_placeholder(torrentLinks[i].season, torrentLinks[i].episode);
                    delete episodeModel.season;
                    delete episodeModel.episode;
                    result[j].episodes.push({
                        episodeNumber: torrentLinks[i].episode,
                        ...episodeModel,
                        links: [],
                        watchOnlineLinks: [],
                        torrentLinks: [torrentLinks[i]],
                    });
                }
                break;
            }
        }
        if (!seasonExist) {
            let episodeModel = getEpisodeModel_placeholder(torrentLinks[i].season, torrentLinks[i].episode);
            delete episodeModel.season;
            delete episodeModel.episode;
            result.push({
                seasonNumber: torrentLinks[i].season,
                episodes: [{
                    episodeNumber: torrentLinks[i].episode,
                    ...episodeModel,
                    links: [],
                    watchOnlineLinks: [],
                    torrentLinks: [torrentLinks[i]],
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
            result[i].episodes[j].torrentLinks = sortLinksByQuality(result[i].episodes[j].torrentLinks, true);
        }
    }

    return result;
}

export function groupMovieLinks(links, watchOnlineLinks, torrentLinks) {
    let qualities = [
        {quality: '2160p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: '1080p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: '720p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: '480p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: '360p', links: [], watchOnlineLinks: [], torrentLinks: []},
        {quality: 'others', links: [], watchOnlineLinks: [], torrentLinks: []}
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

    for (let i = 0; i < torrentLinks.length; i++) {
        let matchQuality = false;
        for (let j = 0; j < qualities.length; j++) {
            if (torrentLinks[i].info.includes(qualities[j].quality)) {
                qualities[j].torrentLinks.push(torrentLinks[i]);
                matchQuality = true;
                break;
            }
        }
        if (!matchQuality) {
            qualities.find(item => item.quality === 'others').torrentLinks.push(links[i]);
        }
    }

    //sort links
    for (let i = 0; i < qualities.length; i++) {
        qualities[i].links = sortLinksByQuality(qualities[i].links);
        qualities[i].watchOnlineLinks = sortLinksByQuality(qualities[i].watchOnlineLinks);
        qualities[i].torrentLinks = sortLinksByQuality(qualities[i].torrentLinks, true);
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
            let prevTorrentLinks = checkQuality.torrentLinks;
            let currentLinks = currentGroupedLinks[i].links;
            let currentOnlineLinks = currentGroupedLinks[i].watchOnlineLinks;
            let currentTorrentLinks = currentGroupedLinks[i].torrentLinks;
            let linkUpdateResult = updateSerialLinks(checkQuality, prevLinks, prevOnlineLinks, prevTorrentLinks, currentLinks, currentOnlineLinks, currentTorrentLinks);
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

export function updateSerialLinks(checkEpisode, prevLinks, prevOnlineLinks, prevTorrentLinks, currentLinks, currentOnlineLinks, currentTorrentLinks) {
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

    //-----------------------------------------

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

    //-----------------------------------------

    let prevTorrentLength = prevTorrentLinks.length;
    let newTorrentLinksArray = removeDuplicateLinks([...prevTorrentLinks, ...currentTorrentLinks]);
    let newTorrentLength = newTorrentLinksArray.length;
    if (prevTorrentLength !== newTorrentLength) {
        checkEpisode.torrentLinks = sortLinksByQuality(newTorrentLinksArray, true);
        updateFlag = true;
    }

    return updateFlag;
}

export function checkEqualLinks(link1, link2) {
    return (
        link1.link === link2.link &&
        link1.info === link2.info &&
        link1.qualitySample === link2.qualitySample &&
        link1.season === link2.season &&
        link1.episode === link2.episode
    );
}

export function sortLinksByQuality(links, handleMalformedInfo = false) {
    return links.sort((a, b) => checkBetterQuality(a.info, b.info, false, handleMalformedInfo) ? -1 : 1);
}
