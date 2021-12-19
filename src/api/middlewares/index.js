import moviesCache from './moviesCache';
import * as auth from './isAuth';
import * as validation from './validation';
import attachCurrentUser from './attachCurrentUser';
import rateLimit from './rateLimit.js';

export default {
    moviesCache,
    validation,
    auth,
    attachCurrentUser,
    rateLimit,
}
