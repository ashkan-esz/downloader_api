import {Router} from 'express';
import {moviesControllers} from '../../controllers';
import middlewares from '../middlewares';

const router = Router();

//movies/news/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/news/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getNews);

//movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updates/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getUpdates);

//movies/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/topsByLikes/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/trailers/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getTrailers);

//movies/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getSortedMovies);

//movies/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page
router.get('/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getSeriesOfDay);

//movies/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page
router.get('/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page', middlewares.moviesCache, moviesControllers.getMultipleStatus);

//movies/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page
router.get('/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.searchByTitle);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel', middlewares.moviesCache, moviesControllers.searchMovieById);

//movies/staff/searchById/:id
router.get('/staff/searchById/:id', middlewares.moviesCache, moviesControllers.searchStaffById);

//movies/characters/searchById/:id
router.get('/characters/searchById/:id', middlewares.moviesCache, moviesControllers.searchCharacterById);


export default router;
