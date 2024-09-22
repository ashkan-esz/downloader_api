import {get_OMDB_EpisodesData} from "./3rdPartyApi/omdbApi.js";
import {getEpisodeModel_placeholder} from "../models/episode.js";
import {groupSerialLinks, updateSerialLinks} from "./link.js";
import {replaceSpecialCharacters} from "./utils/utils.js";
import {wordsToNumbers} from "words-to-numbers";

export async function handleSeasonEpisodeUpdate(db_data, sourceName, site_links, siteWatchOnlineLinks, torrentLinks, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist = true) {
    let links_seasons = groupSerialLinks(site_links, siteWatchOnlineLinks, torrentLinks);
    let seasonsUpdateFlag = handleLinksSeasonUpdate(db_data.seasons, links_seasons, sourceName);
    let nextEpisodeUpdateFlag = false;

    //omdb api
    if (omdbApiFields) {
        let omdbEpisodes = await get_OMDB_EpisodesData(omdbApiFields.omdbTitle, omdbApiFields.yearIgnored, totalSeasons, db_data.premiered, titleExist);
        if (omdbEpisodes) {
            let result = updateSeasonEpisodeData(db_data.seasons, omdbEpisodes, 'omdb');
            seasonsUpdateFlag = result || seasonsUpdateFlag;
        }
    }

    //tvmaze api
    if (tvmazeApiFields) {
        db_data.nextEpisode = tvmazeApiFields.nextEpisode;
        nextEpisodeUpdateFlag = true;
        let result = updateSeasonEpisodeData(db_data.seasons, tvmazeApiFields.episodes, 'tvmaze');
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

export function handleSiteSeasonEpisodeUpdate(db_data, sourceName, site_links, siteWatchOnlineLinks, siteTorrentLinks) {
    let links_seasons = groupSerialLinks(site_links, siteWatchOnlineLinks, siteTorrentLinks);
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

function updateSeasonEpisodeData(db_seasons, currentEpisodes, apiName) {
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
                if (handleEpisodeDataUpdate(checkEpisode, currentEpisodes[i], apiName)) {
                    updateFlag = true;
                }
            } else {
                //new episode
                checkSeason.episodes.push({
                    episodeNumber: episodeNumber,
                    ...currentEpisodes[i],
                    links: [],
                    watchOnlineLinks: [],
                    torrentLinks: [],
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
                    torrentLinks: [],
                }],
            });
            updateFlag = true;
        }
    }

    return updateFlag;
}

