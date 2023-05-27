import {checkBetterQuality, checkDubbed, checkHardSub, getDatesBetween, getSeasonEpisode} from "./utils/utils.js";


export function handleLatestDataUpdate(db_data, latestData, type) {
    let prevLatestData = db_data.latestData;
    let latestDataChange = false;
    let PrimaryLatestDataChange = false;

    if (type.includes('serial')) {
        let updateFlag = false;
        if (latestData.season > prevLatestData.season) {
            db_data.latestData.updateReason = 'season';
            updateFlag = true;
        } else if (latestData.season === prevLatestData.season && latestData.episode > prevLatestData.episode) {
            db_data.latestData.updateReason = 'episode';
            updateFlag = true;
        } else if (latestData.season === prevLatestData.season && latestData.episode === prevLatestData.episode &&
            checkBetterQuality(latestData.quality, prevLatestData.quality)) {
            if (db_data.update_date && getDatesBetween(new Date(), db_data.update_date).hours > 2) {
                db_data.latestData.updateReason = 'quality';
            }
            updateFlag = true;
        }

        if (updateFlag) {
            db_data.latestData.season = latestData.season;
            db_data.latestData.episode = latestData.episode;
            db_data.latestData.quality = latestData.quality;
            latestDataChange = true;
            PrimaryLatestDataChange = true;
        }
    } else if (checkBetterQuality(latestData.quality, prevLatestData.quality)) {
        // movie, better quality
        db_data.latestData.quality = latestData.quality;
        db_data.latestData.updateReason = 'quality';
        latestDataChange = true;
        PrimaryLatestDataChange = true;
    }

    if (checkLatestDataFieldChange(prevLatestData.hardSub, latestData.hardSub)) {
        db_data.latestData.hardSub = latestData.hardSub;
        latestDataChange = true;
    }

    if (checkLatestDataFieldChange(prevLatestData.dubbed, latestData.dubbed)) {
        db_data.latestData.dubbed = latestData.dubbed;
        latestDataChange = true;
    }

    if (checkLatestDataFieldChange(prevLatestData.censored, latestData.censored)) {
        db_data.latestData.censored = latestData.censored;
        latestDataChange = true;
    }

    if (checkLatestDataFieldChange(prevLatestData.subtitle, latestData.subtitle)) {
        db_data.latestData.subtitle = latestData.subtitle;
        latestDataChange = true;
    }

    if (checkLatestDataFieldChange(prevLatestData.watchOnlineLink, latestData.watchOnlineLink)) {
        db_data.latestData.watchOnlineLink = latestData.watchOnlineLink;
        latestDataChange = true;
    }

    return {latestDataChange, PrimaryLatestDataChange};
}

function checkLatestDataFieldChange(prevField, currentField) {
    if (prevField === currentField) {
        return false;
    }

    let prev_se = getSeasonEpisode(prevField);
    let current_se = getSeasonEpisode(currentField);
    return (prev_se.season < current_se.season) ||
        (prev_se.season === current_se.season && prev_se.episode < current_se.episode);
}

export function getLatestData(site_links, siteWatchOnlineLinks, subtitles, type) {
    let latestSeason = type.includes('movie') ? 0 : 1;
    let latestEpisode = type.includes('movie')
        ? 0
        : (site_links.length === 0 && siteWatchOnlineLinks.length === 0) ? 0 : 1;
    let latestQuality = site_links.length > 0 ? site_links[0].info : '';
    let hardSub = '';
    let dubbed = '';
    let censored = '';
    let onlineLink = (type.includes('movie') && siteWatchOnlineLinks.length > 0) ? 's1e1' : '';
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
        watchOnlineLink: onlineLink
    };
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
