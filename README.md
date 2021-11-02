dataConfig = {
    low: {
        title: 1,
        rawTitle: 1,
        year: 1,
        premiered: 1,
        posters: 1,
        type: 1,
        rating: 1,
        like: 1,
    },
    medium: {
        releaseState: 1,
        rank: 1,
        title: 1,
        rawTitle: 1,
        alternateTitles: 1,
        premiered: 1,
        year: 1,
        posters: 1,
        type: 1,
        rating: 1,
        like: 1,
        genres: 1,
        dislike: 1,
        trailers: 1,
        latestData: 1,
        nextEpisode: 1,
        releaseDay: 1,
        status: 1,
        boxOfficeData: 1,
    },
    high: {* all *}
}


[types] => movie | serial | anime_movie | anime_serial join with '-' , like movie-anime_serial
[dataLevel] => low|medium|high
[sortBase] => animeTopComingSoon|animeTopAiring|comingSoon|inTheaters|boxOffice|top|popular
[imdbScores] => range: 0-10 , like 5-9
[malScores] => range: 0-10 , like 5-9
[years] => range: like 2005-2015

/crawler/:password/?mode&sourceNumber&handleDomainChange
//crawler/domainChange/:password

/movies/news/:types/:dataLevel/:imdbScores/:malScores/:page

/movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page

/movies/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page

/movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page

/movies/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page

/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page

/movies/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page
/movies/searchByID/:id/:dataLevel

/movies/staff/searchById/:id
/movies/characters/searchById/:id
