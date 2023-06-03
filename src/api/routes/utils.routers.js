import {Router} from "express";
import mongoSanitize from "express-mongo-sanitize";
import middlewares from "../middlewares/index.js";
import {utilsControllers} from '../../controllers/index.js';

const router = Router();


//utils/getMessage
router.get('/getMessage', utilsControllers.getMessage);


export default router;