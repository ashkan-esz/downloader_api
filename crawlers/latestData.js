const {getSeasonEpisode, checkBetterQuality, checkHardSub, checkDubbed} = require("./utils");

export function handleLatestDataUpdate(db_data, latestData, type) {
    let changed = false;
    let hardSubChange = false;
    let dubbedChange = false;
    let prevLatestData = db_data.latestData;

    if (type.includes('serial')) {
        if ((latestData.season > prevLatestData.season) ||
            (latestData.season === prevLatestData.season && latestData.episode > prevLatestData.episode) ||
            (latestData.season === prevLatestData.season &&
                latestData.episode === prevLatestData.episode &&
                checkBetterQuality(latestData.quality, prevLatestData.quality))) {
            changed = true;
        }
    } else if (checkBetterQuality(latestData.quality, prevLatestData.quality)) {
        changed = true;
    }

    if (prevLatestData.hardSub !== latestData.hardSub ||
        prevLatestData.dubbed !== latestData.dubbed) {
        if (type.includes('serial')) {
            let prev = getSeasonEpisode(prevLatestData.hardSub);
            let current = getSeasonEpisode(latestData.hardSub);
            hardSubChange = (prev.season < current.season) ||
                (prev.season === current.season && prev.episode < current.episode);
            prev = getSeasonEpisode(prevLatestData.dubbed);
            current = getSeasonEpisode(latestData.dubbed);
            dubbedChange = (prev.season < current.season) ||
                (prev.season === current.season && prev.episode < current.episode);
        } else {
            hardSubChange = !prevLatestData.hardSub && latestData.hardSub;
            dubbedChange = !prevLatestData.dubbed && latestData.dubbed;
        }
    }

    if (changed) {
        db_data.latestData.season = latestData.season;
        db_data.latestData.episode = latestData.episode;
        db_data.latestData.quality = latestData.quality;
    }
    if (hardSubChange) {
        db_data.latestData.hardSub = latestData.hardSub;
    }
    if (dubbedChange) {
        db_data.latestData.dubbed = latestData.dubbed;
    }

    return changed || hardSubChange || dubbedChange;
}

export function getLatestData(site_links, type) {
    let latestSeason = type.includes('movie') ? 0 : 1;
    let latestEpisode = type.includes('movie') ? 0 : 1;
    let latestQuality = site_links[0].info;
    let hardSub = type.includes('movie') ? false : '';
    let dubbed = type.includes('movie') ? false : '';

    for (let i = 0; i < site_links.length; i++) {
        let link = site_links[i].link;
        let info = site_links[i].info;
        if (type.includes('serial')) {
            let {season, episode} = getSeasonEpisode(link);
            if (season === 0 && type === 'anime_serial') {
                ({season, episode} = getSeasonEpisode(info));
            }
            if (season > latestSeason) { //found new season
                latestSeason = season;
                latestEpisode = episode;
                latestQuality = info;
                hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
            } else if (season === latestSeason) {
                if (episode > latestEpisode) {
                    latestEpisode = episode;
                    latestQuality = info;
                    hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                } else if (episode === latestEpisode) {
                    latestQuality = checkBetterQuality(info, latestQuality) ? info : latestQuality;
                    hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                }
            }
        } else if (type.includes('movie')) {
            latestQuality = checkBetterQuality(info, latestQuality) ? info : latestQuality;
            hardSub = checkHardSub(info) || hardSub;
            dubbed = checkDubbed(link, info) || dubbed;
        }
    }
    latestQuality = latestQuality.replace(/s\d+e\d+\./gi, '');
    return {season: latestSeason, episode: latestEpisode, quality: latestQuality, hardSub, dubbed};
}
