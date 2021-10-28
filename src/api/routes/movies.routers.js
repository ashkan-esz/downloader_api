const router = require('express').Router();
import {moviesControllers} from '../../controllers';


//movies/news/:types/:dataLevel/:page
router.get('/news/:types/:dataLevel/:page', moviesControllers.getNews);

//movies/updates/:types/:dataLevel/:page
router.get('/updates/:types/:dataLevel/:page', moviesControllers.getUpdates);

//movies/tops/byLikes/:types/:dataLevel/:page
router.get('/tops/byLikes/:types/:dataLevel/:page', moviesControllers.getTopsByLikes);

//movies/trailers/:types/:dataLevel/:page
router.get('/trailers/:types/:dataLevel/:page', moviesControllers.getTrailers);

//movies/seriesOfDay/:dayNumber/:types/:page
router.get('/seriesOfDay/:dayNumber/:types/:page', moviesControllers.getSeriesOfDay);

//movies/searchByTitle/:title/:types/:dataLevel/:page
router.get('/searchByTitle/:title/:types/:dataLevel/:page', moviesControllers.searchByTitle);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel', moviesControllers.searchById);

export default router;
