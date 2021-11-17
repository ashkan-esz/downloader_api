import {getLatestData} from "../crawlers/latestData";

export function getMovieModel(titleObj, page_link, type, siteDownloadLinks, sourceName, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles) {
    let {season, episode, quality, hardSub, dubbed, sub} = getLatestData(siteDownloadLinks, subtitles, type);

    return {
        releaseState: 'done',
        rank: {
            animeTopComingSoon: -1,
            animeTopAiring: -1,
            comingSoon: -1,
            inTheaters: -1,
            boxOffice: -1,
            top: -1,
            popular: -1,
        },
        title: titleObj.title,
        type: type,
        rawTitle: titleObj.rawTitle,
        alternateTitles: titleObj.alternateTitles,
        titleSynonyms: titleObj.titleSynonyms,
        sources: [{
            sourceName: sourceName,
            url: page_link,
            links: siteDownloadLinks //[{link,info,qualitySample}]
        }].filter(item => item.url !== ''),
        like: 0,
        dislike: 0,
        view: 0,
        like_month: 0,
        view_month: 0,
        add_date: new Date(),
        insert_date: new Date(),
        update_date: 0,
        apiUpdateDate: new Date(),
        castUpdateDate: 0,
        seasons: [],
        episodes: [],
        posters: [{
            link: poster,
            info: sourceName,
            size: 0,
        }].filter(item => item.link),
        poster_s3: null, // {url,originalUrl,size}
        trailer_s3: null, // {url,originalUrl,size}
        summary: {
            persian: persianSummary,
            english: '',
        },
        trailers: trailers.length > 0 ? trailers : null, // [{'link,info'}]
        watchOnlineLinks: watchOnlineLinks,
        subtitles: [],
        latestData: {
            season: type.includes('movie') ? 0 : season,
            episode: type.includes('movie') ? 0 : episode,
            quality: quality,
            hardSub: hardSub,
            dubbed: dubbed,
            subtitle: sub,
        },
        status: type.includes('movie') ? 'ended' : 'unknown',
        releaseDay: "",
        year: year,
        premiered: year,
        endYear: year,
        officialSite: "",
        webChannel: "",
        nextEpisode: null,
        duration: "0 min",
        totalDuration: '',
        //3rd party api data
        imdbID: "",
        tvmazeID: 0,
        jikanID: titleObj.jikanID || 0,
        totalSeasons: 0,
        boxOffice: "",
        boxOfficeData: {
            weekend: '',
            gross: '',
            weeks: 0,
        },
        rated: "",
        movieLang: "",
        country: "",
        genres: [],
        rating: {
            imdb: 0,
            rottenTomatoes: 0,
            metacritic: 0,
            myAnimeList: 0
        },
        staffAndCharactersData: [],
        actors: [],
        directors: [],
        writers: [],
        awards: "",
        //jikan api data
        animeType: '',
        animeSource: '',
        relatedTitles: [],
    };
}

export const dataLevelConfig = {
    low: {
        title: 1,
        year: 1,
        premiered: 1,
        posters: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        like: 1,
    },
    medium: {
        releaseState: 1,
        rank: 1,
        title: 1,
        rawTitle: 1,
        type: 1,
        year: 1,
        premiered: 1,
        posters: 1,
        alternateTitles: 1,
        rating: 1,
        summary: 1,
        like: 1,
        genres: 1,
        dislike: 1,
        trailers: 1,
        latestData: 1,
        update_date: 1,
        nextEpisode: 1,
        releaseDay: 1,
        status: 1,
        boxOfficeData: 1,
    },
    high: {}
}
