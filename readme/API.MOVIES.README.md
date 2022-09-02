# API Parameters

| param name       | Values                                                                                                                                                                                                                     | Description                                                        | Required |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|----------|
| **`types`**      | enum(_movie_, _serial_, _anime_movie_, _anime_serial_)                                                                                                                                                                     | join values by `-` example: `movie-anime_serial`                   | `true`   |
| **`dataLevel`**  | _dlink_, _low_, _telbot_, _medium_, _info_, _high_                                                                                                                                                                         |                                                                    | `true`   |
| **`sortBase`**   | enum(_animeTopComingSoon_, _animeTopAiring_,<br/> _comingSoon_, _inTheaters_, _boxOffice_,<br/> _top_, _popular_)                                                                                                          |                                                                    | `true`   |
| **`years`**      | Two Number joined by '-'                                                                                                                                                                                                   | example: 2010-2021                                                 | `true`   |
| **`imdbScores`** | Two Number in range [0-10] joined by '-'                                                                                                                                                                                   | example: 5-9                                                       | `true`   |
| **`malScores`**  | Two Number in range [0-10] joined by '-'                                                                                                                                                                                   | example: 5-9                                                       | `true`   |
| **`page`**       | Number start from 1                                                                                                                                                                                                        | paginating result , 12 item exists in page                         | `true`   |
| **`count`**      | Number start from 1                                                                                                                                                                                                        | number of item returned in each page                               | `true`   |
| **`dayNumber`**  | Number in range [0-6]                                                                                                                                                                                                      | number of day in week                                              | `true`   |
| **`title`**      | String                                                                                                                                                                                                                     | name of movie/staff/character to search                            | `true`   |
| **`id`**         | Mongodb id object                                                                                                                                                                                                          | id of movie/staff/character to get                                 | `true`   |
| **`genres`**     | Array of String joined by '-'                                                                                                                                                                                              | example: action or action-comedy-drama or action-sci_fi            | `true`   |
| **`statType`**   | enum( _like_movie_, _dislike_movie_, <br/>_like_staff_, _dislike_staff_, <br/>_like_character_, _dislike_character_, <br/>_follow_movie_, _follow_staff_, <br/>_future_list_, _dropped_, _finished_, <br/>_save_, _score_) | values with no suffix (_staff or _character) only works for movies | `true`   |
| **`date`**       | Date                                                                                                                                                                                                                       |                                                                    | `true`   |

> they are case-insensitive so `animeTopAiring` and `animetopairing` are equal.

**Note: use query parameter `testUser=true` to see result of api call on get methods (do not use this parameter in production).**


