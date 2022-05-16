import {get_OMDB_EpisodesData} from "./3rdPartyApi/omdbApi.js";
import {getEpisodeModel_placeholder} from "../models/episode.js";
import {groupSerialLinks, updateSerialLinks} from "./link.js";

export async function handleSeasonEpisodeUpdate(db_data, sourceName, site_links, siteWatchOnlineLinks, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist = true) {
    let links_seasons = groupSerialLinks(site_links, siteWatchOnlineLinks);
    let seasonsUpdateFlag = handleLinksSeasonUpdate(db_data.seasons, links_seasons, sourceName);
    let nextEpisodeUpdateFlag = false;

    //omdb api
    if (omdbApiFields) {
        let omdbEpisodes = await get_OMDB_EpisodesData(omdbApiFields.omdbTitle, totalSeasons, titleExist);
        if (omdbEpisodes) {
            let result = updateSeasonEpisodeData(db_data.seasons, omdbEpisodes);
            seasonsUpdateFlag = result || seasonsUpdateFlag;
        }
    }

    //tvmaze api
    if (tvmazeApiFields) {
        db_data.nextEpisode = tvmazeApiFields.nextEpisode;
        nextEpisodeUpdateFlag = true;
        let result = updateSeasonEpisodeData(db_data.seasons, tvmazeApiFields.episodes);
        seasonsUpdateFlag = result || seasonsUpdateFlag;
    }

    let missedEpisodeResult = handleMissedSeasonEpisode(db_data.seasons);
    seasonsUpdateFlag = missedEpisodeResult || seasonsUpdateFlag;

    if (seasonsUpdateFlag) {
        db_data.seasons = db_data.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        for (let i = 0; i < db_data.seasons.length; i++) {
            db_data.seasons[i].episodes = db_data.seasons[i].episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        }

        fixEpisodesZeroDuration(db_data.seasons, db_data.duration, db_data.type);
    }

    return {
        seasonsUpdateFlag,
        nextEpisodeUpdateFlag,
    };
}

export function handleSiteSeasonEpisodeUpdate(db_data, sourceName, site_links, siteWatchOnlineLinks) {
    let links_seasons = groupSerialLinks(site_links, siteWatchOnlineLinks);
    let seasonsUpdateFlag = handleLinksSeasonUpdate(db_data.seasons, links_seasons, sourceName);

    let missedEpisodeResult = handleMissedSeasonEpisode(db_data.seasons);

    if (seasonsUpdateFlag || missedEpisodeResult) {
        db_data.seasons = db_data.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        for (let i = 0; i < db_data.seasons.length; i++) {
            db_data.seasons[i].episodes = db_data.seasons[i].episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        }

        fixEpisodesZeroDuration(db_data.seasons, db_data.duration, db_data.type);
    }

    return (seasonsUpdateFlag || missedEpisodeResult);
}

function updateSeasonEpisodeData(db_seasons, currentEpisodes) {
    let updateFlag = false;
    for (let i = 0; i < currentEpisodes.length; i++) {
        let seasonNumber = currentEpisodes[i].season;
        let episodeNumber = currentEpisodes[i].episode;
        delete currentEpisodes[i].season;
        delete currentEpisodes[i].episode;
        let checkSeason = db_seasons.find(item => item.seasonNumber === seasonNumber);
        if (checkSeason) {
            //season exist
            let checkEpisode = checkSeason.episodes.find(item => item.episodeNumber === episodeNumber);
            if (checkEpisode) {
                //episode exist
                if (handleEpisodeDataUpdate(checkEpisode, currentEpisodes[i])) {
                    updateFlag = true;
                }
            } else {
                //new episode
                checkSeason.episodes.push({
                    episodeNumber: episodeNumber,
                    ...currentEpisodes[i],
                    links: [],
                    watchOnlineLinks: [],
                });
                updateFlag = true;
            }
        } else {
            //new season
            db_seasons.push({
                seasonNumber: seasonNumber,
                episodes: [{
                    episodeNumber: episodeNumber,
                    ...currentEpisodes[i],
                    links: [],
                    watchOnlineLinks: [],
                }],
            });
            updateFlag = true;
        }
    }

    return updateFlag;
}

