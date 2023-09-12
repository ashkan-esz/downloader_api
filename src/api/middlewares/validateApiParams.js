import {body, param, query, validationResult} from 'express-validator';
import {statTypes} from "../../data/db/userStatsDbMethods.js";


const types = ['movie', 'serial', 'anime_movie', 'anime_serial'];
const dataLevels = ['dlink', 'low', 'telbot', 'medium', 'info', 'high'];
const sortBases = [
    'animetopcomingsoon', 'animetopairing', 'animeseasonnow',
    'animeseasonupcoming', 'comingsoon', 'intheaters',
    'boxoffice', 'top', 'popular', 'like',];

const settingNames = ['movie', 'notification', 'downloadLinks'];
const movieSettingskeys = ['includeAnime', 'includeHentai'];
const downloadLinksSettingskeys = ['includeDubbed', 'includeHardSub', 'includeCensored', 'preferredQualities'];
const notificationSettingskeys = [
    'followMovie', 'followMovie_betterQuality', 'followMovie_subtitle',
    'futureList', 'futureList_serialSeasonEnd', 'futureList_subtitle', 'finishedList_spinOffSequel'
];
const staffOrCharacter = ['staff', 'character'];
const moviesRequestNames = ['news', 'updates', 'newsandupdates'];
const apiName = ['news', 'updates', 'trailers'];
const sortBy = ['date', 'score'];

