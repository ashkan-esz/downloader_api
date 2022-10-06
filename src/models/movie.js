import {getLatestData} from "../crawlers/latestData.js";
import {groupSubtitles} from "../crawlers/subtitle.js";

export function getMovieModel(titleObj, page_link, type, siteDownloadLinks, sourceName, year, poster, persianSummary, trailers, watchOnlineLinks, subtitles, sourceVpnStatus) {
    let latestData = getLatestData(siteDownloadLinks, watchOnlineLinks, subtitles, type);

    return {
        releaseState: 'done',
        rank: {
            animeTopComingSoon: -1,
            animeTopAiring: -1,
            animeSeasonNow: -1,
            animeSeasonUpcoming: -1,
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
        qualities: [],
        seasons: [],
        sources: sourceName ? [sourceName] : [],
        seasonEpisode: [],
        userStats: userStats,
        view: 0,
        like_month: 0,
        view_month: 0,
        add_date: new Date(),
        insert_date: new Date(),
        update_date: 0,
        apiUpdateDate: new Date(),
        castUpdateDate: 0,
        posters: [{
            url: poster,
            info: sourceName,
            size: 0,
            vpnStatus: sourceVpnStatus.poster,
        }].filter(item => item.url),
        poster_s3: null, // {url,originalUrl,size,vpnStatus}
        trailer_s3: null, // {url,originalUrl,size,vpnStatus}
        summary: {
            persian: persianSummary.replace(/([.…])+$/, ''),
            persian_source: sourceName,
            english: '',
            english_source: '',
        },
        trailers: trailers.length > 0 ? trailers : null, // [{'url,info,vpnStatus'}]
        subtitles: groupSubtitles(subtitles),
        latestData: latestData, //season, episode, quality, updateReason, hardSub, dubbed, censored, subtitle, watchOnlineLink
        status: type.includes('movie') ? 'ended' : 'unknown',
        releaseDay: "",
        year: year.toString(),
        premiered: year.toString(),
        endYear: year.toString(),
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
        actorsAndCharacters: [],
        staff: {
            directors: [],
            writers: [],
            others: [],
        },
        awards: "",
        //jikan api data
        animeType: '',
        animeSource: '',
        animeSeason: '',
        relatedTitles: [],
    };
}

export const userStats = Object.freeze({
    like_movie_count: 0,
    dislike_movie_count: 0,
    //follow
    follow_movie_count: 0,
    //others
    save_count: 0,
    future_list_count: 0,
    dropped_count: 0,
    finished_count: 0,
    score_count: 0,
});

export const userStats_projection = Object.freeze({
    low: Object.freeze({
        like_movie: 1,
        like_movie_count: 1,
        dislike_movie: 1,
        dislike_movie_count: 1,
        //save
        save: 1,
        save_count: 1,
        //future list
        future_list: 1,
        future_list_count: 1,
    }),
    medium: Object.freeze({
        like_movie: 1,
        like_movie_count: 1,
        dislike_movie: 1,
        dislike_movie_count: 1,
        //save
        save: 1,
        save_count: 1,
        //future list
        future_list: 1,
        future_list_count: 1,
    }),
    high: Object.freeze({
        like_movie: 1,
        like_movie_count: 1,
        dislike_movie: 1,
        dislike_movie_count: 1,
        //save
        save: 1,
        save_count: 1,
        //future list
        future_list: 1,
        future_list_count: 1,
        //--- high only fields
        //follow
        follow_movie: 1,
        follow_movie_count: 1,
        //others
        dropped: 1,
        dropped_count: 1,
        finished: 1,
        finished_count: 1,
        score: 1,
        score_count: 1,
    })
});

export const dataLevelConfig = Object.freeze({
    dlink: Object.freeze({
        rawTitle: 1,
        type: 1,
        year: 1,
        posters: 1,
        qualities: 1,
        seasons: 1,
        subtitles: 1,
        sources: 1,
    }),
    low: Object.freeze({
        title: 1,
        year: 1,
        premiered: 1,
        posters: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        latestData: 1,
        userStats: userStats_projection.low,
    }),
    telbot: Object.freeze({
        rawTitle: 1,
        type: 1,
        year: 1,
        premiered: 1,
        posters: 1,
        genres: 1,
        summary: 1,
        rating: 1,
        rated: 1,
        country: 1,
        latestData: 1,
        duration: 1,
        releaseDay: 1,
        actorsAndCharacters: 1,
        staff: 1,
        seasonEpisode: 1,
    }),
    medium: Object.freeze({
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
        userStats: userStats_projection.medium,
        genres: 1,
        trailers: 1,
        latestData: 1,
        update_date: 1,
        nextEpisode: 1,
        releaseDay: 1,
        status: 1,
        boxOfficeData: 1,
    }),
    info: Object.freeze({
        seasons: 0,
        qualities: 0,
        subtitles: 0,
    }),
    high: Object.freeze({})
});
