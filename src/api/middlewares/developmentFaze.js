import {getConfigDB_DevelopmentFaze} from "../../data/db/admin/adminConfigDbMethods.js";


let developmentFaze = await getConfigDB_DevelopmentFaze();
setInterval(async () => {
    developmentFaze = await getConfigDB_DevelopmentFaze();
}, 30 * 60 * 1000); //30 min

export function updateDevelopmentFazeMiddleWareData(flag) {
    developmentFaze = flag;
}

export default function developmentFazeMiddleWare(req, res, next) {
    if (!developmentFaze || req.url.startsWith('/admin')) {
        return next();
    }
    return res.status(503).json({
        errorMessage: 'Server Is In Maintenance Mode, Wait...',
        code: 503,
        isGuest: false,
        isCacheData: false,
    });
}