const validations = Object.freeze({
    id: param('id')
        .trim()
        .isString().withMessage('Invalid parameter id :: String'),

    id_int: param('id')
        .trim()
        .isInt().withMessage('Invalid parameter id_int :: Integer')
        .toInt(),

    types: param('types')
        .customSanitizer(value => {
            return value.split('-').map(item => item.toLowerCase().trim())
        })
        .custom((value) => {
            if (value.find(item => !types.includes(item))) {
                throw new Error(`Invalid parameter types :: (${types.join('|')})`);
            } else {
                return value;
            }
        }),

    dataLevel: param('dataLevel')
        .trim().toLowerCase()
        .isIn(dataLevels).withMessage(`Invalid parameter dataLevel :: (${dataLevels.join('|')})`),

    imdbScores: param('imdbScores')
        .isString().withMessage('Invalid parameter imdbScores :: ([0-10]-[0-10])')
        .customSanitizer(value => {
            return value.split('-')
                .filter(item => item && !isNaN(item))
                .map(item => Number(item));
        })
        .custom((value) => {
            if (value.length !== 2 || value[0] > value[1] || value[0] < 0 || value[0] > 10 || value[1] < 0 || value[1] > 10) {
                throw new Error('Invalid parameter imdbScores :: ([0-10]-[0-10])');
            } else {
                return value;
            }
        }),

    malScores: param('malScores')
        .isString().withMessage('Invalid parameter malScores :: ([0-10]-[0-10])')
        .customSanitizer(value => {
            return value.split('-')
                .filter(item => item && !isNaN(item))
                .map(item => Number(item));
        })
        .custom((value) => {
            if (value.length !== 2 || value[0] > value[1] || value[0] < 0 || value[0] > 10 || value[1] < 0 || value[1] > 10) {
                throw new Error('Invalid parameter malScores :: ([0-10]-[0-10])');
            } else {
                return value;
            }
        }),

    years: param('years')
        .customSanitizer(value => {
            return value.split('-')
                .filter(item => item && !isNaN(item))
                .map(item => item.trim());
        })
        .custom((value) => {
            if (value.length !== 2 || value[0] > value[1]) {
                throw new Error('Invalid parameter years :: ([dddd]-[dddd])');
            } else {
                return value;
            }
        }),

    date: param('date')
        .custom((value) => {
            try {
                let temp = new Date(value);
                if (temp === 'Invalid Date') {
                    throw new Error('Invalid parameter date :: (Date String | Time in milliseconds)');
                } else {
                    return value;
                }
            } catch (error) {
                throw new Error('Invalid parameter date :: (Date String | Time in milliseconds)');
            }
        })
        .customSanitizer(value => {
            return new Date(value);
        }),

    //-----------------------------
    //-----------------------------

    page: param('page')
        .trim().blacklist('0').isInt().withMessage('Invalid parameter page :: Number 1 to Infinite')
        .toInt(),

    count: param('count')
        .trim().blacklist('0').isInt().withMessage('Invalid parameter count :: Number 1 to Infinite')
        .toInt(),

    dayNumber: param('dayNumber')
        .trim().isInt().withMessage('Invalid parameter dayNumber :: Number 0 to 6')
        .toInt(),

    //-----------------------------
    //-----------------------------

    sortBase: param('sortBase')
        .trim().toLowerCase()
        .isIn(sortBases).withMessage(`Invalid parameter sortBase :: (${sortBases.join('|')})`),

    statType_likeDislike: param('statType')
        .trim().toLowerCase()
        .isIn(statTypes.likeDislike).withMessage(`Invalid parameter statType :: (${statTypes.likeDislike.join('|')})`),

    statType_followStaff: param('statType')
        .trim().toLowerCase()
        .isIn(statTypes.followStaff).withMessage(`Invalid parameter statType :: (${statTypes.followStaff.join('|')})`),

    statType: param('statType')
        .trim().toLowerCase()
        .isIn(statTypes.all).withMessage(`Invalid parameter statType :: (${statTypes.all.join('|')})`),

    stat_list_type: param('stat_list_type')
        .trim().toLowerCase()
        .isIn(statTypes.withScore).withMessage(`Invalid parameter stat_list_type :: (${statTypes.withScore.join('|')})`),

    stat_list_type2: param('stat_list_type')
        .trim().toLowerCase()
        .isIn(['finish_movie', 'follow_movie']).withMessage(`Invalid parameter stat_list_type :: (${['finish_movie', 'follow_movie'].join('|')})`),

    title: param('title')
        .isString().withMessage('Invalid parameter title :: String')
        .trim(),

    moviesRequestName: param('moviesRequestName')
        .trim().toLowerCase()
        .isIn(moviesRequestNames).withMessage(`Invalid parameter moviesRequestName :: (${moviesRequestNames.join('|')})`),

    //-----------------------------
    //-----------------------------

    genres: param('genres')
        .isString().withMessage('Invalid parameter genres :: String')
        .customSanitizer(value => {
            return value.split('-').map(item => item.replace(/_/g, '-').toLowerCase().trim());
        }),

    //-----------------------------------
    //-----------------------------------
    //---------- Movies filters ---------

    title_query: query('title')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    types_query: query('types')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-').map(item => item.toLowerCase().trim())
                : [];
        })
        .custom((value) => {
            if (value.find(item => !types.includes(item))) {
                throw new Error(`Invalid parameter types :: (${types.join('|')})`);
            } else {
                return value;
            }
        }),

    years_query: query('years')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => item.trim())
                : [];
        })
        .custom((value) => {
            if (value.length === 1 || (value.length === 2 && value[0] > value[1])) {
                throw new Error('Invalid parameter years :: ([dddd]-[dddd])');
            } else {
                return value;
            }
        }),

    imdbScores_query: query('imdbScores')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => Number(item))
                : [];
        })
        .custom((value) => {
            if (value.length === 1 || (value.length === 2 && value[0] > value[1] || value[0] < 0 || value[0] > 10 || value[1] < 0 || value[1] > 10)) {
                throw new Error('Invalid parameter imdbScores :: ([0-10]-[0-10])');
            } else {
                return value;
            }
        }),

    malScores_query: query('malScores')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => Number(item))
                : [];
        })
        .custom((value) => {
            if (value.length === 1 || (value.length === 2 && value[0] > value[1] || value[0] < 0 || value[0] > 10 || value[1] < 0 || value[1] > 10)) {
                throw new Error('Invalid parameter malScores :: ([0-10]-[0-10])');
            } else {
                return value;
            }
        }),

    score: param('score')
        .isFloat({min: 0, max: 10}).withMessage('Invalid parameter score :: [0-10]')
        .toFloat(),

    score_query: query('score')
        .customSanitizer(value => {
            return value ? Number(value) : 0;
        })
        .isFloat({min: 0, max: 10}).withMessage('Invalid parameter score :: [0-10]')
        .toFloat(),

    watch_season: param('watch_season')
        .isInt({min: 0}).withMessage('Invalid parameter watch_season :: Integer >= 0')
        .toInt(),

    watch_episode: param('watch_episode')
        .isInt({min: 0}).withMessage('Invalid parameter watch_episode :: Integer >= 0')
        .toInt(),

    watch_season_query: query('watch_season')
        .customSanitizer(value => {
            return value ? Number(value) : 0;
        })
        .isInt({min: 0}).withMessage('Invalid parameter watch_season :: Integer >= 0'),

    watch_episode_query: query('watch_episode')
        .customSanitizer(value => {
            return value ? Number(value) : 0;
        })
        .isInt({min: 0}).withMessage('Invalid parameter watch_episode :: Integer >= 0'),

    genres_query: query('genres')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-').map(item => item.replace(/_/g, '-').toLowerCase().trim())
                : [];
        }),

    dubbed_query: query('dubbed')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    hardSub_query: query('hardSub')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),
    censored_query: query('censored')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),
    subtitle_query: query('subtitle')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),
    watchOnlineLink_query: query('watchOnlineLink')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    movieLang_query: query('movieLang')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    seasons_query: query('seasons')
        .customSanitizer(value => {
            let temp = value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => Number(item))
                : [];
            if (temp.length === 1) {
                temp.push(temp[0]);
            }
            return temp;
        })
        .custom((value) => {
            if (value.length === 2 && value[0] > value[1]) {
                throw new Error('Invalid parameter seasons :: (\d+ | \d+-\d+)');
            } else {
                return value;
            }
        }),

    episodes_query: query('episodes')
        .customSanitizer(value => {
            let temp = value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => Number(item))
                : [];
            if (temp.length === 1) {
                temp.push(temp[0]);
            }
            return temp;
        })
        .custom((value) => {
            if (value.length === 2 && value[0] > value[1]) {
                throw new Error('Invalid parameter episodes :: (\d+ | \d+-\d+)');
            } else {
                return value;
            }
        }),

    embedDownloadLinksConfig: query('embedDownloadLinksConfig')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter embedDownloadLinksConfig :: (true|false)')
        .toBoolean(),

    favoritesOnly: query('favoritesOnly')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter favoritesOnly :: (true|false)')
        .toBoolean(),

    dropsOnly: query('dropsOnly')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter dropsOnly :: (true|false)')
        .toBoolean(),

    sortBy: query('sortBy')
        .trim()
        .customSanitizer(value => {
            return value || 'date'
        })
        .isIn(sortBy).withMessage(`Invalid parameter sortBy :: (${sortBy.join('|')})`),

    numberOfSeason_query: query('numberOfSeason')
        .customSanitizer(value => {
            let temp = value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => Number(item))
                : [];
            if (temp.length === 1) {
                temp.push(temp[0]);
            }
            return temp;
        })
        .custom((value) => {
            if (value.length === 2 && value[0] > value[1]) {
                throw new Error('Invalid parameter numberOfSeason :: (\d+ | \d+-\d+)');
            } else {
                return value;
            }
        }),

    qualities_query: query('qualities')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-')
                    .filter(item => item && item.match(/\d+p/))
                : [];
        }),

    //-----------------------------------
    //-----------------------------------
    //----- Staff/Character filters------

    name_query: query('name')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    gender_query: query('gender')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    country_query: query('country')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    hairColor_query: query('hairColor')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    eyeColor_query: query('eyeColor')
        .customSanitizer(value => {
            return value
                ? value.toString().toLowerCase().trim()
                : '';
        }),

    age_query: query('age')
        .customSanitizer(value => {
            return value
                ? value.toString().split('-')
                    .filter(item => item && !isNaN(item))
                    .map(item => Number(item.trim()))
                : [];
        })
        .custom((value) => {
            if (value.length === 1 || (value.length === 2 && value[0] > value[1])) {
                throw new Error('Invalid parameter age :: \d+-\d+');
            } else {
                return value;
            }
        }),

    staffOrCharacter: param('staffOrCharacter')
        .trim().toLowerCase()
        .isIn(staffOrCharacter).withMessage(`Invalid parameter staffOrCharacter :: (${staffOrCharacter.join('|')})`),

    apiName: param('apiName')
        .trim().toLowerCase()
        .isIn(apiName).withMessage(`Invalid parameter apiName :: (${apiName.join('|')})`),

    //-----------------------------------
    //-----------------------------------

    japaneseNames_query: query('japaneseNames')
        .customSanitizer(value => {
            if (!value) {
                return [];
            }
            if (typeof value === 'string') {
                return [value.trim()];
            } else if (Array.isArray(value)) {
                return value.map(item => item.toString().trim());
            }
            return [];
        })
        .isArray({
            min: 1,
            max: 20
        }).withMessage('Invalid parameter japaneseNames :: (array of string, {min:1, max:20})'),

    remove: query('remove')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter remove :: (true|false)')
        .toBoolean(),

    favorite: query('favorite')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter favorite :: (true|false)')
        .toBoolean(),

    favorite_param: param('favorite')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter favorite :: (true|false)')
        .toBoolean(),

    followedOnly: query('followedOnly')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter followedOnly :: (true|false)')
        .toBoolean(),

    dontUpdateServerDate: query('dontUpdateServerDate')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter dontUpdateServerDate :: (true|false)')
        .toBoolean(),

    embedStaffAndCharacter: query('embedStaffAndCharacter')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter embedStaffAndCharacter :: (true|false)')
        .toBoolean(),

    embedRelatedTitles: query('embedRelatedTitles')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter embedRelatedTitles :: (true|false)')
        .toBoolean(),

    noUserStats: query('noUserStats')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter noUserStats :: (true|false)')
        .toBoolean(),

    creditsCount: query('creditsCount')
        .trim()
        .customSanitizer(value => {
            return value || 0
        })
        .isInt({min: 0, max: 48}).withMessage('Invalid parameter creditsCount :: Integer(min: 0, max:48)')
        .toInt(),

    //-----------------------------
    //-----------------------------

    deviceId: param('deviceId')
        .isString().withMessage('Invalid parameter deviceId :: String | UUID')
        .trim(),

    settingName: param('settingName')
        .isString().withMessage('Invalid parameter settingName :: String')
        .trim()
        .isIn(settingNames).withMessage(`Invalid parameter settingName :: (${settingNames.join('|')})`),

    setting_body: body('settings')
        .exists().withMessage('Settings cannot be empty')
        .custom((value, {req, loc, path}) => {
            if (!value || Array.isArray(value) || typeof value !== 'object') {
                throw new Error('Invalid parameter settings :: Object');
            }

            let keys = Object.keys(value);
            if (req.params.settingName === 'downloadLinks') {
                for (let i = 0; i < downloadLinksSettingskeys.length; i++) {
                    if (value[downloadLinksSettingskeys[i]] === undefined) {
                        throw new Error(`Missed parameter settings.${downloadLinksSettingskeys[i]}`);
                    }
                }
                for (let i = 0; i < keys.length; i++) {
                    if (!downloadLinksSettingskeys.includes(keys[i])) {
                        throw new Error(`Wrong parameter settings.${keys[i]}`);
                    }
                    if (keys[i] === 'preferredQualities') {
                        if (!Array.isArray(value[keys[i]])) {
                            throw new Error(`Invalid parameter settings.${keys[i]} :: Array(\d+p)`);
                        }
                        let temp = value[keys[i]];
                        let qualities = ['480p', '720p', '1080p', '2160p'];
                        for (let j = 0; j < temp.length; j++) {
                            if (!qualities.includes(temp[j])) {
                                throw new Error(`Invalid parameter settings.${keys[i]} :: Array((480|720|1080|2160)p)`);
                            }
                        }
                    } else if (typeof value[keys[i]] !== 'boolean') {
                        throw new Error(`Invalid parameter settings.${keys[i]} :: Boolean`);
                    }
                }
            } else if (req.params.settingName === 'movie' || req.params.settingName === 'notification') {
                let checkKeys = req.params.settingName === 'movie'
                    ? movieSettingskeys
                    : notificationSettingskeys;
                for (let i = 0; i < checkKeys.length; i++) {
                    if (value[checkKeys[i]] === undefined) {
                        throw new Error(`Missed parameter settings.${checkKeys[i]}`);
                    }
                }
                for (let i = 0; i < keys.length; i++) {
                    if (!checkKeys.includes(keys[i])) {
                        throw new Error(`Wrong parameter settings.${keys[i]}`);
                    }
                    if (typeof value[keys[i]] !== 'boolean') {
                        throw new Error(`Invalid parameter settings.${keys[i]} :: Boolean`);
                    }
                }
            }
            return value;
        }),

    username_body: body('username')
        .exists().withMessage("Username cannot be empty")
        .isString().withMessage("Username must be string")
        .isLength({min: 6}).withMessage("Username length must be more than 6")
        .isLength({max: 50}).withMessage("Username length must be less than 50")
        .custom((value, {req, loc, path}) => {
            if (!value.toString().match(/^[a-z|\d_-]+$/gi)) {
                // trow error if password is equal with username
                throw new Error("Only a-z, 0-9, and underscores are allowed for username");
            } else {
                return value;
            }
        })
        .trim().escape(),

    publicName_body: body('publicName')
        .exists().withMessage("PublicName cannot be empty")
        .isString().withMessage("PublicName must be string")
        .isLength({min: 6}).withMessage("PublicName length must be more than 6")
        .isLength({max: 50}).withMessage("PublicName length must be less than 50")
        .trim().escape(),

    bio_body: body('bio')
        .isString().withMessage("Bio must be string")
        .isLength({max: 100}).withMessage("Bio length must be less than 100")
        .trim().escape(),

    email_body: body('email')
        .exists().withMessage("Email cannot be empty")
        .isString().withMessage("Email must be string")
        .isEmail().withMessage("Email is in wrong format")
        .trim().escape().normalizeEmail({gmail_remove_dots: false}),

    oldPassword_body: body('oldPassword')
        .exists().withMessage("OldPassword cannot be empty")
        .isString().withMessage("OldPassword must be String")
        .trim().escape(),

    newPassword_body: body('newPassword')
        .exists().withMessage("newPassword cannot be empty")
        .isString().withMessage("newPassword must be String")
        .isLength({min: 8}).withMessage("newPassword length must be more than 8")
        .isLength({max: 50}).withMessage("newPassword length must be less than 50")
        .matches('[0-9]').withMessage("newPassword must contain a number")
        .matches('[A-Z]').withMessage("newPassword must contain an uppercase")
        .custom((value, {req, loc, path}) => {
            if (value === req.body.oldPassword) {
                // trow error if password is equal with username
                throw new Error("newPassword cannot be equal with oldPassword");
            } else if (value.includes(' ')) {
                throw new Error("newPassword cannot have space");
            } else {
                return value;
            }
        })
        .trim().escape(),

});


export function checkApiParams(apiParams) {
    let validationArray = [];
    for (let i = 0; i < apiParams.length; i++) {
        let val = validations[apiParams[i]];
        if (val) {
            validationArray.push(val);
        }
    }
    return validationArray;
}

export function apiParams_sendError(req, res, next) {
    const errorsAfterValidation = validationResult(req);
    if (!errorsAfterValidation.isEmpty()) {
        return res.status(400).json({
            data: null,
            code: 400,
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(', '),
            isGuest: false,
            isCacheData: false,
        });
    }
    return next();
}
