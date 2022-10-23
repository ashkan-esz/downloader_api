## Profile

```javascript
profile = {
    _id: Object, //act as userId
    username: String,
    publicName: String, //other users see this in general
    email: String,
    emailVerified: Boolean,
    bio: String,
    profileImages: Array({
        url: String,
        size: Int,
        thumbnail: String,
        addDate: Date,
    }),
    defaultProfile: String,
    favoriteGenres: Array(String),
    computed: {
        favoriteGenres: Array({
            genre: String,
            count: Int,
            percent: Double,
        }),
        lastUpdate: Date,
    },
    movieSettings: {
        includeAnime: Boolean, //default: true
        includeHentai: Boolean, //default: false
    },
    downloadLinksSettings: {
        includeDubbed: Boolean, //default: true
        includeHardSub: Boolean, //default: true
        includeCensored: Boolean, //default: true
        preferredQualities: Array(String), //enum('480p', '720p', '1080p', '2160p')
    },
    notificationSettings: {
        followMovie: Boolean, //default: true
        followMovie_betterQuality: Boolean, //default: true
        followMovie_subtitle: Boolean, //default: true
        futureList: Boolean, //default: true
        futureList_serialSeasonEnd: Boolean, //default: true
        futureList_subtitle: Boolean, //default: true
        finishedList_spinOffSequel: Boolean, //default: true  
    },
    friends: Array,
    registrationDate: Date,
    role: String, // enum('test-user', 'user', 'dev', 'admin')
    thisDevice: #Session, //see below
}
```

## Tokens

```javascript
getTokenResult = {
    accessToken: String,
    accessToken_expire: Int,
    username: String,
    profileImages: Array(String),
}
```

## Session

```javascript
session = {
    appName: String,
    appVersion: String,
    deviceOs: String,
    deviceModel: String,
    ipLocation: String,
    deviceId: String, //uniqe
    loginDate: Date,
    lastUseDate: Date,
}
```

## Device Info

```javascript
deviceInfo = {
    appName: String,
    appVersion: String,
    os: String,
    deviceModel: String,
}
```

## Movie Data

