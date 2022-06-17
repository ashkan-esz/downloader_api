import {Router} from 'express';
import {moviesControllers} from '../../controllers/index.js';
import middlewares from '../middlewares/index.js';

const router = Router();

//movies/news/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/news/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getNews);

//movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updates/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getUpdates);

//movies/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/trailers/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getTrailers);

//movies/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getSortedMovies);

//movies/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page
router.get('/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getSeriesOfDay);

//movies/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page
router.get('/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getMultipleStatus);

//movies/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page?genres
router.get('/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.searchByTitle);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.searchMovieById);

//movies/staff/searchById/:id
router.get('/staff/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.searchStaffById);

//movies/characters/searchById/:id
router.get('/characters/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.searchCharacterById);

//movies/addUserStats/:statType/:id?remove=(true|false)
router.put('/addUserStats/:statType/:id', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.userStatsService);

//movies/userStatsList/:statType/:dataLevel/:page
router.get('/userStatsList/:statType/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getUserStatsList);

//movies/status/genres
router.get('/status/genres', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, middlewares.moviesCache, moviesControllers.getGenresStatus);

//movies/status/movieSources
router.get('/status/movieSources', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, middlewares.moviesCache, moviesControllers.getMovieSources);

//movies/genres/:genres/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/genres/:genres/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getGenresMovies);

export default router;
