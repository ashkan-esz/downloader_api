import {checkBetterQuality, checkDubbed, checkHardSub, getDatesBetween, getSeasonEpisode} from "./utils/utils.js";

const latestDataKeys = ['season', 'episode', 'quality', 'hardSub', 'dubbed', 'censored', 'subtitle', 'watchOnlineLink', 'torrentLinks'];

export function handleLatestDataUpdate(db_data, type) {
    const newLatestData = reCreateLatestData(db_data, type);
    const prevLatestData = db_data.latestData;
    let latestDataChanged = false;
    let latestDataUpdate = false;
    let PrimaryLatestDataUpdate = false;

    if (type.includes('serial')) {
        if (newLatestData.season > prevLatestData.season) {
            newLatestData.updateReason = 'season';
            latestDataUpdate = true;
            PrimaryLatestDataUpdate = true;
        } else if (newLatestData.season === prevLatestData.season && newLatestData.episode > prevLatestData.episode) {
            newLatestData.updateReason = 'episode';
            latestDataUpdate = true;
            PrimaryLatestDataUpdate = true;
        } else if (newLatestData.season === prevLatestData.season && newLatestData.episode === prevLatestData.episode &&
            checkBetterQuality(newLatestData.quality, prevLatestData.quality)) {
            if (db_data.update_date && getDatesBetween(new Date(), db_data.update_date).hours > 2) {
                newLatestData.updateReason = 'quality';
            }
            latestDataUpdate = true;
            PrimaryLatestDataUpdate = true;
        }
    } else if (checkBetterQuality(newLatestData.quality, prevLatestData.quality)) {
        // movie, better quality
        newLatestData.updateReason = 'quality';
        latestDataUpdate = true;
        PrimaryLatestDataUpdate = true;
    }

    if (checkLatestDataFieldUpdate(prevLatestData.torrentLinks, newLatestData.torrentLinks)) {
        latestDataUpdate = true;
        let se = getSeasonEpisode(newLatestData.torrentLinks);
        if (newLatestData.season < se.season) {
            newLatestData.updateReason = 'torrent-season';
            PrimaryLatestDataUpdate = true;
        } else if (newLatestData.season === se.season && newLatestData.episode < se.episode) {
            newLatestData.updateReason = 'torrent-episode';
            PrimaryLatestDataUpdate = true;
        }
    }

    if (!latestDataUpdate) {
        latestDataUpdate = checkLatestDataFieldUpdate(prevLatestData.hardSub, newLatestData.hardSub) ||
            checkLatestDataFieldUpdate(prevLatestData.dubbed, newLatestData.dubbed) ||
            checkLatestDataFieldUpdate(prevLatestData.censored, newLatestData.censored) ||
            checkLatestDataFieldUpdate(prevLatestData.subtitle, newLatestData.subtitle) ||
            checkLatestDataFieldUpdate(prevLatestData.watchOnlineLink, newLatestData.watchOnlineLink);
    }

    if (latestDataUpdate) {
        latestDataChanged = true;
    } else {
        for (let i = 0; i < latestDataKeys.length; i++) {
            if (prevLatestData[latestDataKeys[i]] !== newLatestData[latestDataKeys[i]]) {
                latestDataChanged = true;
                break;
            }
        }
    }

    if (latestDataChanged) {
        db_data.latestData = newLatestData;
    }

    return {latestDataChanged, latestDataUpdate, PrimaryLatestDataUpdate};
}

export function reCreateLatestData(db_data, type) {
    let subtitles = db_data.subtitles.map(s => s.links).flat(1);
    if (type.includes('movie')) {
        let links = db_data.qualities.map(e => e.links).flat(1);
        let watchOnlineLinks = db_data.qualities.map(e => e.watchOnlineLinks).flat(1);
        let torrentLinks = db_data.qualities.map(e => e.torrentLinks).flat(1);
        return getLatestData(links, watchOnlineLinks, torrentLinks, subtitles, type);
    } else {
        let episodes = db_data.seasons.map(s => s.episodes).flat(1);
        let links = episodes.map(e => e.links).flat(1);
        let watchOnlineLinks = episodes.map(e => e.watchOnlineLinks).flat(1);
        let torrentLinks = episodes.map(e => e.torrentLinks).flat(1);
        return getLatestData(links, watchOnlineLinks, torrentLinks, subtitles, type);
    }
}

