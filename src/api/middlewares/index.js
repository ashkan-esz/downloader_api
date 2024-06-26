import * as auth from './isAuth.js';
import * as validation from './validation.js';
import * as rateLimit from './rateLimit.js';
import uploadUserProfile from './uploadUserProfile.js';
import uploadAppFile from './uploadAppFile.js';
import * as userPermission from './userPermission.js';
import * as validateApiParams from './validateApiParams.js';
import * as validateApiParamsAdmin from './validateApiParamsAdmin.js';


export default {
    validation,
    auth,
    rateLimit,
    uploadUserProfile,
    uploadAppFile,
    userPermission,
    validateApiParams,
    validateApiParamsAdmin,
}
