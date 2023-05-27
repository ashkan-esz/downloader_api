import {getSeasonEpisode} from "../crawlers/utils/utils.js";

export function getWatchOnlineLinksModel(link, info, movieType, sourceName) {
    let season = 0, episode = 0;
    if (movieType.includes('serial')) {
        ({season, episode} = getSeasonEpisode(link));
    }
    return {
        link: link.trim(),
        info: info,
        sourceName: sourceName,
        season: season,
        episode: episode,
    };
}
