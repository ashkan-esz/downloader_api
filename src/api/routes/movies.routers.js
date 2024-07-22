import {Router} from 'express';
import {moviesControllers} from '../../controllers/index.js';
import middlewares from '../middlewares/index.js';

const router = Router();

//movies/:apiName/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/:apiName/:types/:dataLevel/:imdbScores/:malScores/:page',
    (req, res, next) => {
        if (req.params.apiName === 'addUserStats' || req.params.apiName.toLowerCase() === 'seriesofday') {
            return next('route');
        }
        next();
    },
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['apiName', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getMoviesOfApiName);

//movies/newsWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/newsWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['date', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getNewsWithDate);

//movies/updatesWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/updatesWithDate/:date/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['date', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getUpdatesWithDate);

//movies/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/sortedMovies/:sortBase/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['sortBase', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getSortedMovies);

//movies/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page
router.get('/seriesOfDay/:dayNumber/:types/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dayNumber', 'types', 'imdbScores', 'malScores', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getSeriesOfDay);

//movies/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page
router.get('/multiple/status/:types/:dataLevel/:imdbScores/:malScores/:count/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['types', 'dataLevel', 'imdbScores', 'malScores', 'count', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getMultipleStatus);

//movies/searchStaffAndCharacter/:dataLevel/:page
router.get('/searchStaffAndCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchStaffAndCharacter);

//movies/searchStaff/:dataLevel/:page
router.get('/searchStaff/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchStaff);

//movies/searchCharacter/:dataLevel/:page
router.get('/searchCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['dataLevel', 'page', 'name_query', 'gender_query', 'age_query', 'country_query', 'hairColor_query', 'eyeColor_query', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchCharacter);

//movies/searchMovie/:dataLevel/:page
router.get('/searchMovie/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(
        ['dataLevel', 'page',
            'title_query', 'types_query', 'years_query',
            'imdbScores_query', 'malScores_query', 'genres_query', 'country_query', 'movieLang_query',
            'dubbed_query', 'hardSub_query', 'censored_query', 'subtitle_query', 'watchOnlineLink_query',
            'numberOfSeason_query', 'embedStaffAndCharacter', 'noUserStats'
        ]),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchMovie);

//movies/searchById/:id/:dataLevel
router.get('/searchById/:id/:dataLevel',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(
        ['id', 'dataLevel', 'seasons_query', 'episodes_query', 'qualities_query', 'embedDownloadLinksConfig', 'embedRelatedTitles', 'embedCollections', 'embedStaffAndCharacter', 'noUserStats']
    ),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchMovieById);

//movies/:staffOrCharacter/searchById/:id
router.get('/:staffOrCharacter/searchById/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['staffOrCharacter', 'id_int', 'creditsCount', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.searchStaffOrCharacterById);

//--------------------------------------------
//--------------------------------------------

//movies/credits/:id/:page
router.get('/credits/:id/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getMovieCreditsById);

//movies/:staffOrCharacter/credits/:id/:page
router.get('/:staffOrCharacter/credits/:id/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['staffOrCharacter', 'id_int', 'page']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getStaffOrCharacterCreditsById);

//--------------------------------------------
//--------------------------------------------

//movies/addUserStats/likeOrDislike/:statType/:id?remove=(true|false)
router.put('/addUserStats/likeOrDislike/:statType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['statType_likeDislike', 'id', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsLikeDislikeService);

//movies/addUserStats/followStaff/:statType/:id?remove=(true|false)
router.put('/addUserStats/followStaff/:statType/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['statType_followStaff', 'id_int', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsFollowStaffService);

//movies/addUserStats/finish_movie/:id?remove=(true|false)
router.put('/addUserStats/finish_movie/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'remove', 'favorite', 'score_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsFinishMovieService);

//movies/addUserStats/finish_movie/:id/handle_favorite/:favorite
router.put('/addUserStats/finish_movie/:id/handle_favorite/:favorite',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'favorite_param']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsFavoriteMovieService);

//movies/addUserStats/follow_movie/:id?remove=(true|false)
router.put('/addUserStats/follow_movie/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.botHasLoginPermission,
    middlewares.validateApiParams.checkApiParams(['id', 'remove', 'score_query', 'watch_season_query', 'watch_episode_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsFollowMovieService);

//movies/addUserStats/watchlist_movie/:id/:groupName?remove=(true|false)
router.put('/addUserStats/watchlist_movie/:id/:groupName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'groupName', 'remove', 'score_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsWatchListMovieService);

//movies/addUserStats/watchlist_movie/groups
router.get('/addUserStats/watchlist_movie/groups',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['embedSampleMovies']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsWatchListMovieGroups);

//movies/addUserStats/watchlist_movie/addGroup/:groupName?remove=(true|false)
router.put('/addUserStats/watchlist_movie/addGroup/:groupName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['groupName', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsWatchListMovieAddGroup);

//movies/addUserStats/collection_movie/addCollection/:collectionName/:isPublic/:description?remove=(true|false)
router.put('/addUserStats/collection_movie/addCollection/:collectionName/:isPublic/:description',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['collectionName', 'isPublic', 'description', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsAddCollection);

//movies/addUserStats/collection_movie/updateCollection/:collectionName
router.put('/addUserStats/collection_movie/updateCollection/:collectionName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['collectionName', 'collectionName_body', 'isPublic_body', 'description_body']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsUpdateCollection);

//movies/addUserStats/collection_movie/addMovie/:collectionName/:id?remove=(true|false)
router.put('/addUserStats/collection_movie/addMovie/:collectionName/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['collectionName', 'id', 'remove']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsAddMovieToCollection);

//movies/addUserStats/collection_movie/collections
router.get('/addUserStats/collection_movie/collections',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['embedSampleMovies']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsMovieCollections);

//movies/addUserStats/collection_movie/movies/:collectionName/:dataLevel/:page
router.get('/addUserStats/collection_movie/movies/:collectionName/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['collectionName', 'dataLevel', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsCollectionMovies);

//movies/addUserStats/collection_movie/search/:collectionName/:page
router.get('/addUserStats/collection_movie/search/:collectionName/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['collectionName', 'page', 'embedSampleMovies']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsSearchCollections);


//movies/addUserStats/changeScore/:stat_list_type/:score/:id
router.put('/addUserStats/changeScore/:stat_list_type/:score/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'score', 'stat_list_type']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsHandleScore);

//movies/addUserStats/changeWatchState/:stat_list_type/:watch_season/:watch_episode/:id
router.put('/addUserStats/changeWatchState/:stat_list_type/:watch_season/:watch_episode/:id',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['id', 'watch_season', 'watch_episode', 'stat_list_type2']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.userStatsHandleWatchState);

//movies/userStatsList/:statType/:dataLevel/:page
router.get('/userStatsList/:statType/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.auth.botHasLoginPermission,
    middlewares.validateApiParams.checkApiParams(['statType', 'dataLevel', 'page', 'sortBy', 'favoritesOnly', 'dropsOnly', 'groupName_query', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getUserStatsList);

//--------------------------------------------
//--------------------------------------------

//movies/status/genres
router.get('/status/genres', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getGenresStatus);

//movies/status/movieSources
router.get('/status/movieSources', middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized, moviesControllers.getMovieSources);

//movies/genres/:genres/:types/:dataLevel/:imdbScores/:malScores/:page
router.get('/genres/:genres/:types/:dataLevel/:imdbScores/:malScores/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['genres', 'types', 'dataLevel', 'imdbScores', 'malScores', 'page', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getGenresMovies);

//movies/animeEnglishName?japaneseNames
router.get('/animeEnglishName',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['japaneseNames_query']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getAnimeEnglishNames);

//movies/birthday/:staffOrCharacter/:dataLevel/:page
router.get('/birthday/:staffOrCharacter/:dataLevel/:page',
    middlewares.auth.attachAuthFlag, middlewares.auth.blockUnAuthorized,
    middlewares.validateApiParams.checkApiParams(['staffOrCharacter', 'followedOnly', 'dataLevel', 'page', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getTodayBirthday);

//movies/bots/:botId/:moviesRequestName/:types/:dataLevel/:imdbScores/:malScores
router.get('/bots/:botId/:moviesRequestName/:types/:dataLevel/:imdbScores/:malScores',
    middlewares.rateLimit.rateLimit_5,
    middlewares.validateApiParams.checkApiParams(['moviesRequestName', 'types', 'dataLevel', 'imdbScores', 'malScores', 'dontUpdateServerDate', 'embedStaffAndCharacter', 'noUserStats']),
    middlewares.validateApiParams.apiParams_sendError,
    moviesControllers.getMoviesDataForBot);

export default router;
