const {get_OMDB_seasonEpisode_info, fixEpisodesZeroDuration} = require("./3rdPartyApi/omdbApi");
const {getSeasonEpisode} = require("./utils");
const {getEpisodeModel} = require("./models/episode");

export async function handleSeasonEpisodeUpdate(db_data, site_links, totalSeasons, omdbApiFields, tvmazeApiFields, titleExist = true) {
    let links_seasons = getSeasonsFromLinks(site_links);
    let seasonsUpdate = handleSeasonUpdate(db_data.seasons, links_seasons);
    let episodesUpdate = false;
    let nextEpisodeUpdate = false;

    //omdb api
    if (omdbApiFields) {
        let omdb_result = await get_OMDB_seasonEpisode_info(omdbApiFields.omdbTitle, totalSeasons, db_data.type, db_data.duration, titleExist);
        if (omdb_result) {
            seasonsUpdate = handleSeasonUpdate(db_data.seasons, omdb_result.seasons) || seasonsUpdate;
            episodesUpdate = handleEpisodesUpdate(db_data.episodes, omdb_result.episodes, db_data.duration, db_data.type);
        }
    }

    //tvmaze api
    if (tvmazeApiFields) {
        db_data.nextEpisode = tvmazeApiFields.nextEpisode;
        nextEpisodeUpdate = true;
        let tvmaze_seasons = getSeasonsFromTvMazeApi(tvmazeApiFields.episodes);
        seasonsUpdate = handleSeasonUpdate(db_data.seasons, tvmaze_seasons) || seasonsUpdate;
        episodesUpdate = handleEpisodesUpdate(db_data.episodes, tvmazeApiFields.episodes, db_data.duration, db_data.type) || episodesUpdate;
    }

    episodesUpdate = handleMissedEpisode(db_data.seasons, db_data.episodes, db_data.duration, db_data.type, titleExist) || episodesUpdate;

    return {
        seasonsUpdate,
        episodesUpdate,
        nextEpisodeUpdate,
    };
}

export function handleSiteSeasonEpisodeUpdate(db_data, site_links, titleExist) {
    let links_seasons = getSeasonsFromLinks(site_links);
    let seasonsUpdate = handleSeasonUpdate(db_data.seasons, links_seasons);
    let episodesUpdate = handleMissedEpisode(db_data.seasons, db_data.episodes, db_data.duration, db_data.type, titleExist);
    return {
        seasonsUpdate,
        episodesUpdate,
    };
}

function handleSeasonUpdate(db_seasons, compareSeasons) {
    let seasonsUpdated = false;
    for (let j = 0; j < compareSeasons.length; j++) {
        let seasonExist = false;
        for (let l = 0; l < db_seasons.length; l++) {
            if (db_seasons[l].season === compareSeasons[j].season) {
                seasonExist = true;
                if (db_seasons[l].episodes < compareSeasons[j].episodes) {
                    db_seasons[l].episodes = compareSeasons[j].episodes;
                    seasonsUpdated = true;
                }
            }
        }
        if (!seasonExist) {
            db_seasons.push(compareSeasons[j]);
            db_seasons = db_seasons.sort((a, b) => (a.season - b.season));
            seasonsUpdated = true;
        }
    }
    return seasonsUpdated;
}

function handleEpisodesUpdate(db_episodes, compareEpisodes, db_duration, type) {
    let episodeUpdated = false;
    for (let i = 0; i < compareEpisodes.length; i++) {
        let episodeExist = false;
        for (let j = 0; j < db_episodes.length; j++) {
            if (compareEpisodes[i].season === db_episodes[j].season &&
                compareEpisodes[i].episode === db_episodes[j].episode) {
                episodeExist = true;

                if (db_episodes[j].title !== compareEpisodes[i].title && compareEpisodes[i].title) {
                    db_episodes[j].title = compareEpisodes[i].title;
                    episodeUpdated = true;
                }
                if (db_episodes[j].duration === '0 min' && compareEpisodes[i].duration !== '0 min') {
                    db_episodes[j].duration = compareEpisodes[i].duration;
                    episodeUpdated = true;
                }
                if (db_episodes[j].released !== compareEpisodes[i].released && compareEpisodes[i].released) {
                    db_episodes[j].released = compareEpisodes[i].released;
                    episodeUpdated = true;
                }
                if (db_episodes[j].releaseStamp !== compareEpisodes[i].releaseStamp && compareEpisodes[i].releaseStamp) {
                    db_episodes[j].releaseStamp = compareEpisodes[i].releaseStamp;
                    episodeUpdated = true;
                }
                if (db_episodes[j].imdbRating !== compareEpisodes[i].imdbRating && compareEpisodes[i].imdbRating) {
                    db_episodes[j].imdbRating = compareEpisodes[i].imdbRating;
                    episodeUpdated = true;
                }
                if (db_episodes[j].imdbID !== compareEpisodes[i].imdbID && compareEpisodes[i].imdbID) {
                    db_episodes[j].imdbID = compareEpisodes[i].imdbID;
                    episodeUpdated = true;
                }
                if (episodeUpdated) {
                    break;
                }
            }
        }

        if (!episodeExist) {
            db_episodes.push(compareEpisodes[i]);
            episodeUpdated = true;
            db_episodes = db_episodes.sort((a, b) => {
                return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
            });
        }
    }
    if (episodeUpdated) {
        fixEpisodesZeroDuration(db_episodes, db_duration, type);
    }
    return episodeUpdated;
}