export function getLatestData(site_links, siteWatchOnlineLinks, siteTorrentLinks, subtitles, type) {
    let latestSeason = type.includes('movie') ? 0 : 1;
    let latestEpisode = type.includes('movie')
        ? 0
        : (site_links.length === 0 && siteWatchOnlineLinks.length === 0) ? 0 : 1;
    let latestQuality = site_links.length > 0 ? site_links[0].info : '';
    let hardSub = '';
    let dubbed = '';
    let censored = '';
    let onlineLink = (type.includes('movie') && siteWatchOnlineLinks.length > 0) ? 's1e1' : '';
    let torrentLink = (type.includes('movie') && siteTorrentLinks.length > 0) ? 's1e1' : '';
    let subtitle = (type.includes('movie') && subtitles.length > 0) ? 's1e1' : '';

    // download links
    for (let i = 0; i < site_links.length; i++) {
        let link = site_links[i].link;
        let info = site_links[i].info;
        if (type.includes('serial')) {
            let {season, episode} = site_links[i];
            //handle multi episode in one file
            let multiEpisodeMatch = info.match(/\.Episode\(\d+-\d+\)/gi);
            if (multiEpisodeMatch) {
                let temp = multiEpisodeMatch.pop().match(/\d+-\d+/g).pop().split('-').pop();
                if (temp) {
                    episode = Number(temp);
                }
            }
            if (season > latestSeason) { //found new season
                latestSeason = season;
                latestEpisode = episode;
                latestQuality = info;
                hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                censored = (info.toLowerCase().includes('.censor')) ? `s${latestSeason}e${latestEpisode}` : censored;
            } else if (season === latestSeason) {
                if (episode > latestEpisode) {
                    latestEpisode = episode;
                    latestQuality = info;
                    hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                    censored = (info.toLowerCase().includes('.censor')) ? `s${latestSeason}e${latestEpisode}` : censored;
                } else if (episode === latestEpisode) {
                    latestQuality = checkBetterQuality(info, latestQuality) ? info : latestQuality;
                    hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                    censored = (info.toLowerCase().includes('.censor')) ? `s${latestSeason}e${latestEpisode}` : censored;
                }
            }
        } else if (type.includes('movie')) {
            latestQuality = checkBetterQuality(info, latestQuality) ? info : latestQuality;
            hardSub = checkHardSub(info) ? 's1e1' : hardSub;
            dubbed = checkDubbed(link, info) ? 's1e1' : dubbed;
            censored = (info.toLowerCase().includes('.censor')) ? 's1e1' : censored;
        }
    }
    latestQuality = latestQuality.replace(/s\d+e\d+\./gi, '');

    let updateReason = '';
    if (type.includes('movie') && latestQuality) {
        updateReason = 'quality';
    } else if (type.includes('serial') && latestEpisode) {
        updateReason = 'episode';
    }

    // watch online links
    if (type.includes('serial') && siteWatchOnlineLinks.length > 0) {
        let sortedOnlineLinks = sortLinkWithInfoCheck(siteWatchOnlineLinks);
        let latestOnlineLink = sortedOnlineLinks[sortedOnlineLinks.length - 1];
        let episodeNumber = getEpisodeNumber(latestOnlineLink);
        onlineLink = `s${latestOnlineLink.season}e${episodeNumber}`;
    }

    // torrent links
    if (siteTorrentLinks.length > 0) {
        let sortedTorrentLinks = sortLinkWithInfoCheck(siteTorrentLinks);
        let latestTorrentLink = sortedTorrentLinks[sortedTorrentLinks.length - 1];
        let episodeNumber = getEpisodeNumber(latestTorrentLink);
        torrentLink = `s${latestTorrentLink.season}e${episodeNumber}`;
    }

    // subtitles
    if (type.includes('serial') && subtitles.length > 0) {
        let sortedSubtitles = sortLinkWithInfoCheck(subtitles);
        let latestSubtitle = sortedSubtitles[sortedSubtitles.length - 1];
        let episodeNumber = getEpisodeNumber(latestSubtitle);
        subtitle = `s${latestSubtitle.season}e${episodeNumber}`;
    }

    return {
        season: latestSeason,
        episode: latestEpisode,
        quality: latestQuality,
        updateReason,
        hardSub,
        dubbed,
        censored,
        subtitle,
        watchOnlineLink: onlineLink,
        torrentLinks: torrentLink,
    };
}

//----------------------------------------------------------------
//----------------------------------------------------------------

function checkLatestDataFieldUpdate(prevField, currentField) {
    if (prevField === currentField) {
        return false;
    }

    let prev_se = getSeasonEpisode(prevField);
    let current_se = getSeasonEpisode(currentField);
    return (prev_se.season < current_se.season) ||
        (prev_se.season === current_se.season && prev_se.episode < current_se.episode);
}

function sortLinkWithInfoCheck(links) {
    return links.sort((a, b) => {
        let a_episode = getEpisodeNumber(a);
        let b_episode = getEpisodeNumber(b);
        return ((a.season > b.season) || (a.season === b.season && a_episode > b_episode)) ? 1 : -1;
    });
}

function getEpisodeNumber(linkData) {
    try {
        let episodeNumber = linkData.episode;
        let multiEpisodeMatch = linkData.info.match(/Episode\(\d+-\d+\)/gi);
        if (multiEpisodeMatch) {
            let temp = multiEpisodeMatch.pop().match(/\d+-\d+/g).pop().split('-').pop();
            if (temp) {
                episodeNumber = Number(temp);
            }
        }
        return episodeNumber;
    } catch (error) {
        saveError(error);
        return linkData.episode;
    }
}
