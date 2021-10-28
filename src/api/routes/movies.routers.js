const router = require('express').Router();
import {moviesControllers} from '../../controllers';
import middlewares from '../middlewares';


//movies/news/:types/:dataLevel/:page
router.get('/news/:types/:dataLevel/:page', middlewares.moviesCache, moviesControllers.getNews);

//movies/updates/:types/:dataLevel/:page
router.get('/updates/:types/:dataLevel/:page', middlewares.moviesCache, moviesControllers.getUpdates);

//movies/tops/byLikes/:types/:dataLevel/:page
router.get('/tops/byLikes/:types/:dataLevel/:page', middlewares.moviesCache, moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:page
router.get('/trailers/:types/:dataLevel/:page', middlewares.moviesCache, moviesControllers.getTrailers);

//movies/seriesOfDay/:dayNumber/:types/:page
router.get('/seriesOfDay/:dayNumber/:types/:page', middlewares.moviesCache, moviesControllers.getSeriesOfDay);

//movies/searchByTitle/:title/:types/:dataLevel/:page
router.get('/searchByTitle/:title/:types/:dataLevel/:page', middlewares.moviesCache, moviesControllers.searchByTitle);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel', middlewares.moviesCache, moviesControllers.searchById);

export default router;
