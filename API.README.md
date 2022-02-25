## Api parameters

| param name                 |  Values  | Description                                      | Required |
| -------------------------- | -------- |--------------------------------------------------| -------- |
| **`types`**                 | _movie_, _serial_, _anime_movie_, _anime_serial_ | join values by `-` example: `movie-anime_serial` | `true` |
| **`dataLevel`**         | _low_, _medium_, _high_|                                                  |`true` |
| **`sortBase`** | _animeTopComingSoon_, _animeTopAiring_, _comingSoon_, _inTheaters_, _boxOffice_, _top_, _popular_, |                                                  | `true` |
| **`years`** | numbers in range | example: 2010-2021                               | `true` |
| **`imdbScores`** | number in range 0 to 10 | example: 5-9                                     | `true` |
| **`malScores`** | number in range 0 to 10 | example: 5-9                                     | `true` |
| **`page`** | number start from 1 | paginating result , 12 item exists in page       | `true` |
| **`count`** | number start from 1 | number of item returned in each page       | `true` |
| **`dayNumber`** | number in range 0-6 | number of day in week                            | `true` |
| **`title`** | string | name of movie/staff/character to search          | `true` |
| **`id`** | mongodb id object | id of movie/staff/character to get               | `true` |
| **`password`** | string | password of crawler starter api                  | `true` |
| **`deviceId`** | string | unique id of session                             | `true` |
| **`genres`** | array of string | example: ['action', 'comedy']                             | `true` |

> they are case-insensitive so `animeTopAiring` and `animetopairing` are equal.

## API Resources
- [POST /crawler/[password]](#post-crawlerpassword)
- [POST /crawler/domainChange/[password]](#post-crawlerdomainchangepassword)

- [POST /users/signup](#post-userssignup)
- [POST /users/login](#post-userslogin)
- [POST /users/getToken](#post-usersgettoken)
- [POST /users/logout](#post-userslogout)
- [POST /users/forceLogout/[deviceId]](#post-usersforcelogoutdeviceid)
- [POST /users/forceLogoutAll](#post-usersforcelogoutall)
- [GET /users/myProfile](#get-usersmyprofile)
- [GET /users/activeSessions](#get-usersactivesessions)
- [GET /users/sendVerifyEmail](#get-userssendverifyemail)
- [GET /users/verifyEmail/[token]](#get-usersverifyemailtoken)
- [GET /movies/news/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesnewstypesdatalevelimdbscoresmalscorespage)
- [GET /movies/updates/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesupdatestypesdatalevelimdbscoresmalscorespage)
- [GET /movies/topsByLikes/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviestopsbylikestypesdatalevelimdbscoresmalscorespage)
- [GET /movies/trailers/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviestrailerstypesdatalevelimdbscoresmalscorespage)
- [GET /movies/sortedMovies/[sortBase]/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviessortedmoviessortbasetypesdatalevelimdbscoresmalscorespage)
- [GET /movies/seriesOfDay/[dayNumber]/[types]/[imdbScores]/[malScores]/[page]](#get-moviesseriesofdaydaynumbertypesimdbscoresmalscorespage)
- [GET /movies/multiple/status/[types]/[dataLevel]/[imdbScores]/[malScores]/[count]/[page]](#get-moviesmultiplestatustypesdatalevelimdbscoresmalscorescountpage)
- [GET /movies/searchByTitle/[title]/[types]/[dataLevel]/[years]/[imdbScores]/[malScores]/[page]](#get-moviessearchbytitletitletypesdatalevelyearsimdbscoresmalscorespage)
- [GET /movies/searchByID/[id]/[dataLevel]](#get-moviessearchbyididdatalevel)
- [GET /movies/staff/searchById/[id]](#get-moviesstaffsearchbyidid)
- [GET /movies/characters/searchById/[id]](#get-moviescharacterssearchbyidid)  
- [PUT /movies/[type]/[id]](#put-moviestypeid)
- [PUT /movies/staff/[type]/[id]](#put-moviesstafftypeid)
- [PUT /movies/characters/[type]/[id]](#put-moviescharacterstypeid)
- [GET /movies/status/genres](#get-moviesstatusgenres)
- [GET /movies/genres/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]](#get-moviesgenrestypesdatalevelimdbscoresmalscorespage)


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

# user section api

## auth fields

```
username: /^[a-z|0-9_]+$/gi and length of 6-50 ,
email: String ,
password: String and length of 8-50 with atleast one number and capital letter,
confirmPassword: String ,
deviceInfo: {
    appName: String,
    appVersion: String,
    os: String,
    deviceModel: String,
};,
```

## auth
> put `accessToken` in each request header.
> 
> also send `refreshToken` cookie in each request.
>> for mobile phones or situations where cookies are not available, send `refreshToken` into headers and use `?noCookie=true` parameter in api routes to receive it.
>
> api routes send 403 when `accessToken` is invalid or out of date. (getToken again)
> 
> api routes send 401 when `refreshToken` is invalid or out of date or revoked. (must log in again)
> 
> `users/getToken` route also generates new refreshToken and must replace the existing on client


### POST /users/signup
> receives { username , email , password , confirmPassword , deviceInfo } in request body
> 
> return { accessToken , accessToken_expire , username , userId } and also `refreshToken`.


### POST /users/login
> receives { username_email , password , deviceInfo } in request body
>
> return { accessToken , accessToken_expire , username , userId } and also `refreshToken`.


### POST /users/getToken
> return { accessToken , accessToken_expire , username , profileImages , deviceInfo } and also `refreshToken`.


### POST /users/logout
> return { accessToken:'' } and also reset/remove `refreshToken` cookie.


### POST /users/forceLogout/[deviceId]
> receives `deviceId`
>
> return `activeSessions`.


### POST /users/forceLogoutAll
> return `activeSessions` as [].


### GET /users/myProfile
> return users profile data.


### GET /users/activeSessions
> return users active sections.

### GET /users/sendVerifyEmail
> send an email with an activation link.


### GET /users/verifyEmail/[token]
> verify given email token.


# movie section api

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


### GET /movies/seriesOfDay/[dayNumber]/[types]/[imdbScores]/[malScores]/[page]
Example: https://downloader-node-api.herokuapp.com/movies/seriesOfDay/0/serial-anime_serial/0-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/seriesOfDay/1/serial-anime_serial/6-10/0-10/1  
Example: https://downloader-node-api.herokuapp.com/movies/seriesOfDay/6/serial-anime_serial/0-10/0-10/1


### GET /movies/multiple/status/[types]/[dataLevel]/[imdbScores]/[malScores]/[count]/[page]
> return fields { inTheaters , comingSoon , news , update } as array of movie data
> 
Example: https://downloader-node-api.herokuapp.com/movies/multiple/status/movie-serial/low/0-10/0-10/3/1
Example: https://downloader-node-api.herokuapp.com/movies/multiple/status/anime_movie-anime_serial/low/0-10/0-10/6/1


### GET /movies/searchByTitle/[title]/[types]/[dataLevel]/[years]/[imdbScores]/[malScores]/[page] 
> also receive field `genres` in request body (optional).

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

### PUT /movies/[type]/[id]
### PUT /movies/staff/[type]/[id]
### PUT /movies/characters/[type]/[id]
> `type` can be `like` or `dislike` and also receive query parameters `remove=[true|false]`
> 
> returns status code 409 when liking a movie that is previously liked

### GET /movies/status/genres
> returns all available genres with their count


### GET /movies/genres/[types]/[dataLevel]/[imdbScores]/[malScores]/[page]  
> receive field `genres` in request body and return movies match with searching genres 