function handleEpisodeDataUpdate(prevEpisode, currentEpisode) {
    let episodeUpdated = false;

    const checkFields = ['title', 'duration', 'released', 'releaseStamp', 'imdbRating', 'imdbID'];

    for (let i = 0; i < checkFields.length; i++) {
        let key = checkFields[i];
        if (prevEpisode[key] !== currentEpisode[key] && currentEpisode[key]) {
            prevEpisode[key] = currentEpisode[key];
            episodeUpdated = true;
        }
    }

    return episodeUpdated;
}

function handleLinksSeasonUpdate(db_seasons, currentSeasons, sourceName) {
    let updateFlag = false;
    for (let i = 0; i < currentSeasons.length; i++) {
        let checkSeason = db_seasons.find(item => item.seasonNumber === currentSeasons[i].seasonNumber);
        if (checkSeason) {
            //season exist
            let prevEpisodes = checkSeason.episodes;
            let currentEpisodes = currentSeasons[i].episodes;
            for (let j = 0; j < currentEpisodes.length; j++) {
                let checkEpisode = prevEpisodes.find(item => item.episodeNumber === currentEpisodes[j].episodeNumber);
                if (checkEpisode) {
                    //episode exist
                    checkEpisode.checked = true;
                    //get source links
                    let prevLinks = checkEpisode.links.filter(item => item.sourceName === sourceName);
                    let prevOnlineLinks = checkEpisode.watchOnlineLinks.filter(item => item.sourceName === sourceName);
                    let currentLinks = currentEpisodes[j].links;
                    let currentOnlineLinks = currentEpisodes[j].watchOnlineLinks;
                    let linkUpdateResult = updateSerialLinks(checkEpisode, prevLinks, prevOnlineLinks, currentLinks, currentOnlineLinks);
                    updateFlag = linkUpdateResult || updateFlag;
                } else {
                    //new episode
                    currentEpisodes[j].checked = true;
                    checkSeason.episodes.push(currentEpisodes[j]);
                    updateFlag = true;
                }
            }
        } else {
            //new season
            for (let j = 0; j < currentSeasons[i].episodes.length; j++) {
                currentSeasons[i].episodes[j].checked = true;
            }
            db_seasons.push(currentSeasons[i]);
            updateFlag = true;
        }
    }

    //handle removed episode links
    for (let i = 0; i < db_seasons.length; i++) {
        let episodes = db_seasons[i].episodes;
        for (let j = 0; j < episodes.length; j++) {
            if (!episodes[j].checked) {
                let prevLength = episodes[j].links.length;
                let prevOnlineLength = episodes[j].watchOnlineLinks.length;
                episodes[j].links = episodes[j].links.filter(link => link.sourceName !== sourceName);
                episodes[j].watchOnlineLinks = episodes[j].watchOnlineLinks.filter(link => link.sourceName !== sourceName);
                let newLength = episodes[j].links.length;
                let newOnlineLength = episodes[j].watchOnlineLinks.length;
                if (prevLength !== newLength || prevOnlineLength !== newOnlineLength) {
                    updateFlag = true;
                }
            }
            delete episodes[j].checked;
        }
    }

    return updateFlag;
}

