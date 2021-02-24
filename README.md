dataConfig = {
    low: {
        title: 1,
        premiered: 1,
        poster: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        like: 1,
    },
    medium: {
        title: 1,
        premiered: 1,
        poster: 1,
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

extraInfo = {
    onlineStreamingSources: ['film2movie', 'salamdl', 'film2media'],
    highQualityPoster: ['salamdl', 'valamovie', 'film2media'],
    lowQualityPoster: ['digimovies', 'topmovie', 'film2movies'],
}


[types] => movie / serial
[dataLevel] => low/medium/high
if page = 0 then return based on count value

//start/crawling/:password/:mode?

//search/searchAll/:title/:dataLevel/:page/:count?
//search/searchSingleType/:type/:title/:dataLevel/:page/:count?
//search/searchByID/:type/:id/:dataLevel

//news/getAll/:dataLevel/:page/:count?
//news/getSingleType/:type/:dataLevel/:page/:count?

//updates/getAll/:dataLevel/:page/:count?
//updates/getSingleType/:type/:dataLevel/:page:/:count?

//tops/byLikes/getAll/:dataLevel/:page/:count?
//tops/byLikes/getSingleType/:type/:dataLevel/:page/:count?
//tops/popularShows/:dataLevel/:page/:count?

//trailers/getAll/:page/:count?
//trailers/getSingleType/:type/:page/:count?

//timeLine/today/:page/:count?
//timeLine/week/:weekCounter
