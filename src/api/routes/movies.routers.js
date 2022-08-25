import {Router} from 'express';
import {moviesControllers} from '../../controllers/index.js';
import middlewares from '../middlewares/index.js';

const router = Router();

//movies/news/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/news/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getNews);

//movies/newsWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/newsWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['date', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getNewsWithDate);

//movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updates/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getUpdates);

//movies/updatesWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updatesWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['date', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getUpdatesWithDate);

//movies/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/trailers/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getTrailers);

//movies/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['sortBase', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getSortedMovies);

//movies/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page
router.get('/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dayNumber', 'types', 'imdbScores', 'malScores', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getSeriesOfDay);

//movies/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page
router.get('/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'count', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getMultipleStatus);

//movies/searchMovieStaffCharacter/:title/:dataLevel/:page
router.get('/searchMovieStaffCharacter/:title/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['title', 'dataLevel', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchMovieStaffCharacter);

//movies/searchStaffAndCharacter/:dataLevel/:page
router.get('/searchStaffAndCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchStaffAndCharacter);

//movies/searchStaff/:dataLevel/:page
router.get('/searchStaff/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchStaff);

//movies/searchCharacter/:dataLevel/:page
router.get('/searchCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchCharacter);

//movies/searchMovie/:dataLevel/:page
router.get('/searchMovie/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(
        ['dataLevel', 'page',
            'title_query', 'types_query', 'years_query',
            'imdbScores_query', 'malScores_query', 'genres_query', 'country_query', 'movieLang_query',
            'dubbed_query', 'hardSub_query', 'censored_query', 'subtitle_query', 'watchOnlineLink_query',
        ]),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchMovie);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'dataLevel', 'seasons_query', 'qualities_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchMovieById);

//movies/staff/searchById/:id
router.get('/staff/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchStaffById);

//movies/characters/searchById/:id
router.get('/characters/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchCharacterById);

//movies/addUserStats/:statType/:id?remove=(true|false)
router.put('/addUserStats/:statType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['statType', 'id', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsService);

//movies/userStatsList/:statType/:dataLevel/:page
router.get('/userStatsList/:statType/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['statType', 'dataLevel', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
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
    moviesControllers.getGenresMovies);

//movies/animeEnglishName?japaneseNames
router.get('/animeEnglishName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['japaneseNames_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getAnimeEnglishNames);

export default router;
