import {Router} from 'express';
import {moviesControllers} from '../../controllers';
import middlewares from '../middlewares';

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

//movies/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page
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

//movies/:type/:id?remove=(true|false)
router.put('/:type/:id', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.likeMovie);

//movies/staff/:type/:id?remove=(true|false)
router.put('/staff/:type/:id', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.likeStaff);

//movies/characters/:type/:id?remove=(true|false)
router.put('/characters/:type/:id', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.likeCharacter);


export default router;
