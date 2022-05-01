import {getSeasonEpisode, checkBetterQuality, checkHardSub, checkDubbed} from "./utils.js";

//todo handle link info contain Episode(17-18)

export function handleLatestDataUpdate(db_data, latestData, type) {
    let changed = false;
    let hardSubChange = false;
    let dubbedChange = false;
    let subtitleChange = false;
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

    if (type.includes('serial')) {
        subtitleChange = prevLatestData.subtitle < latestData.subtitle;
    } else {
        subtitleChange = !prevLatestData.subtitle && latestData.subtitle;
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
    if (subtitleChange) {
        db_data.latestData.subtitle = latestData.subtitle;
    }

    return (changed || hardSubChange || dubbedChange || subtitleChange);
}

export function getLatestData(site_links, subtitles, type) {
    let latestSeason = type.includes('movie') ? 0 : 1;
    let latestEpisode = type.includes('movie') ? 0 : 1;
    let latestQuality = site_links.length > 0 ? site_links[0].info : '';
    //todo : normalize hardSub/dubbed between movies and serials
    let hardSub = type.includes('movie') ? false : '';
    let dubbed = type.includes('movie') ? false : '';
    //todo : fix sub to more like hardSub
    let sub = type.includes('movie') ? subtitles.length > 0 : 0;
    let prevStates = [1, 1, '', '', ''];

    for (let i = 0; i < site_links.length; i++) {
        let link = site_links[i].link;
        let info = site_links[i].info;
        if (type.includes('serial')) {
            let {season, episode} = site_links[i];
            if (season > latestSeason) { //found new season
                prevStates[0] = latestSeason;
                prevStates[1] = latestEpisode;
                prevStates[2] = latestQuality;
                prevStates[3] = hardSub;
                prevStates[4] = dubbed;
                latestSeason = season;
                latestEpisode = episode;
                latestQuality = info;
                hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
            } else if (season === latestSeason) {
                if (episode > latestEpisode) {
                    prevStates[1] = latestEpisode;
                    prevStates[2] = latestQuality;
                    prevStates[3] = hardSub;
                    prevStates[4] = dubbed;
                    latestEpisode = episode;
                    latestQuality = info;
                    hardSub = checkHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = checkDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                } else if (episode === latestEpisode) {
                    prevStates[2] = latestQuality;
                    prevStates[3] = hardSub;
                    prevStates[4] = dubbed;
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
    if (latestEpisode > 1 && latestEpisode - prevStates[1] > 1) {
        //episode leaked
        latestSeason = prevStates[0];
        latestEpisode = prevStates[1];
        latestQuality = prevStates[2];
        hardSub = prevStates[3];
        dubbed = prevStates[4];
    }

    if (type.includes('serial')) {
        for (let i = 0; i < subtitles.length; i++) {
            if (subtitles[i].episode > sub) {
                sub = subtitles[i].episode;
            }
        }
    }

    return {season: latestSeason, episode: latestEpisode, quality: latestQuality, hardSub, dubbed, sub};
}
