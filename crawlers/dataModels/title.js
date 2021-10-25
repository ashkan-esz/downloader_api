const {getLatestData} = require("../latestData");

export function getTitleModel(titleObj, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles) {
    let {season, episode, quality, hardSub, dubbed, sub} = getLatestData(siteDownloadLinks, subtitles, type);
    type = (!type.includes('anime') && titleObj.jikanFound) ? 'anime_' + type : type;
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
            url: page_link,
            links: siteDownloadLinks //[{link,info,qualitySample}]
        }],
        like: 0,
        dislike: 0,
        view: 0,
        like_month: 0,
        view_month: 0,
        insert_date: new Date(),
        update_date: 0,
        apiUpdateDate: new Date(),
        castUpdateDate: 0,
        seasons: [],
        episodes: [],
        posters: [poster],
        poster_s3: '',
        trailer_s3: '',
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
        jikanID: 0,
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
