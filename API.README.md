## Api parameters

| param name                 |  Values  | Description                                          | Required |
| -------------------------- | -------- | ---------------------------------------------------- | -------- |
| **`types`**                 | _movie_, _serial_, _anime_movie_, _anime_serial_ | join values by `-` example: `movie-anime_serial`   | `true` |
| **`dataLevel`**         | _low_, _medium_, _high_|  |`true` |
| **`sortBase`** | _animeTopComingSoon_, _animeTopAiring_, _comingSoon_, _inTheaters_, _boxOffice_, _top_, _popular_, | | `true` |
| **`years`** | numbers in range | example: 2010-2021 | `true` |
| **`imdbScores`** | number in range 0 to 10 | example: 5-9 | `true` |
| **`malScores`** | number in range 0 to 10 | example: 5-9 | `true` |
| **`page`** | number start from 1 | paginating result , 12 item exists in page | `true` |
| **`dayNumber`** | number in range 0-6 | number of day in week | `true` |
| **`title`** | string | name of movie/staff/character to search | `true` |
| **`id`** | mongodb id object | id of movie/staff/character to get | `true` |
| **`password`** | string | password of crawler starter api | `true` |

> they are case-insensitive so `animeTopAiring` and `animetopairing` are equal.

## API Resources
- [POST /crawler/[password]](#post-crawlerpassword)
- [POST /crawler/domainChange/[password]](#post-crawlerdomainchangepassword)
- [GET /movies/news/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesnewstypesdatalevelimdbscoresmalscorespage)
- [GET /movies/updates/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesupdatestypesdatalevelimdbscoresmalscorespage)
- [GET /movies/topsByLikes/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviestopsbylikestypesdatalevelimdbscoresmalscorespage)
- [GET /movies/trailers/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviestrailerstypesdatalevelimdbscoresmalscorespage)
- [GET /movies/sortedMovies/[sortBase]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviessortedmoviessortbasetypesdatalevelimdbscoresmalscorespage)
- [GET /seriesOfDay/[dayNumber]/[types]/[imdbScores]/[malScores]/[page]](#get-seriesofdaydaynumbertypesimdbscoresmalscorespage)
- [GET /movies/searchByTitle/[title]/[types]/[dataLevel]/[years]/[imdbScores]/[malScores]/[page]](#get-moviessearchbytitletitletypesdatalevelyearsimdbscoresmalscorespage)
- [GET /movies/searchByID/[id]/[dataLevel]](#get-moviessearchbyididdatalevel)
- [GET /movies/staff/searchById/[id]](#get-moviesstaffsearchbyidid)
- [GET /movies/characters/searchById/[id]](#get-moviescharacterssearchbyidid)  


### POST /crawler/[password] 
> do not use this  

Example: https://downloader-node-api.herokuapp.com/crawler/{PASSWORD}/?sourceName=digimoviez&mode=0&handleDomainChange=false

additional parameters:

| param name                 |  Values  | Description                              | Required |
| -------------------------- | -------- | ---------------------------------------- | -------- |
| **`mode`**                 | 0 , 1 , 2 | crawling mode | `false (default: 0)` |
| **`sourceName`**         | string | source name to crawl | `true` |
| **`handleDomainChange`** | true , false | crawler flag | `false (default: true)` |
| **`handleCastUpdate`** | true , false | crawler flag | `false (default: true)` |


### POST /crawler/domainChange/[password]  
> do not use this

Example: https://downloader-node-api.herokuapp.com/crawler/domainChange/{PASSWORD}

### GET /movies/news/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]  
Example: https://downloader-node-api.herokuapp.com/movies/news/serial-anime_serial/low/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/news/serial-anime_serial/medium/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/news/serial-anime_serial/high/0-10/0-10/1  


### GET /movies/updates/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]  
Example: https://downloader-node-api.herokuapp.com/movies/updates/serial-anime_serial/low/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/updates/serial-anime_serial/medium/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/updates/serial-anime_serial/high/0-10/0-10/1


### GET /movies/topsByLikes/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]  
Example: https://downloader-node-api.herokuapp.com/movies/topsByLikes/serial-anime_serial/low/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/topsByLikes/serial-anime_serial/medium/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/topsByLikes/serial-anime_serial/high/0-10/0-10/1


### GET /movies/trailers/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]  
Example: https://downloader-node-api.herokuapp.com/movies/trailers/serial-anime_serial/low/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/trailers/serial-anime_serial/medium/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/trailers/serial-anime_serial/high/0-10/0-10/1


### GET /movies/sortedMovies/[sortBase]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]  
Example: https://downloader-node-api.herokuapp.com/movies/sortedMovies/animeTopAiring/serial-anime_serial/low/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/sortedMovies/animeTopAiring/serial-anime_serial/medium/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/sortedMovies/comingSoon/serial-anime_serial/high/0-10/0-10/1


### GET /seriesOfDay/[dayNumber]/[types]/[imdbScores]/[malScores]/[page]
Example: https://downloader-node-api.herokuapp.com/movies/seriesOfDay/0/serial-anime_serial/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/seriesOfDay/1/serial-anime_serial/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/seriesOfDay/6/serial-anime_serial/0-10/0-10/1


### GET /movies/searchByTitle/[title]/[types]/[dataLevel]/[years]/[imdbScores]/[malScores]/[page] 
Example: https://downloader-node-api.herokuapp.com/movies/searchbytitle/attack/serial-anime_serial/low/2000-2022/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/searchbytitle/attack/serial-anime_serial/low/2000-2022/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/searchbytitle/mikasa/serial-anime_serial/high/2000-2022/0-10/0-10/1


### GET /movies/searchByID/[id]/[dataLevel]  
Example: https://downloader-node-api.herokuapp.com/movies/searchbyid/6162e1b5d4998d86d10891f4/low  
Example: https://downloader-node-api.herokuapp.com/movies/searchbyid/6162e1b5d4998d86d10891f4/high  


### GET /movies/staff/searchById/[id]  
Example: https://downloader-node-api.herokuapp.com/movies/staff/searchById/614a1e74a04ce900162c64e2



### GET /movies/characters/searchById/[id]  
Example: https://downloader-node-api.herokuapp.com/movies/characters/searchById/61326d26c1ef65001665d02a  