function handleMissedSeasonEpisode(db_seasons) {
    let missedSeasonEpisodeFlag = false;
    for (let i = 0; i < db_seasons.length; i++) {
        let seasonNumber = db_seasons[i].seasonNumber;
        let episodes = db_seasons[i].episodes;
        const maxEpisodeNumber = Math.max(...episodes.map(item => item.episodeNumber));
        if (seasonNumber === 0) {
            continue;
        }

        for (let j = 1; j <= maxEpisodeNumber; j++) {
            let episodeExist = false;
            for (let k = 0; k < episodes.length; k++) {
                if (j === episodes[k].episodeNumber) {
                    episodeExist = true;
                    break;
                }
            }
            if (!episodeExist) {
                let episodeModel = getEpisodeModel_placeholder(seasonNumber, j);
                delete episodeModel.season;
                delete episodeModel.episode;
                episodes.push({
                    episodeNumber: j,
                    ...episodeModel,
                    links: [],
                });
                missedSeasonEpisodeFlag = true;
            }
        }
    }

    const maxSeasonNumber = Math.max(...db_seasons.map(item => item.episodeNumber));
    for (let j = 1; j <= maxSeasonNumber; j++) {
        let seasonExist = false;
        for (let k = 0; k < db_seasons.length; k++) {
            if (j === db_seasons[k].seasonNumber) {
                seasonExist = true;
                break;
            }
        }
        if (!seasonExist) {
            db_seasons.push({
                seasonNumber: j,
                episodes: [],
            });
            missedSeasonEpisodeFlag = true;
        }
    }

    return missedSeasonEpisodeFlag;
}

function fixEpisodesZeroDuration(seasons, duration, type) {
    let badCases = [null, 'null min', '', 'N/A', 'N/A min', '0 min'];
    duration = (!duration || badCases.includes(duration)) ? '0 min' : duration;
    if (duration === '0 min' && type === 'anime_serial') {
        duration = '24 min';
    }

    for (let i = 0; i < seasons.length; i++) {
        let episodes = seasons[i].episodes;
        for (let j = 0; j < episodes.length; j++) {
            if (!badCases.includes(episodes[j].duration) && episodes[j].duration && !isNaN(episodes[j].duration)) {
                episodes[j].duration = episodes[j].duration + ' min';
                continue;
            }
            if (badCases.includes(episodes[j].duration)) {
                let fixed = false;
                let prevEpisodesIndex = j;
                while (prevEpisodesIndex >= 0) {
                    if (!badCases.includes(episodes[prevEpisodesIndex].duration)) {
                        episodes[j].duration = episodes[prevEpisodesIndex].duration;
                        fixed = true;
                        break;
                    }
                    prevEpisodesIndex--;
                }
                if (!fixed) {
                    let nextEpisodesIndex = j;
                    while (nextEpisodesIndex < episodes.length) {
                        if (!badCases.includes(episodes[nextEpisodesIndex].duration)) {
                            episodes[j].duration = episodes[nextEpisodesIndex].duration;
                            fixed = true;
                            break;
                        }
                        nextEpisodesIndex++;
                    }
                }
                if (!fixed) {
                    episodes[j].duration = duration;
                }
            }
        }
    }
}

export function getTotalDuration(seasons, latestData, type) {
    let totalDuration = 0;
    let episodeCounter = 0;
    for (let i = 0; i < seasons.length; i++) {
        if (seasons[i].seasonNumber <= latestData.season) {
            let episodes = seasons[i].episodes;
            for (let j = 0; j < episodes.length; j++) {
                if (seasons[i].seasonNumber < latestData.season ||
                    episodes[j].episodeNumber <= latestData.episode) {
                    episodeCounter++;
                    totalDuration += Number(episodes[j].duration.replace('min', ''));
                }
            }
        }
    }
    if (totalDuration === 0) {
        let temp = type === 'anime_serial' ? 24 : 45;
        totalDuration = episodeCounter * temp;
    }
    let hours = Math.floor(totalDuration / 60);
    let minutes = totalDuration % 60;
    totalDuration = hours + ':' + minutes;
    return totalDuration;
}

export function getEndYear(seasons, status, year) {
    if (status === 'ended') {
        if (seasons.length > 0) {
            let lastSeason = seasons[seasons.length - 1];
            let lastEpisode = lastSeason.episodes[lastSeason.episodes.length - 1];
            return lastEpisode.released.split('-')[0];
        } else {
            return year;
        }
    } else {
        // running
        return '';
    }
}
