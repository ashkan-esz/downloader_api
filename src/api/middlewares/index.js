import moviesCache from './moviesCache.js';
import * as auth from './isAuth.js';
import * as validation from './validation.js';
import attachCurrentUser from './attachCurrentUser.js';
import * as rateLimit from './rateLimit.js';
import uploadUserProfile from './uploadUserProfile.js';
import * as userPermission from './userPermission.js';
import * as validateApiParams from './validateApiParams.js';


export default {
    moviesCache,
    validation,
    auth,
    attachCurrentUser,
    rateLimit,
    uploadUserProfile,
    userPermission,
    validateApiParams,
}
