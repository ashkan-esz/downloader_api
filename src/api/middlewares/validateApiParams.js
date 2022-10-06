import {body, param, query, validationResult} from 'express-validator';


const types = ['movie', 'serial', 'anime_movie', 'anime_serial'];
const dataLevels = ['dlink', 'low', 'telbot', 'medium', 'info', 'high'];
const sortBases = [
    'animetopcomingsoon', 'animetopairing',
    'animeseasonnow', 'animeseasonupcoming',
    'comingsoon', 'intheaters', 'boxoffice',
    'top', 'popular'];
const statTypes = ['like_movie', 'dislike_movie', 'like_staff', 'dislike_staff', 'like_character', 'dislike_character',
    'follow_movie', 'follow_staff', 'future_list', 'dropped', 'finished', 'save', 'score'];

const settingNames = ['movie', 'notification', 'downloadLinks'];
const movieSettingskeys = ['includeAnime', 'includeHentai'];
const downloadLinksSettingskeys = ['includeDubbed', 'includeHardSub', 'includeCensored', 'preferredQualities'];
const notificationSettingskeys = [
    'followMovie', 'followMovie_betterQuality', 'followMovie_subtitle',
    'futureList', 'futureList_serialSeasonEnd', 'futureList_subtitle', 'finishedList_spinOffSequel'
];
const staffOrCharacters = ['staff', 'characters'];


const validations = Object.freeze({
    id: param('id')
        .trim()
        .isMongoId().withMessage('Invalid parameter id :: MongoId'),

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

    statType: param('statType')
        .trim().toLowerCase()
        .isIn(statTypes).withMessage(`Invalid parameter statType :: (${statTypes.join('|')})`),

    title: param('title')
        .isString().withMessage('Invalid parameter title :: String')
        .trim(),

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
    //----- Staff/Characters filters-----

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

    staffOrCharacters: param('staffOrCharacters')
        .trim().toLowerCase()
        .isIn(staffOrCharacters).withMessage(`Invalid parameter staffOrCharacters :: (${staffOrCharacters.join('|')})`),

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

    followedOnly: query('followedOnly')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter followedOnly :: (true|false)')
        .toBoolean(),

    //-----------------------------
    //-----------------------------

    deviceId: param('deviceId')
        .isString().withMessage('Invalid parameter deviceId :: String(UUID)')
        .trim(),

    settingName: param('settingName')
        .isString().withMessage('Invalid parameter settingName :: String')
        .trim().toLowerCase()
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
            errorMessage: errorsAfterValidation.errors.map(item => item.msg).join(', ')
        });
    }
    return next();
}
