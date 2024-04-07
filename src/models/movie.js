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
            like: -1,
            like_month: -1,
            view_month: -1,
            follow_month: -1,
        },
        title: titleObj.title,
        type: type,
        rawTitle: titleObj.rawTitle,
        alternateTitles: titleObj.alternateTitles,
        titleSynonyms: titleObj.titleSynonyms,
        qualities: [],
        seasons: [],
        sources: sourceName ? [{sourceName: sourceName, pageLink: page_link}] : [],
        seasonEpisode: [],
        view: 0,
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
            thumbnail: "",
            blurHash: "",
        }].filter(item => item.url),
        poster_s3: null, // {url,originalUrl,originalSize,size,vpnStatus,thumbnail,blurHash}
        poster_wide_s3: null, // {url,originalUrl,originalSize,size,vpnStatus,thumbnail,blurHash}
        trailer_s3: null, // {url,originalUrl,size,vpnStatus}
        summary: {
            persian: persianSummary,
            persian_source: sourceName,
            english: '',
            english_source: '',
        },
        trailers: trailers, // [{'url,info,vpnStatus'}]
        trailerDate: trailers.length > 0 ? Date.now() : 0,
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
        apiIds: {
            imdbID: "",
            tvmazeID: 0,
            jikanID: titleObj.jikanID || 0,
            kitsuID: 0,
            amvID: 0,
            gogoID: "",
        },
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
        awards: "",
        //jikan api data
        animeType: '',
        animeSource: '',
        animeSeason: '',
    };
}

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
        poster_wide_s3: 1,
    }),
    telbot: Object.freeze({
        rawTitle: 1,
        type: 1,
        year: 1,
        premiered: 1,
        posters: 1,
        poster_s3: 1,
        poster_wide_s3: 1,
        genres: 1,
        summary: 1,
        rating: 1,
        rated: 1,
        country: 1,
        latestData: 1,
        duration: 1,
        releaseDay: 1,
        seasonEpisode: 1,
        insert_date: 1,
        update_date: 1,
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
        poster_wide_s3: 1,
        alternateTitles: 1,
        rating: 1,
        summary: 1,
        genres: 1,
        trailers: 1,
        trailerDate: 1,
        latestData: 1,
        insert_date: 1,
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
