import {getSeasonEpisode} from "../crawlers/utils.js";

export function getWatchOnlineLinksModel(link, info, movieType, sourceName, page_link) {
    let season = 0, episode = 0;
    if (movieType.includes('serial')) {
        ({season, episode} = getSeasonEpisode(link));
    }
    return {
        link: link.trim(),
        info: info,
        sourceName: sourceName,
        pageLink: page_link,
        season: season,
        episode: episode,
    };
}