```javascript
dataLevel = {
    dlink: {
        _id: Object,
        rawTitle: String,
        type: String,
        year: String,
        posters: Array(#POSTER),
        qualities: Array(#QUALITY),
        seasons: Array(#SEASON),
        subtitles: Array(#SUBTITLE),
        sources: Array(String),
    },
    low: {
        _id: Object,
        title: String,
        rawTitle: String,
        year: String,
        premiered: String,
        posters: Array(#POSTER),
        type: String, // enum('movie', 'serial', 'anime_movie', 'anime_serial')
        rating: {
            imdb: Int,
            rottenTomatoes: Int,
            metacritic: Int,
            myAnimeList: Int
        },
        latestData: #LatestData,
        userStats: #userStats,
    },
    telbot: {
        _id: Object,
        rawTitle: String,
        type: String, // enum('movie', 'serial', 'anime_movie', 'anime_serial')
        year: String,
        premiered: String,
        posters: Array(#POSTER),
        genres: Array(String),
        summary: {
            english: String,
            english_source: String,
            persian: String,
            persian_source: String,
        },
        rating: {
            imdb: Int,
            rottenTomatoes: Int,
            metacritic: Int,
            myAnimeList: Int
        },
        rated: String,
        country: String,
        latestData: #LatestData,
        duration: String, // example '60 min'
        releaseDay: String, // days of week
        actorsAndCharacters: Array(#actor_and_character),
        staff: {
            directors: Array(#actor_and_character),
            writers: Array(#actor_and_character),
            others: Array(#actor_and_character),
        },
        seasonEpisode: Array({
            seasonNumber: Int,
            episodes: Int,
        }),
    },
    medium: {
        ...low, //all fields from low datalevel also exist
        releaseState: String, // enum('inTheaters', 'comingSoon', 'waiting', 'done')
        rank: {
            animeTopComingSoon: Int,
            animeTopAiring: Int,
            animeSeasonNow: Int,
            animeSeasonUpcoming: Int,
            comingSoon: Int,
            inTheaters: Int,
            boxOffice: Int,
            top: Int,
            popular: Int,
        },
        alternateTitles: Array(String),
        summary: {
            english: String,
            english_source: String,
            persian: String,
            persian_source: String,
        },
        genres: Array(String),
        genresWithImage: Array({ //only exist in movies/searchById api
            genre: String,
            poster: #POSTER,
            count: Int,
        }),
        trailers: Array({
            url: String,
            info: String,
            vpnStatus: String, //enum('vpnOnly', 'noVpn', 'allOK')
        }),
        update_date: Date,
        nextEpisode: null || {
            title: String,
            season: Int,
            episode: Int,
            releaseStamp: String,
            summary: String
        },
        releaseDay: String, // days of week
        status: String, // enum('running','ended','unknown')
        boxOfficeData: {
            weekend: String,
            gross: String,
            weeks: Int,
        },
        userStats: #userStats,
    },
    high: {
        ...low,
        ...medium,
        titleSynonyms: Array(String),
        // for movie titles check qualities and check seasons for series titles
        qualities: Array(#QUALITY),
        seasons: Array(#SEASON),
        subtitles: Array(#SUBTITLE),
        sources: Array(String),
        seasonEpisode: Array({
            seasonNumber: Int,
            episodes: Int,
        }),
        view: Int,
        like_month: Int,
        view_month: Int,
        add_date: Date,
        insert_date: Date,
        apiUpdateDate: Date,
        castUpdateDate: Date,
        poster_s3: null || {
            url: String,
            originalUrl: String,
            originalSize: Int,
            size: Int,
            vpnStatus: String, //enum('vpnOnly', 'noVpn', 'allOK')
            thumbnail: String,
        },
        trailer_s3: null || {
            url: String,
            originalUrl: String,
            size: Int,
            vpnStatus: String, //enum('vpnOnly', 'noVpn', 'allOK'),
        },
        endYear: String,
        officialSite: String,
        webChannel: String,
        duration: String, // example '60 min'
        totalDuration: String, // in format hh:mm example: 14:11 === 14 hours and 11 min
        imdbID: String,
        tvmazeID: Int,
        jikanID: Int,
        totalSeasons: Int,
        boxOffice: String,
        rated: String,
        movieLang: String,
        country: String,
        actorsAndCharacters: Array(#actor_and_character),
        staff: {
            directors: Array(#actor_and_character),
            writers: Array(#actor_and_character),
            others: Array(#actor_and_character),
        },
        awards: String,
        animeType: String,
        animeSource: String,
        animeSeason: String,
        relatedTitles: Array({
            _id: '' || Object,
            jikanID: Int,
            title: String,
            rawTitle: String,
            relation: String, //enum('Prequel', 'Sequel', 'Side Story', 'Parent Story', 'Spin-off')
        }),
        userStats: #userStats,
    },
    info: {
        // all data exist in high execpt 'seasons' and 'qualities' and 'subtitles'
    },
}
```

## Season

```javascript
#SEASON = {
    seasonNumber: Int,
    episodes: Array({
        episodeNumber: Int,
        title: String,
        released: String,
        releaseStamp: String,
        duration: String,
        imdbRating: String,
        imdbID: String,
        links: Array({
            link: String,
            info: String,
            qualitySample: String,
            sourceName: String,
            pageLink: String,
            season: Int,
            episode: Int,
        }),
        watchOnlineLinks: Array({
            link: String,
            info: String,
            sourceName: String,
            pageLink: String,
            season: Int,
            episode: Int,
        }),
    })
}
```

## Quality

```javascript
#QUALITY = {
    quality: String,
    links: Array({
        link: String,
        info: String,
        qualitySample: String,
        sourceName: String,
        pageLink: String,
        season: Int,
        episode: Int,
    }),
    watchOnlineLinks: Array({
        link: String,
        info: String,
        sourceName: String,
        pageLink: String,
        season: Int,
        episode: Int,
    }),
}
```

## Subtitle

```javascript
#SUBTITLE = {
    seasonNumber: Int,
    links: Array({
        link: String,
        info: String, //Episodes(\d\d-\d\d) or AllEpisodesOf(Season \d\d)
        sourceName: String,
        pageLink: String,
        season: Int,
        episode: Int,
        direct: Boolean,
    })
}
```

## Poster

```javascript
#POSTER = {
    url: String,
    info: String,
    size: Int,
    vpnStatus: String, //enum('vpnOnly', 'noVpn', 'allOK')
    thumbnail: String,
}
```

