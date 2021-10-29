const router = require('express').Router();
import {moviesControllers} from '../../controllers';
import middlewares from '../middlewares';


//movies/news/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/news/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getNews);

//movies/updates/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updates/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getUpdates);

//movies/tops/byLikes/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/tops/byLikes/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/trailers/:types/:dataLevel/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getTrailers);

//movies/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page
router.get('/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.getSeriesOfDay);

//movies/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page
router.get('/searchByTitle/:title/:types/:dataLevel/:years/:imdbScores/:malScores/:page', middlewares.moviesCache, moviesControllers.searchByTitle);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel', middlewares.moviesCache, moviesControllers.searchById);

export default router;