# API Resources
- [GET /movies/news/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesnewstypesdatalevelimdbscoresmalscorespage)
- [GET /movies/newsWithDate/[date]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesnewswithdatedatetypesdatalevelimdbscoresmalscorespage)
- [GET /movies/updates/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesupdatestypesdatalevelimdbscoresmalscorespage)
- [GET /movies/updatesWithDate/[date]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesupdateswithdatedatetypesdatalevelimdbscoresmalscorespage)
- [GET /movies/topsByLikes/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviestopsbylikestypesdatalevelimdbscoresmalscorespage)
- [GET /movies/trailers/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviestrailerstypesdatalevelimdbscoresmalscorespage)
- [GET /movies/sortedMovies/[sortBase]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviessortedmoviessortbasetypesdatalevelimdbscoresmalscorespage)
- [GET /movies/seriesOfDay/[dayNumber]/[types]/[imdbScores]/[malScores]/[page]](#get-moviesseriesofdaydaynumbertypesimdbscoresmalscorespage)
- [GET /movies/multiple/status/[types]/[dataLevel]/[imdbScores]/[malScores]/[count]/[page]](#get-moviesmultiplestatustypesdatalevelimdbscoresmalscorescountpage)
- [GET /movies/searchMovieStaffCharacter/[title]/[dataLevel]/[page]](#get-moviessearchmoviestaffcharactertitledatalevelpage)
- [GET /movies/searchStaffAndCharacter/[dataLevel]/[page]](#get-moviessearchstaffandcharacterdatalevelpage)
- [GET /movies/searchStaff/[dataLevel]/[page]](#get-moviessearchstaffdatalevelpage)
- [GET /movies/searchCharacter/[dataLevel]/[page]](#get-moviessearchcharacterdatalevelpage)
- [GET /movies/searchMovie/[dataLevel]/[page]](#get-moviessearchmoviedatalevelpage)
- [GET /movies/searchByID/[id]/[dataLevel]](#get-moviessearchbyididdatalevel)
- [GET /movies/staff/searchById/[id]](#get-moviesstaffsearchbyidid)
- [GET /movies/characters/searchById/[id]](#get-moviescharacterssearchbyidid)
- [GET /movies/status/genres](#get-moviesstatusgenres)
- [GET /movies/status/movieSources](#get-moviesstatusmoviesources)
- [GET /movies/genres/[genres]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesgenresgenrestypesdatalevelimdbscoresmalscorespage)
- [PUT /movies/addUserStats/[statType]/[id]](#put-moviesadduserstatsstattypeid)
- [GET /movies/userStatsList/[statType]/[dataLevel]/[page]](#get-moviesuserstatsliststattypedatalevelpage)
- [GET /movies/animeEnglishName](#get-moviesanimeenglishname)


## Movie-Data Api

### GET /movies/news/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return recent movies (new released movies). ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/news/serial-anime_serial/low/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/news/serial-anime_serial/medium/6-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/news/serial/high/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/newsWithDate/[date]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return recent movies (new released movies after [date]). ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/updatesWithDate/2022-08-25T13:02:05Z/serial-anime_serial/low/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/updates/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return movies sorted by update date (movies with new episode or higher quality). ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/updates/serial-anime_serial/low/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/updates/movie-anime_serial/medium/6-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/updates/serial/high/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/updatesWithDate/[date]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return movies sorted by update date (movies with new episode or higher quality  after [date]). ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/updatesWithDate/2022-08-25T13:02:05Z/serial-anime_serial/low/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/topsByLikes/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return movies sorted by inApp like count. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/topsByLikes/serial-anime_serial/low/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/topsByLikes/anime_serial/medium/6-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/topsByLikes/movie/high/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/trailers/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return movies with new added trailer. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/trailers/serial-anime_serial/low/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/trailers/serial-anime_serial/medium/6-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/trailers/serial-movie/high/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/sortedMovies/[sortBase]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return movies sorted by something like 'comingSoon'. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/sortedMovies/animeTopAiring/serial-anime_serial/low/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/sortedMovies/animeTopAiring/serial-anime_serial/medium/6-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/sortedMovies/comingSoon/serial-anime_serial/high/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/seriesOfDay/[dayNumber]/[types]/[imdbScores]/[malScores]/[page]
> return series that get release on that day. ([movies schema](SCHEMA.README.md#Movie-Data))
> 
> dataLevel is set as 'medium'.

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/seriesOfDay/0/serial-anime_serial/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/seriesOfDay/1/serial-anime_serial/6-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/seriesOfDay/6/serial-anime_serial/0-10/0-10/1?testUser=true
</details>
<br />

### GET /movies/multiple/status/[types]/[dataLevel]/[imdbScores]/[malScores]/[count]/[page]
> return fields { __inTheaters__, __comingSoon__, __news__, __update__ } as array of movie-data.  ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/multiple/status/movie-serial/low/0-10/0-10/3/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/multiple/status/anime_movie-anime_serial/low/0-10/0-10/6/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/multiple/status/serial/high/0-10/0-10/6/1?testUser=true
</details>
<br />

### GET /movies/searchMovieStaffCharacter/[title]/[dataLevel]/[page]
> return { __movies__, __staff__, __characters__ }. ([movies schema](SCHEMA.README.md#Movie-Data)) ([staff schema](SCHEMA.README.md#Staff-Data)) ([character schema](SCHEMA.README.md#Character-Data))
> 

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/searchMovieStaffCharacter/attack/low/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovieStaffCharacter/mikasa/medium/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovieStaffCharacter/mikasa/high/1?&testUser=true
</details>
<br />

## Search Api

### GET /movies/searchStaffAndCharacter/[dataLevel]/[page]
> return {__staff__, __characters__}.  ([staff schema](SCHEMA.README.md#Staff-Data)) ([character schema](SCHEMA.README.md#Character-Data))

<details>
<summary>
Query params (filters): 
</summary>

| param name      | Values                   | Description                       | Required |
|-----------------|--------------------------|-----------------------------------|----------|
| **`dataLevel`** | _low_, _medium_, _high_  |                                   | `false`  |
| **`name`**      | String                   | name of staff/character to search | `false`  |
| **`gender`**    | String                   | male, female, sexless             | `false`  |
| **`country`**   | String                   |                                   | `false`  |
| **`hairColor`** | String                   |                                   | `false`  |
| **`eyeColor`**  | String                   |                                   | `false`  |
| **`age`**       | Two Number joined by '-' | example: 15-20                    | `false`  |

</details>

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/searchStaffAndCharacter/low/1?age=15-20&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchStaffAndCharacter/low/1?age=15-20&name=mikasa&testUser=true
</details>
<br />

### GET /movies/searchStaff/[dataLevel]/[page]
> return __staff__.  ([staff schema](SCHEMA.README.md#Staff-Data))

<details>
<summary>
Query params (filters): 
</summary>

| param name      | Values                   | Description                       | Required |
|-----------------|--------------------------|-----------------------------------|----------|
| **`dataLevel`** | _low_, _medium_, _high_  |                                   | `false`  |
| **`name`**      | String                   | name of staff/character to search | `false`  |
| **`gender`**    | String                   | male, female, sexless             | `false`  |
| **`country`**   | String                   |                                   | `false`  |
| **`hairColor`** | String                   |                                   | `false`  |
| **`eyeColor`**  | String                   |                                   | `false`  |
| **`age`**       | Two Number joined by '-' | example: 15-20                    | `false`  |

</details>

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/searchStaff/low/1?age=15-20&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchStaff/low/1?name=osamu&testUser=true
</details>
<br />

### GET /movies/searchCharacter/[dataLevel]/[page]
> return __characters__. ([character schema](SCHEMA.README.md#Character-Data))

<details>
<summary>
Query params (filters): 
</summary>

| param name      | Values                   | Description                       | Required |
|-----------------|--------------------------|-----------------------------------|----------|
| **`dataLevel`** | _low_, _medium_, _high_  |                                   | `false`  |
| **`name`**      | String                   | name of staff/character to search | `false`  |
| **`gender`**    | String                   | male, female, sexless             | `false`  |
| **`country`**   | String                   |                                   | `false`  |
| **`hairColor`** | String                   |                                   | `false`  |
| **`eyeColor`**  | String                   |                                   | `false`  |
| **`age`**       | Two Number joined by '-' | example: 15-20                    | `false`  |

</details>

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/searchCharacter/low/1?age=15-20&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchCharacter/low/1?age=15-20&name=mikasa&testUser=true
</details>
<br />

### GET /movies/searchMovie/[dataLevel]/[page]
> return __movies__. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Query params (filters): 
</summary>

| param name            | Values                                                 | Description                                             | Required |
|-----------------------|--------------------------------------------------------|---------------------------------------------------------|----------|
| **`title`**           | String                                                 | name of movie to search                                 | `false`  |
| **`years`**           | Two Number joined by '-'                               | example: 2015-2020                                      | `false`  |
| **`types`**           | enum(_movie_, _serial_, _anime_movie_, _anime_serial_) | join values by `-` example: `movie-anime_serial`        | `false`  |
| **`imdbScores`**      | Two Number in range [0-10] joined by '-'               | example: 5-9                                            | `false`  |
| **`malScores`**       | Two Number in range [0-10] joined by '-'               | example: 5-9                                            | `flase`  |
| **`genres`**          | Array of String joined by '-'                          | example: action or action-comedy-drama or action-sci_fi | `false`  |
| **`numberOfSeason`**  | Single number or Two Number joined by '-'              | example: 2 or 5-7                                       | `false`  |
| **`country`**         | String                                                 | example: japan                                          | `false`  |
| **`movieLang`**       | String                                                 | example: spanish                                        | `false`  |
| **`dubbed`**          | true / false                                           |                                                         | `false`  |
| **`hardSub`**         | true / false                                           |                                                         | `false`  |
| **`censored`**        | true / false                                           |                                                         | `false`  |
| **`subtitle`**        | true / false                                           |                                                         | `false`  |
| **`watchOnlineLink`** | true / false                                           |                                                         | `false`  |

</details>

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/searchMovie/low/1?years=2014-2020&title=attack on titan&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovie/low/1?years=2014-2020&title=attack on titan&genres=action&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovie/low/1?years=2014-2020&title=attack on titan&genres=action&subtitle=true&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovie/low/1?years=2010-2020&country=germany&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovie/low/1?years=2010-2020&movieLang=spanish&testUser=true
- https://downloader-node-api.herokuapp.com/movies/searchMovie/low/1?years=2021-2023&numberOfSeason=1&testUser=true
</details>
<br />

### GET /movies/searchByID/[id]/[dataLevel]
> return searching movie-data. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Query params (filters): 
</summary>

| param name      | Values                                    | Description                                                                        | Required |
|-----------------|-------------------------------------------|------------------------------------------------------------------------------------|----------|
| **`seasons`**   | Single number or Two Number joined by '-' | return corresponding seasons links only, (works for serials), example: 6 or 2-5    | `false`  |
| **`qualities`** | Strings joined by '-'                     | return corresponding qualities links only, (works for movies), example: 1080p-720p | `false`  |

</details>

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/searchbyid/6162e1b5d4998d86d10891f4/low?testUser=true
</details>
<br />

### GET /movies/staff/searchById/[id]
> return searching staff data. ([staff schema](SCHEMA.README.md#Staff-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/staff/searchById/626b956d20fd53af87dc9cad?testUser=true
</details>
<br />

### GET /movies/characters/searchById/[id]
> return searching character data. ([character schema](SCHEMA.README.md#Character-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/characters/searchById/619a2ee6b1d34100166fd94d?testUser=true
</details>
<br />

## Status Api

### GET /movies/status/genres
> returns all available genres with their count. ([genres schema](SCHEMA.README.md#Genres))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/status/genres?testUser=true
</details>
<br />

### GET /movies/status/movieSources
> returns movie sources with latest url. ([movie sources schema](SCHEMA.README.md#Movie-Sources))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/status/movieSources?testUser=true
</details>
<br />

### GET /movies/genres/[genres]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]
> return array of movies match with searching genres. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/genres/action/movie-serial/low/0-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/genres/sci_fi/serial/medium/5-10/0-10/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/genres/action-comedy/anime_movie-anime_serial/low/0-10/6-10/1?testUser=true
</details>
<br />
<br />

## User Stats Api

### PUT /movies/addUserStats/[statType]/[id]
> also receive query parameters `remove=[true|false]`

<br />

### GET /movies/userStatsList/[statType]/[dataLevel]/[page]
> return array of movies. ([movies schema](SCHEMA.README.md#Movie-Data))

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/userStatsList/like_movie/low/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/userStatsList/follow_movie/low/1?testUser=true
- https://downloader-node-api.herokuapp.com/movies/userStatsList/save/low/1?testUser=true
</details>
<br />


## Other Api

### GET /movies/animeEnglishName
> return english names of anime based on japanese name.
> 
> receives query parameter japaneseNames, japaneseNames=name1&japaneseNames=name2....
> 
> return Array of {japaneseName: String, englishName: String}

<details>
<summary>
Examples
</summary>

- https://downloader-node-api.herokuapp.com/movies/animeEnglishName?japaneseNames=kimi no na wa&japaneseNames=Kimetsu no Yaiba&testUser=true
- https://downloader-node-api.herokuapp.com/movies/animeEnglishName?japaneseNames=kimi no na wa&testUser=true
</details>
<br />


# API
- Open [admin api docs](API.ADMIN.README.md).
- Open [user api docs](API.USER.README.md).
- Open [schema](SCHEMA.README.md).
- Open [error messages docs](ERRORMESSAGE.README.md).