## LatestData

```javascript
#LatestData = {
    season: Int,
    episode: Int,
    quality: String,
    updateReason: String, //season|episode|quality
    hardSub: String, //String in format S\d+E\d+
    dubbed: String, //for series 's1e5' shows last episode with hardsub/dubbed/..
    subtitle: String, //for movies 's1e1' means hardsub/dubbed/.. exist
    censored: String,
    watchOnlineLink: String,
}
```

## Actor_And_Character

```javascript
#actor_and_Character = {
    //staff data
    id: Object,
    name: String,
    gender: String, //enum('Male', 'Female')
    country: String,
    image: String,
    thumbnail: String,
    positions: Array(String),
    characterData: null || {
        id: Object,
        name: String,
        gender: String, //enum('Male', 'Female')
        image: String,
        thumbnail: String,
        role: String,
    }
}
```

## User Stats

```javascript
#userStats = {
    //-- movies only
    //like,dislike
    like_movie: Boolean,
    like_movie_count: Int,
    dislike_movie: Boolean,
    dislike_movie_count: Int,
    //others
    save: Boolean,
    save_count: Int,
    future_list: Boolean,
    future_list_count: Int,
    //below field includes only when (dataLevel == high)
    follow_movie: Boolean,
    follow_movie_count: Int,
    dropped: Boolean,
    dropped_count: Int,
    finished: Boolean,
    finished_count: Int,
    score: Double,
    score_count: Int,
}

#userStats_staff = {
    //like,dislike
    like_staff: Boolean,
    like_staff_count: Int,
    dislike_staff: Boolean,
    dislike_staff_count: Int,
    //follow
    follow_staff: Boolean,
    follow_staff_count: Int,
}

#userStats_character = {
    //like,dislike
    like_character: Boolean,
    like_character_count: Int,
    dislike_character: Boolean,
    dislike_character_count: Int,
}
```

## Staff Data

```javascript
staffData = {
    name: String,
    rawName: String,
    gender: String, // enum('', 'male', 'female', 'sexless')
    about: String,
    tvmazePersonID: Int,
    jikanPersonID: Int,
    country: String,
    birthday: String,
    deathday: String,
    age: Int,
    height: String,
    weight: String,
    hairColor: String,
    eyeColor: String,
    imageData: null || {
        url: String,
        originalUrl: String,
        originalSize: String,
        size: Int,
        vpnStatus: String, //enum('vpnOnly', 'noVpn', 'allOK')
        thumbnail: String,
    },
    originalImages: Array(String),
    credits: Array({
        movieID: String,
        movieName: String,
        movieType: String,
        moviePoster: String,
        movieThumbnail: String,
        positions: Array(String),
        characterID: String,
        characterName: String,
        characterRole: String,
        characterImage: String,
        characterThumbnail: String,
    }),
    insert_date: Date,
    update_date: Date,
    userStats: #userStats_staff,
}
```

## Character Data

```javascript
characterData = {
    name: String,
    rawName: String,
    gender: String, // enum('', 'male', 'female', 'sexless')
    about: String,
    tvmazePersonID: Int,
    jikanPersonID: Int,
    country: String,
    birthday: String,
    deathday: String,
    age: Int,
    height: String,
    weight: String,
    hairColor: String,
    eyeColor: String,
    imageData: null || {
        url: String,
        originalUrl: String,
        originalSize: String,
        size: Int,
        vpnStatus: String, //enum('vpnOnly', 'noVpn', 'allOK')
        thumbnail: String,
    },
    originalImages: Array(String),
    credits: Array({
        movieID: String,
        movieName: String,
        movieType: String,
        moviePoster: String,
        movieThumbnail: String,
        role: String,
        actorID: String,
        actorName: String,
        actorImage: String,
        actorThumbnail: String,
    }),
    insert_date: Date,
    update_date: Date,
    userStats: #userStats_character,
}
```

## Genres

```javascript
genres = Array({
    genre: String,
    poster: #POSTER,
    count: Int,
})
```

## Movie Sources

```javascript
movieSources = Array({
    sourceName: String,
    url: String,
})
```

<br />

# API

- Open [admin api docs](API.ADMIN.README.md).
- Open [user api docs](API.USER.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [error messages docs](ERRORMESSAGE.README.md).
