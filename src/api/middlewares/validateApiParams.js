import {param, query, validationResult} from 'express-validator';


const types = ['movie', 'serial', 'anime_movie', 'anime_serial'];
const dataLevels = ['dlink', 'low', 'medium', 'high'];
const sortBases = ['animetopcomingsoon', 'animetopairing', 'comingsoon', 'intheaters', 'boxoffice', 'top', 'popular'];
const statTypes = ['like_movie', 'dislike_movie', 'like_staff', 'dislike_staff', 'like_character', 'dislike_character',
    'follow_movie', 'follow_staff', 'future_list', 'dropped', 'finished', 'save', 'score'];


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
            return value.split('-').map(item => Number(item));
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
            return value.split('-').map(item => Number(item));
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
            return value.split('-').map(item => item.trim());
        })
        .custom((value) => {
            if (value.length !== 2 || value[0] > value[1]) {
                throw new Error('Invalid parameter years :: ([dddd]-[dddd])');
            } else {
                return value;
            }
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

    //-----------------------------
    //-----------------------------

    genres_query: query('genres')
        .customSanitizer(value => {
            return value
                ? value.split('-').map(item => item.replace(/_/g, '-').toLowerCase().trim())
                : [];
        }),

    remove: query('remove')
        .trim()
        .customSanitizer(value => {
            return value || false
        })
        .isBoolean().withMessage('Invalid parameter remove :: (true|false)'),

    //-----------------------------
    //-----------------------------

    deviceId: param('deviceId')
        .isString().withMessage('Invalid parameter deviceId :: String(UUID)')
        .trim(),
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
