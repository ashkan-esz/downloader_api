dataConfig = {
    low: {
        title: 1,
        premiered: 1,
        posters: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        like: 1,
    },
    medium: {
        title: 1,
        premiered: 1,
        posters: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        like: 1,
        genres: 1,
        dislike: 1,
        trailers: 1,
        latestData: 1,
        nextEpisode: 1,
    },
    high: {* all *}
}


[types] => []: movie | serial | anime_movie | anime_serial
[dataLevel] => low|medium|high

//crawler/:password/?mode&sourceNumber&handleDomainChange
//crawler/domainChange/:password

//movies/news/:types/:dataLevel/:imdbScores/:malScores/:page

//movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page

//movies/tops/byLikes/:types/:dataLevel/:imdbScores/:malScores/:page

//movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page

//seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page

//movies/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page
//movies/searchByID/:id/:dataLevel