function handleEpisodeDataUpdate(prevEpisode, currentEpisode, apiName) {
    try {
        let episodeUpdated = false;

        const checkFields = ['title', 'duration', 'released', 'releaseStamp', 'imdbRating', 'imdbID'];
        const badValues = ['TBA', 'N/A', 'unknown', '0', '0 min'];

        for (let i = 0; i < checkFields.length; i++) {
            let key = checkFields[i];
            if (!currentEpisode[key] || badValues.includes(currentEpisode[key])) {
                continue;
            }
            if (key === 'title') {
                let currentTitle = currentEpisode[key].toString();
                let prevTitle = prevEpisode[key].toString();
                let t1 = getNormalizedEpisodeTitle(prevTitle);
                let t2 = getNormalizedEpisodeTitle(currentTitle);
                let t3 = prevEpisode[key].replace(/\*/g, '\\*').replace(/\?/g, '\\?');
                let t4 = replaceSpecialCharacters(t3);

                if (!prevTitle || (
                    t1 !== t2 &&
                    !wordsToNumbers(currentTitle).toString().match(/^(Episode|Part) #?\d+(\.\d+)?$/i) &&
                    !currentTitle.match(new RegExp(`chapter .+ \'?${t3}\'?`, 'i')) &&
                    !currentTitle.match(new RegExp(`chapter .+ \'?${t4}\'?`, 'i')) &&
                    !currentTitle.match(new RegExp(`.*trail: \'?${t3}\'?`, 'i'))
                )) {
                    prevEpisode[key] = currentEpisode[key];
                    episodeUpdated = true;
                }
            } else if (key === 'duration') {
                if ((prevEpisode[key] !== currentEpisode[key]) && (!prevEpisode[key] || badValues.includes(prevEpisode[key]) || apiName !== 'omdb')) {
                    prevEpisode[key] = currentEpisode[key];
                    episodeUpdated = true;
                }
            } else if (key === 'released') {
                if ((prevEpisode[key] !== currentEpisode[key]) && (!prevEpisode[key] || badValues.includes(prevEpisode[key]) || apiName !== 'omdb')) {
                    prevEpisode[key] = currentEpisode[key];
                    episodeUpdated = true;
                }
            } else if (prevEpisode[key] !== currentEpisode[key]) {
                prevEpisode[key] = currentEpisode[key];
                episodeUpdated = true;
            }
        }

        return episodeUpdated;
    } catch (error) {
        saveError(error);
        return false;
    }
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
                    let prevTorrentLinks = checkEpisode.torrentLinks;
                    let currentLinks = currentEpisodes[j].links;
                    let currentOnlineLinks = currentEpisodes[j].watchOnlineLinks;
                    let currentTorrentLinks = currentEpisodes[j].torrentLinks;
                    let linkUpdateResult = updateSerialLinks(checkEpisode, prevLinks, prevOnlineLinks, prevTorrentLinks, currentLinks, currentOnlineLinks, currentTorrentLinks);
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
                    watchOnlineLinks: [],
                    torrentLinks: [],
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
    let [_, s, e] = latestData.torrentLinks.split(/[se]/gi).map(item => Number(item));
    let torrentSeason = s || 0;
    let torrentEpisode = e || 0;
    let latestSeason = latestData.season;
    let latestEpisode = latestData.episode;
    if (latestSeason < torrentSeason ||
        (latestSeason === torrentSeason && latestEpisode < torrentEpisode)) {
        latestSeason = torrentSeason;
        latestEpisode = torrentEpisode;
    }

    let totalDuration = 0;
    let episodeCounter = 0;
    for (let i = 0; i < seasons.length; i++) {
        if (seasons[i].seasonNumber <= latestSeason ||
            seasons[i].episodes.find(item => item.links.length > 0 || item.watchOnlineLinks.length > 0 || item.torrentLinks.length > 0)) {
            let episodes = seasons[i].episodes;
            for (let j = 0; j < episodes.length; j++) {
                if (seasons[i].seasonNumber < latestSeason ||
                    episodes[j].episodeNumber <= latestEpisode ||
                    episodes[j].links.length > 0 ||
                    episodes[j].watchOnlineLinks.length > 0 ||
                    episodes[j].torrentLinks.length > 0
                ) {
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

export function getSeasonEpisode(seasons) {
    let res = [];
    for (let i = 0; i < seasons.length; i++) {
        let season = seasons[i].seasonNumber;
        let episodes = seasons[i].episodes.length;
        if (episodes > 0) {
            res.push({
                seasonNumber: season,
                episodes: episodes,
            });
        }
    }
    return res;
}

function getNormalizedEpisodeTitle(title) {
    title = title.toLowerCase()
        .replace(/ \(\d+\)$/, r => ' part ' + r.match(/\d+/)[0])
        .replace(/&quot;/g, '');
    return replaceSpecialCharacters(title)
        .replace(' n ', ' and ')
        .replace('the ', '')
        .replace(' one', ' 1')
        .replace(' two', ' 2')
        .replace(' three', ' 3')
        .replace(' four', ' 4')
        .replace(/pt (?=\d)/, 'part ')
        .replace(/part i+/, r =>
            r.replace('iii', '3')
                .replace('ii', '2')
                .replace('i', '1')
        )
        .replace('part 1', '')
        .replace(/s..t/gi, 'shit')
        .replace(/f..k/gi, 'fuck')
        .replace(/f..ing/gi, 'fucking')
        .replace(/[eaos]/g, '')
        .replace(/the\s/g, '')
        .replace(/\s|́|́/g, '');
}
