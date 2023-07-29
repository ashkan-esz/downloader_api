import {Router} from 'express';
import {moviesControllers} from '../../controllers/index.js';
import middlewares from '../middlewares/index.js';

const router = Router();

//movies/news/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/news/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getNews);

//movies/newsWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/newsWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['date', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getNewsWithDate);

//movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updates/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getUpdates);

//movies/updatesWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updatesWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['date', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getUpdatesWithDate);

//movies/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/trailers/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getTrailers);

//movies/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['sortBase', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getSortedMovies);

//movies/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page
router.get('/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dayNumber', 'types', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getSeriesOfDay);

//movies/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page
router.get('/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'count', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getMultipleStatus);

//movies/searchMovieStaffCharacter/:title/:dataLevel/:page
router.get('/searchMovieStaffCharacter/:title/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['title', 'dataLevel', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchMovieStaffCharacter);

//movies/searchStaffAndCharacter/:dataLevel/:page
router.get('/searchStaffAndCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchStaffAndCharacter);

//movies/searchStaff/:dataLevel/:page
router.get('/searchStaff/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchStaff);

//movies/searchCharacter/:dataLevel/:page
router.get('/searchCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchCharacter);

//movies/searchMovie/:dataLevel/:page
router.get('/searchMovie/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(
        ['dataLevel', 'page',
            'title_query', 'types_query', 'years_query',
            'imdbScores_query', 'malScores_query', 'genres_query', 'country_query', 'movieLang_query',
            'dubbed_query', 'hardSub_query', 'censored_query', 'subtitle_query', 'watchOnlineLink_query',
            'numberOfSeason_query',
        ]),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchMovie);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'dataLevel', 'seasons_query', 'episodes_query', 'qualities_query', 'embedDownloadLinksConfig']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchMovieById);

//movies/staff/searchById/:id
router.get('/staff/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchStaffById);

//movies/characters/searchById/:id
router.get('/characters/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.searchCharacterById);

//movies/addUserStats/:statType/:id?remove=(true|false)
router.put('/addUserStats/:statType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['statType', 'id', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.userStatsService);

//movies/userStatsList/:statType/:dataLevel/:page
router.get('/userStatsList/:statType/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['statType', 'dataLevel', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getUserStatsList);

//movies/status/genres
router.get('/status/genres', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, middlewares.moviesCache, moviesControllers.getGenresStatus);

//movies/status/movieSources
router.get('/status/movieSources', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, middlewares.moviesCache, moviesControllers.getMovieSources);

//movies/genres/:genres/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/genres/:genres/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['genres', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getGenresMovies);

//movies/animeEnglishName?japaneseNames
router.get('/animeEnglishName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['japaneseNames_query']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getAnimeEnglishNames);

//movies/birthday/:staffOrCharacters/:dataLevel/:page
router.get('/birthday/:staffOrCharacters/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.attachCurrentUser,
    middlewares.validateApiParams.checkApiParams(['staffOrCharacters', 'followedOnly', 'dataLevel', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    middlewares.movieCache_guest,
    moviesControllers.getTodayBirthday);

//movies/bots/:botId/:moviesRequestName/:types/:dataLevel/:imdbScores/:malScores
router.get('/bots/:botId/:moviesRequestName/:types/:dataLevel/:imdbScores/:malScores',
    middlewares.rateLimit.rateLimit_5,
    middlewares.validateApiParams.checkApiParams(['moviesRequestName', 'types', 'dataLevel', 'imdbScores', 'malScores', 'dontUpdateServerDate']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getMoviesDataForBot);

export default router;
