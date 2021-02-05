const {getSeasonEpisode} = require("./utils");
const {get_OMDB_seasonEpisode_info, fixEpisodesZeroDuration} = require("./omdb_api");

export async function handleSeasonEpisodeUpdate(db_data, totalSeasons, site_links, lastSeasonsOnly = true) {
    let links_seasons = getSeasonsFromLinks(site_links);
    let seasonsUpdate = handleSeasonUpdate(links_seasons, db_data.seasons);
    let omdb_result = await get_OMDB_seasonEpisode_info(db_data.title, db_data.rawTitle, totalSeasons, db_data.duration, lastSeasonsOnly);
    let seasons = omdb_result === null ? null : omdb_result.seasons;
    let episodes = omdb_result === null ? null : omdb_result.episodes;
    seasonsUpdate = handleSeasonUpdate(seasons, db_data.seasons) || seasonsUpdate;
    let episodesUpdate = handleEpisodesUpdate(db_data.episodes, episodes, db_data.duration);
    episodesUpdate = handleMissedEpisode(db_data.seasons, db_data.episodes, db_data.duration, lastSeasonsOnly) || episodesUpdate;
    return {
        seasonsUpdate,
        episodesUpdate
    };
}

function handleSeasonUpdate(compareSeasons, omdb_seasons) {
    let seasonsUpdated = false;
    for (let j = 0; j < compareSeasons.length; j++) {
        let seasonExist = false;
        for (let l = 0; l < omdb_seasons.length; l++) {
            if (omdb_seasons[l].season === compareSeasons[j].season) {
                seasonExist = true;
                if (omdb_seasons[l].episodes < compareSeasons[j].episodes) {
                    omdb_seasons[l].episodes = compareSeasons[j].episodes;
                    seasonsUpdated = true;
                }
            }
        }
        if (!seasonExist) {
            omdb_seasons.push(compareSeasons[j]);
            omdb_seasons = omdb_seasons.sort((a, b) => (a.season - b.season));
            seasonsUpdated = true;
        }
    }
    return seasonsUpdated;
}

function handleEpisodesUpdate(db_episodes, omdb_episodes) {
    let episodeUpdated = false;
    for (let i = 0; i < omdb_episodes.length; i++) {
        let episodeExist = false;
        for (let j = 0; j < db_episodes.length; j++) {
            if (omdb_episodes[i].season === db_episodes[j].season &&
                omdb_episodes[i].episode === db_episodes[j].episode) {
                episodeExist = true;
                if (db_episodes[j].title !== omdb_episodes[i].title ||
                    db_episodes[j].duration !== omdb_episodes[i].duration ||
                    db_episodes[j].released !== omdb_episodes[i].released) {
                    episodeUpdated = true;
                }
                db_episodes[j] = omdb_episodes[i];
                break;
            }
        }

        if (!episodeExist) {
            db_episodes.push(omdb_episodes[i]);
            episodeUpdated = true;
            db_episodes = db_episodes.sort((a, b) => {
                return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
            });
        }
    }
    return episodeUpdated;
}

function handleMissedEpisode(db_seasons, db_episodes, db_duration, lastSeasonsOnly = false) {
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
                let episodeInfo = {
                    title: 'unknown',
                    released: 'unknown',
                    duration: '0 min',
                    season: seasonNumber,
                    episode: l,
                    imdbRating: '0',
                    imdbID: ''
                };
                db_episodes.push(episodeInfo);
                missedEpisode = true;
            }
        }
    }
    if (missedEpisode) {
        db_episodes = db_episodes.sort((a, b) => {
            return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
        });
        fixEpisodesZeroDuration(db_episodes, db_duration);
    }
    return missedEpisode;
}

export function getSeasonsFromLinks(site_links) {
    let seasonsArray = [];
    for (let l = 0; l < site_links.length; l++) {
        let {season, episode} = getSeasonEpisode(site_links[l].link);
        let seasonExist = false;
        for (let m = 0; m < seasonsArray.length; m++) {
            let thisSeason = seasonsArray[m];
            if (thisSeason.season === season) {
                seasonExist = true;
                if (thisSeason.episodes < episode) {
                    thisSeason.episodes = episode;
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
