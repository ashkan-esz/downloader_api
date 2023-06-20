import {Router} from "express";
import middlewares from "../middlewares/index.js";
import {utilsControllers} from '../../controllers/index.js';

const router = Router();


//utils/getMessage
router.get('/getMessage', middlewares.moviesCache, utilsControllers.getMessage);

//utils/getApps
router.get('/getApps', middlewares.moviesCache, utilsControllers.getApps);

//utils/checkAppUpdate/:appName/:os/:version
router.get('/checkAppUpdate/:appName/:os/:version', middlewares.moviesCache, utilsControllers.checkAppUpdate);


export default router;