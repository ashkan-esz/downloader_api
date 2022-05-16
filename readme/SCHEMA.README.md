## Profile

```javascript
profile = {
    _id: Object, //act as userId
    username: String,
    publicName: String, //other users see this in general
    email: String,
    emailVerified: Boolean,
    bio: String,
    profileImages: Array(String),
    defaultProfile: String,
    friends: Array,
    favorites: {
        titles: Array,
        staff: Array,
        characters: Array
    },
    status: {
        watched: Array,
        watching: Array,
        dropped: Array,
        wantToWatch: Array
    },
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
    deviceOs: String,
    deviceModel: String,
}
```

## Movie Data

```javascript
dataLevel = {
    low: {
        _id: Object,
        title: String,
        rawTitle: String,
        year: String,
        premiered: String,
        posters: Array({
            url: String,
            info: String,
            size: Int
        }),
        type: String, // enum('movie', 'serial', 'anime_movie', 'anime_serial')
        rating: {
            imdb: Int,
            rottenTomatoes: Int,
            metacritic: Int,
            myAnimeList: Int
        },
        likesCount: Int,
        dislikesCount: Int,
        likeOrDislike: String, // enum('', 'like', 'dislike')
    },
    medium: {
        ...low, //all fields from low datalevel also exist
        releaseState: String, // enum('inTheaters', 'comingSoon', 'waiting', 'done')
        rank: {
            animeTopComingSoon: Int,
            animeTopAiring: Int,
            comingSoon: Int,
            inTheaters: Int,
            boxOffice: Int,
            top: Int,
            popular: Int,
        },
        alternateTitles: Array(String),
        summary: {
            english: String,
            persian: String,
        },
        genres: Array, // Array of Strings
        trailers: Array({
            url: String,
            info: String
        }),
        latestData: {
            season: Int,
            episode: Int,
            quality: String,
            hardSub: String, //String in format S\d+E\d+
            dubbed: String, //for series 's1e5' shows last episode with hardsub/dubbed/..
            subtitle: String, //for movies 's1e1' means hardsub/dubbed/.. exist
            censored: String,
            watchOnlineLink: String,
        },
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
    },
    high: {
        ...low,
        ...medium,
        titleSynonyms: Array(String),
        qualities: Array({ // for movie titles check qualities and check seasons for series titles
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
        }),
        seasons: Array({
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
        }),
        subtitles: Array({
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
        }),
        sources: Array(String),
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
        },
        trailer_s3: null || {
            url: String,
            originalUrl: String,
            size: Int,
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
        actorsAndCharacters: Array({
            id: Object,
            name: String,
            gender: String, //enum('Male', 'Female')
            country: String,
            image: String,
            positions: Array(String),
            characterData: null || {
                id: Object,
                name: String,
                gender: String, //enum('Male', 'Female')
                image: String,
                role: String,
            }
        }),
        staff: {
            directors: Array, //same format of actorsAndCharacters
            writers: Array, //same format of actorsAndCharacters
            others: Array, //same format of actorsAndCharacters
        },
        awards: String,
        animeType: String,
        animeSource: String,
        relatedTitles: Array({
            _id: '' || Object,
            jikanID: Int,
            title: String,
            rawTitle: String,
            relation: String, //enum('Prequel', 'Sequel', 'Side Story', 'Parent Story', 'Spin-off')
        }),
    }
}
```

## Staff Data

```javascript
staffData = {
    name: String,
    rawName: String,
    gender: String, // enum('Male', 'Female')
    about: String,
    tvmazePersonID: Int,
    jikanPersonID: Int,
    country: String,
    birthday: String,
    deathday: String,
    imageData: null || {
        url: String,
        originalUrl: String,
        size: Int
    },
    originalImages: Array(String),
    credits: Array({
        movieID: String,
        movieName: String,
        moviePoster: String,
        positions: Array(String),
        characterID: String,
        characterName: String,
        characterRole: String,
        characterImage: String,
    }),
    likesCount: Int,
    dislikesCount: Int,
    likeOrDislike: String, // enum('', 'like', 'dislike')
}
```

## Character Data

```javascript
characterData = {
    name: String,
    rawName: String,
    gender: String, // enum('Male', 'Female')
    about: String,
    tvmazePersonID: Int,
    jikanPersonID: Int,
    imageData: null || {
        url: String,
        originalUrl: String,
        size: Int
    },
    originalImages: Array(String),
    credits: Array({
        movieID: String,
        movieName: String,
        moviePoster: String,
        role: String,
        actorID: String,
        actorName: String,
        actorImage: String,
    }),
    likesCount: Int,
    dislikesCount: Int,
    likeOrDislike: String, // enum('', 'like', 'dislike')
}
```

## Genres

```javascript
genres = Array({
    genre: String,
    poster: {
        url: String,
        info: String,
        size: Int
    },
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