function handleMissedEpisode(db_seasons, db_episodes, db_duration, type, lastSeasonsOnly = false) {
    let missedEpisode = false;
    let startSeasonNumber = (lastSeasonsOnly && db_seasons.length > 2) ? db_seasons.length - 2 : 0;
    for (let j = startSeasonNumber; j < db_seasons.length; j++) {
        let seasonNumber = db_seasons[j].season;
        let episodesCount = db_seasons[j].episodes;
        for (let l = 1; l <= episodesCount; l++) {
            let episodeExist = false;
            for (let m = 0; m < db_episodes.length; m++) {
                if (db_episodes[m].season === seasonNumber && db_episodes[m].episode === l) {
                    episodeExist = true;
                    break;
                }
            }
            if (!episodeExist) {
                let episodeModel = getEpisodeModel(
                    'unknown',
                    'unknown',
                    '',
                    '0 min',
                    seasonNumber,
                    l,
                    '0',
                    ''
                );
                db_episodes.push(episodeModel);
                missedEpisode = true;
            }
        }
    }
    if (missedEpisode) {
        db_episodes = db_episodes.sort((a, b) => {
            return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
        });
        fixEpisodesZeroDuration(db_episodes, db_duration, type);
    }
    return missedEpisode;
}

function getSeasonsFromLinks(site_links) {
    let seasonsArray = [];
    for (let l = 0; l < site_links.length; l++) {
        let {season, episode} = getSeasonEpisode(site_links[l].link);
        if (season === 0) {
            ({season, episode} = getSeasonEpisode(site_links[l].info));
        }
        let seasonExist = false;
        for (let m = 0; m < seasonsArray.length; m++) {
            if (seasonsArray[m].season === season) {
                seasonExist = true;
                if (seasonsArray[m].episodes < episode) {
                    seasonsArray[m].episodes = episode;
                }
            }
        }
        if (!seasonExist) {
            seasonsArray.push({
                season: season,
                episodes: episode
            });
        }
    }
    return seasonsArray;
}

function getSeasonsFromTvMazeApi(episodes) {
    let seasonsArray = [];
    for (let l = 0; l < episodes.length; l++) {
        let {season, episode} = episodes[l];
        let seasonExist = false;
        for (let m = 0; m < seasonsArray.length; m++) {
            if (seasonsArray[m].season === season) {
                seasonExist = true;
                if (seasonsArray[m].episodes < episode) {
                    seasonsArray[m].episodes = episode;
                }
            }
        }
        if (!seasonExist) {
            seasonsArray.push({
                season: season,
                episodes: episode
            });
        }
    }
    return seasonsArray;
}

export function getTotalDuration(episodes, latestData) {
    let totalDuration = 0;
    for (let i = 0; i < episodes.length; i++) {
        if (episodes[i].season < latestData.season ||
            (episodes[i].season === latestData.season &&
                episodes[i].episode <= latestData.episode)) {
            totalDuration += Number(episodes[i].duration.replace('min', ''));
        }
    }
    let hours = Math.floor(totalDuration / 60);
    let minutes = totalDuration % 60;
    totalDuration = hours + ':' + minutes;
    return totalDuration;
}

export function getEndYear(episodes, status, year) {
    if (status === 'ended') {
        if (episodes.length > 0) {
            let lastEpisode = episodes[episodes.length - 1];
            return lastEpisode.released.split('-')[0];
        } else {
            return year;
        }
    } else {
        // running
        return '';
    }
}
