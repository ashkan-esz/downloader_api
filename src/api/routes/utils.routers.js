import {Router} from "express";
import {utilsControllers} from '../../controllers/index.js';

const router = Router();


//utils/getMessage
router.get('/getMessage', utilsControllers.getMessage);

//utils/getApps
router.get('/getApps', utilsControllers.getApps);

//utils/checkAppUpdate/:appName/:os/:version
router.get('/checkAppUpdate/:appName/:os/:version', utilsControllers.checkAppUpdate);


export default router;