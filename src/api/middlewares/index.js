import moviesCache from './moviesCache';
import * as auth from './isAuth';
import * as validation from './validation';
import attachCurrentUser from './attachCurrentUser';

export default {
    moviesCache,
    validation,
    auth,
    attachCurrentUser,
}
