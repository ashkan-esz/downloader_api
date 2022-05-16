import {getDecodedLink, getSeasonEpisode} from "../crawlers/utils.js";

export function getSubtitleModel(link, info, movieType, sourceName, page_link, direct = true) {
    let season = 0, episode = 0;
    if (movieType.includes('serial')) {
        ({season, episode} = getSeasonEpisode(link));
        if (season !== 0 && episode === 0) {
            let temp = 'AllEpisodesOf(Season ' + season + ')';
            info = info ? (info + '.' + temp) : temp;
        }
        let decodedLink = getDecodedLink(link).replace(/\s+-\s+/g, '-');
        let multiEpisodeMatch = decodedLink.match(/(?<=[._\-\s])(s\d\d?)?(E?)\d{1,4}(([._\-])?(E?)\d{1,4})+(?=[._\-\s])/gi);
        if (multiEpisodeMatch) {
            let temp = multiEpisodeMatch.pop().replace(/(s\d\d?)|(^e)/i, '').split(/[e._\-]/gi).filter(item => item);
            let number1 = Number(temp[0]);
            let number2 = Number(temp.pop());
            if (number1 !== number2 && number1 < 2000) {
                if (season === 1 && episode === 0 && number1 === 0 && number2 !== 0) {
                    episode = number2;
                    info = '';
                } else {
                    let text = `Episode(${number1}-${number2})`;
                    info = info ? (info + '.' + temp) : text;
                }
            } else if (season === 1 && episode === 0 && number1 === number2 && number1 !== 0) {
                episode = number2;
                info = '';
            }
        }
    }
    return {
        link: link.trim(),
        info: info,
        sourceName: sourceName,
        pageLink: page_link,
        season: season,
        episode: episode,
        direct: direct,
    };
}
