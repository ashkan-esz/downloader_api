const {getLatestData} = require("../latestData");

export function getTitleModel(title, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers) {
    let {season, episode, quality, hardSub, dubbed} = getLatestData(siteDownloadLinks, type);
    return {
        title: title,
        type: type,
        sources: [{
            url: page_link,
            links: siteDownloadLinks //[{link,info}]
        }],
        like: 0,
        dislike: 0,
        insert_date: new Date(),
        update_date: 0,
        seasons: [],
        episodes: [],
        posters: [poster],
        summary: {
            persian: persianSummary,
            english: '',
        },
        trailers: trailers.length > 0 ? trailers : null, // [{'link,info'}]
        latestData: {
            season: type === 'movie' ? 0 : season,
            episode: type === 'movie' ? 0 : episode,
            quality: quality,
            hardSub: hardSub,
            dubbed: dubbed
        },
        tvmazeID: 0,
        isAnimation: false,
        status: 'ended',
        releaseDay: "",
        year: year,
        premiered: year,
        officialSite: "",
        nextEpisode: null,
        totalDuration: '',
        //3rd party api data
        totalSeasons: "",
        boxOffice: "",
        rawTitle: "",
        imdbID: "",
        rated: "",
        movieLang: "",
        country: "",
        genres: [],
        rating: [], //[{Value,Source}]
        duration: "",
        director: "",
        writer: "",
        cast: [],
        awards: "",
    };
}
