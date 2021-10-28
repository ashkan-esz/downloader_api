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

//movies/timeline/day/:spacing/:types/:page
router.get('/timeline/day/:spacing/:types/:page', moviesControllers.getTimelineDay);

//movies/timeline/week/:spacing/:types/:page
router.get('/timeline/week/:weekCounter/:types', moviesControllers.getTimelineWeek);

//movies/searchByTitle/:title/:types/:dataLevel/:page
router.get('/searchByTitle/:title/:types/:dataLevel/:page', moviesControllers.searchByTitle);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel', moviesControllers.searchById);

export default router;
